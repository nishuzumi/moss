import {
  type ActionCtx,
  type AddressValue,
  BasisPoints,
  Capability,
  type CapabilityResult,
  type Change,
  createHandle,
  type Handle,
  type Hex,
  type InferParams,
  type MossRuntime,
  NATIVE,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  type TokenRef,
  TokenReference,
  UnsignedIntegerString,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { decodeEventLog, formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { KuruOrderbookAbi, KuruRouterAbi } from "./abis/kuru.js";
import type {
  KuruLimitOrderOutcome,
  KuruOrderFill,
  KuruQuote,
  KuruSwapOutcome,
  MarketCandidate,
  PreparedSwap,
  Route,
  RouteLeg,
  VerifiedMarket,
} from "./types.js";

// Official Monad mainnet Router:
// https://docs.kuru.io/contracts/Contract-addresses (retrieved 2026-07-15).
// The live Kuru test verifies deployed bytecode.
export const KURU_ROUTER_ADDRESS = "0xd651346d7c789536ebf06dc72aE3C8502cd695CC" as const;
const KURU_API_URL = "https://api.kuru.io";
const KURU_NATIVE = "0x0000000000000000000000000000000000000000" as const;
const DEFAULT_SLIPPAGE_BPS = 50;
const UINT32_MAX = (1n << 32n) - 1n;

const OptionalHumanTokenAmount = PositiveDecimalString.optional().describe(
  'An optional positive base-10 decimal amount in a token\'s display units, such as "1" or "1.5".',
);
const HumanTokenAmount = PositiveDecimalString.describe(
  'A positive base-10 decimal amount in a token\'s display units, such as "1" or "1.5".',
);
const HumanPrice = PositiveDecimalString.describe(
  'A positive base-10 decimal price in quote-per-base units, such as "0.022" for 0.022 USDC per MON.',
);
const KuruSlippage = BasisPoints.min(50)
  .max(5_000)
  .describe("An integer basis-point count from 50 through 5000; 1 bps equals 0.01%.");

const swapParams = {
  tokenIn: { type: TokenReference, description: "Asset offered to the swap." },
  tokenOut: { type: TokenReference, description: "Asset requested from the swap." },
  amountIn: {
    type: OptionalHumanTokenAmount,
    description: "Fixed input quantity; omit when amountOut is supplied.",
  },
  amountOut: {
    type: OptionalHumanTokenAmount,
    description: "Minimum output quantity; omit when amountIn is supplied.",
  },
  slippage: {
    type: KuruSlippage.default(DEFAULT_SLIPPAGE_BPS),
    description: "Maximum adverse movement allowed between quoting and execution.",
  },
} satisfies ParamsSpec;

const marketPairParams = {
  tokenIn: { type: TokenReference, description: "Asset offered to the market." },
  tokenOut: { type: TokenReference, description: "Asset requested from the market." },
} satisfies ParamsSpec;

const limitOrderParams = {
  ...marketPairParams,
  amount: { type: HumanTokenAmount, description: "Quantity of tokenIn committed to the order." },
  price: { type: HumanPrice, description: "Limit price the order rests at." },
} satisfies ParamsSpec;

const orderStatusParams = {
  ...marketPairParams,
  orderId: { type: UnsignedIntegerString, description: "Kuru order id to look up." },
} satisfies ParamsSpec;

type InferredSwapParams = InferParams<typeof swapParams>;
type SwapParams = Omit<InferredSwapParams, "amountIn" | "amountOut" | "slippage"> &
  Partial<Pick<InferredSwapParams, "amountIn" | "amountOut" | "slippage">>;
type KuruSwapParams = Pick<SwapParams, "tokenIn" | "tokenOut"> & {
  slippage?: InferredSwapParams["slippage"];
} & ({ amountIn: string; amountOut?: never } | { amountIn?: never; amountOut: string });

@Protocol({
  name: "kuru",
  category: "dex",
  description: "Kuru on-chain orderbook swaps over dynamically discovered verified markets.",
  contracts: { router: { abi: KuruRouterAbi, addr: KURU_ROUTER_ADDRESS } },
  protocols: { erc20: ERC20 },
})
export class Kuru {
  declare runtime: MossRuntime;
  declare router: Handle<typeof KuruRouterAbi>;
  declare erc20: ProtocolRef<ERC20>;

  quote(params: KuruSwapParams, ctx: ActionCtx): Promise<KuruQuote>;
  @Query({ intent: "Quote the best Kuru swap path", params: swapParams, tags: ["clob", "quote"] })
  async quote(params: SwapParams, ctx: ActionCtx): Promise<KuruQuote> {
    const prepared = await this.#prepareSwap(params, ctx.account);
    const path = routeTokens(prepared.route);
    if (prepared.side === "amountIn") {
      return {
        amountSide: "amountIn" as const,
        amountIn: formatUnits(prepared.estimatedAmountIn, prepared.inputDecimals),
        estimatedAmountOut: formatUnits(prepared.estimatedAmountOut, prepared.outputDecimals),
        minimumAmountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
        path,
      };
    }
    return {
      amountSide: "amountOut" as const,
      estimatedAmountIn: formatUnits(prepared.estimatedAmountIn, prepared.inputDecimals),
      maximumAmountIn: formatUnits(prepared.executionAmountIn, prepared.inputDecimals),
      minimumAmountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
      path,
    };
  }

  @Query({
    intent: "Read the best bid and ask prices on a Kuru market",
    params: marketPairParams,
    tags: ["clob", "orderbook"],
  })
  async bestBidAsk(params: InferParams<typeof marketPairParams>, ctx: ActionCtx) {
    const { market } = await this.#directMarket(params.tokenIn, params.tokenOut, ctx.account);
    const [bid, ask] = await market.handle.read.bestBidAsk();
    // bestBidAsk prices carry the combined pricePrecision * sizePrecision scaling.
    const scaleDigits =
      String(market.params.pricePrecision * market.params.sizePrecision).length - 1;
    return {
      market: market.address,
      bestBid: bid === 0n ? null : formatUnits(bid, scaleDigits),
      bestAsk: ask === 0n ? null : formatUnits(ask, scaleDigits),
      note: "Prices in quote-per-base units. null means no orders on that side.",
    };
  }

  @Query({
    intent: "Look up a Kuru limit order by id",
    params: orderStatusParams,
    tags: ["clob", "orderbook"],
  })
  async orderStatus(params: InferParams<typeof orderStatusParams>, ctx: ActionCtx) {
    const { market } = await this.#directMarket(params.tokenIn, params.tokenOut, ctx.account);
    const [owner, size, , , , price, , isBuy] = await market.handle.read.s_orders([
      Number(params.orderId),
    ]);
    // Kuru deletes filled and cancelled orders, so a zeroed owner means "gone".
    const exists = !sameAddress(owner, KURU_NATIVE);
    return {
      market: market.address,
      orderId: params.orderId,
      owner: exists ? owner : null,
      size: exists ? size.toString() : null,
      price: exists ? String(price) : null,
      isBuy: exists ? isBuy : null,
      status: exists ? "open" : "filled_or_cancelled",
    };
  }

  swap(params: KuruSwapParams, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Kuru, typeof swapParams>({
    intent: "Swap tokens through the best current Kuru market path",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["clob", "orderbook"],
  })
  async swap(params: SwapParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const prepared = await this.#prepareSwap(params, ctx.account);
    const children = [];
    if (params.tokenIn !== NATIVE) {
      children.push(
        await this.erc20.approve({
          token: params.tokenIn,
          spender: this.router.address,
          amount: prepared.executionAmountIn.toString(),
        }),
      );
    }
    children.push(
      this.router.anyToAnySwap(
        [
          prepared.route.map(({ market }) => market.address),
          prepared.route.map(({ isBuy }) => isBuy),
          prepared.route.map(({ nativeSend }) => nativeSend),
          toKuru(params.tokenIn),
          toKuru(params.tokenOut),
          prepared.executionAmountIn,
          prepared.minimumAmountOut,
        ],
        { value: params.tokenIn === NATIVE ? prepared.executionAmountIn : 0n },
      ),
    );
    return children;
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<KuruSwapOutcome> {
    let routerSwap: KuruSwapOutcome | undefined;
    let tradeEvents = 0;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") return this.erc20.changesReceipt([change]);
      if (sameAddress(change.address, KURU_ROUTER_ADDRESS)) {
        const event = decodeKuruEvent(KuruRouterAbi, change);
        if (event.eventName !== "KuruRouterSwap") {
          throw new Error(`Unexpected Change: Kuru router emitted ${event.eventName}`);
        }
        if (routerSwap) throw new Error("Kuru swap emitted multiple KuruRouterSwap events");
        routerSwap = {
          operation: "swap",
          protocol: "kuru",
          sender: event.args.msgSender,
          tokenIn: fromKuru(event.args.debitToken),
          tokenOut: fromKuru(event.args.creditToken),
          amountIn: event.args.amountIn.toString(),
          amountOut: event.args.amountOut.toString(),
        };
        return {
          kind: "change" as const,
          change,
          data: routerSwap,
          text: `Kuru Swap: ${routerSwap.amountIn} ${routerSwap.tokenIn} to ${routerSwap.amountOut} ${routerSwap.tokenOut} by ${routerSwap.sender}`,
        };
      }

      const event = tryDecodeKuruEvent(KuruOrderbookAbi, change);
      if (!event) return this.erc20.changesReceipt([change]);
      if (event.eventName !== "Trade") {
        throw new Error(`Unexpected Change: Kuru market emitted ${event.eventName}`);
      }
      if (!sameAddress(event.args.takerAddress, KURU_ROUTER_ADDRESS)) {
        throw new Error("Kuru Receipt Trade taker is not the Kuru router");
      }
      tradeEvents += 1;
      const data = {
        event: "Trade",
        emitter: change.address,
        orderId: event.args.orderId.toString(),
        maker: event.args.makerAddress,
        taker: event.args.takerAddress,
        price: event.args.price.toString(),
        filledSize: event.args.filledSize.toString(),
      } as const;
      return {
        kind: "change" as const,
        change,
        data,
        text: `Trade Event: ${data.filledSize} at ${data.price} emitted by ${data.emitter}`,
      };
    });

    if (!routerSwap) throw new Error("Kuru swap Receipt requires KuruRouterSwap");
    if (tradeEvents === 0) throw new Error("Kuru swap Receipt requires at least one Trade");
    const outcome: KuruSwapOutcome = routerSwap;
    return {
      kind: "receipt",
      outcome,
      text: `Kuru Swap: ${outcome.amountIn} ${outcome.tokenIn} to ${outcome.amountOut} ${outcome.tokenOut}; ${tradeEvents} Trade event${tradeEvents === 1 ? "" : "s"} observed`,
      changes: parsed,
    };
  }

  @Capability<Kuru, typeof limitOrderParams>({
    intent: "Place a resting limit order on a Kuru market at a caller-chosen price",
    verb: "swap",
    params: limitOrderParams,
    receipt: "limitOrderReceipt",
    risk: ["fundOut"],
    tags: ["clob", "orderbook", "limit"],
  })
  async limitOrder(
    params: InferParams<typeof limitOrderParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    // Kuru markets denominate native MON as address(0), but addBuyOrder and
    // addSellOrder are nonpayable — native MON cannot fund a resting order.
    if (params.tokenIn === NATIVE) {
      throw new ParameterError(
        "native MON limit orders are unsupported — wrap MON first and use WMON as tokenIn",
      );
    }
    const { market, isBuy } = await this.#directMarket(
      params.tokenIn,
      params.tokenOut,
      ctx.account,
    );
    const { pricePrecision, sizePrecision, baseDecimals, quoteDecimals, tickSize } = market.params;
    const price = toKuruPrice(params.price, pricePrecision, tickSize);
    if (price <= 0n) throw new ParameterError("price is below the market's tick size");
    if (price > UINT32_MAX) {
      throw new ParameterError("price exceeds Kuru's uint32 limit after precision conversion");
    }
    const amountIn = parseUnits(params.amount, isBuy ? quoteDecimals : baseDecimals);
    let size: bigint;
    if (isBuy) {
      // Buying base with quote: derive the base size the quote spend affords at
      // the tick-aligned limit price (price * tickSize ≈ humanPrice * pricePrecision).
      const baseInQuoteUnits = (amountIn * pricePrecision) / (price * tickSize);
      const baseUnits =
        (baseInQuoteUnits * 10n ** BigInt(baseDecimals)) / 10n ** BigInt(quoteDecimals);
      size = toKuruSize(baseUnits, baseDecimals, sizePrecision);
    } else {
      size = toKuruSize(amountIn, baseDecimals, sizePrecision);
    }
    if (size <= 0n) throw new ParameterError("order size is below the market's size precision");
    // Kuru limit orders settle against the maker's margin account, not via
    // transferFrom — no approve step; the account must fund its margin balance
    // before placement.
    return isBuy
      ? market.handle.addBuyOrder([Number(price), size, false])
      : market.handle.addSellOrder([Number(price), size, false]);
  }

  @Receipt()
  limitOrderReceipt(changes: readonly Change[]): ReceiptResult<KuruLimitOrderOutcome> {
    let created:
      | {
          market: AddressValue;
          orderId: string;
          owner: AddressValue;
          size: string;
          price: string;
          isBuy: boolean;
        }
      | undefined;
    const fills: KuruOrderFill[] = [];
    let market: AddressValue | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") return this.erc20.changesReceipt([change]);
      const event = tryDecodeKuruEvent(KuruOrderbookAbi, change);
      if (!event) return this.erc20.changesReceipt([change]);
      if (event.eventName === "OrderCreated") {
        if (created) throw new Error("Kuru limit order emitted multiple OrderCreated events");
        market = change.address;
        created = {
          market: change.address,
          orderId: event.args.orderId.toString(),
          owner: event.args.owner,
          size: event.args.size.toString(),
          price: event.args.price.toString(),
          isBuy: event.args.isBuy,
        };
        return {
          kind: "change" as const,
          change,
          data: created,
          text: `Kuru Order Created: #${created.orderId} ${created.isBuy ? "buy" : "sell"} size ${created.size} at tick price ${created.price} on ${created.market}`,
        };
      }
      // A non-postOnly order that crosses the book fills immediately as taker.
      if (event.eventName === "Trade") {
        market = change.address;
        const fill: KuruOrderFill = {
          orderId: event.args.orderId.toString(),
          maker: event.args.makerAddress,
          price: event.args.price.toString(),
          filledSize: event.args.filledSize.toString(),
        };
        fills.push(fill);
        return {
          kind: "change" as const,
          change,
          data: fill,
          text: `Trade Event: ${fill.filledSize} at ${fill.price} emitted by ${change.address}`,
        };
      }
      throw new Error(`Unexpected Change: Kuru market emitted ${event.eventName}`);
    });

    if (!market) throw new Error("Kuru limit order Receipt requires OrderCreated or Trade");
    const outcome: KuruLimitOrderOutcome = {
      operation: "limitOrder",
      protocol: "kuru",
      market,
      orderId: created?.orderId ?? null,
      owner: created?.owner ?? null,
      size: created?.size ?? null,
      price: created?.price ?? null,
      isBuy: created?.isBuy ?? null,
      fills,
    };
    const rested = created
      ? `order #${created.orderId} resting at tick price ${created.price}`
      : "no resting order";
    return {
      kind: "receipt",
      outcome,
      text: `Kuru Limit Order: ${rested}; ${fills.length} immediate fill${fills.length === 1 ? "" : "s"}`,
      changes: parsed,
    };
  }

  async #prepareSwap(params: SwapParams, account: AddressValue): Promise<PreparedSwap> {
    if (sameToken(params.tokenIn, params.tokenOut)) {
      throw new ParameterError("tokenIn and tokenOut must differ");
    }
    const side = amountSide(params);
    const routes = await this.#discoverRoutes(params.tokenIn, params.tokenOut, account);
    const [firstRoute] = routes;
    const firstLeg = firstRoute?.[0];
    const lastLeg = firstRoute?.at(-1);
    if (!firstLeg || !lastLeg) throw new Error("no verified Kuru market path for this token pair");
    const inputDecimals = firstLeg.inputDecimals;
    const outputDecimals = lastLeg.outputDecimals;
    const slippage = BigInt(params.slippage ?? DEFAULT_SLIPPAGE_BPS);
    for (const route of routes) {
      if (
        route[0]?.inputDecimals !== inputDecimals ||
        route.at(-1)?.outputDecimals !== outputDecimals
      ) {
        throw new Error("verified Kuru markets disagree on token decimals");
      }
    }

    if (side.kind === "amountIn") {
      const amountIn = parseUnits(side.amount, inputDecimals);
      const quoted = await this.#quoteExactInput(routes, amountIn);
      const minimumAmountOut = (quoted.amountOut * (10_000n - slippage)) / 10_000n;
      return {
        side: side.kind,
        route: quoted.route,
        estimatedAmountIn: amountIn,
        executionAmountIn: amountIn,
        estimatedAmountOut: quoted.amountOut,
        minimumAmountOut,
        inputDecimals,
        outputDecimals,
      };
    }

    const minimumAmountOut = parseUnits(side.amount, outputDecimals);
    const quoted = await this.#quoteTargetOutput(
      routes,
      minimumAmountOut,
      inputDecimals,
      outputDecimals,
    );
    const executionAmountIn = (quoted.amountIn * (10_000n + slippage) + 9_999n) / 10_000n;
    return {
      side: side.kind,
      route: quoted.route,
      estimatedAmountIn: quoted.amountIn,
      executionAmountIn,
      estimatedAmountOut: minimumAmountOut,
      minimumAmountOut,
      inputDecimals,
      outputDecimals,
    };
  }

  /**
   * Resolve the single market listing the pair directly (either orientation).
   * When several verified markets list the same pair the lowest address wins —
   * a deterministic choice, and the chosen market is exposed in every result.
   */
  async #directMarket(tokenIn: TokenRef, tokenOut: TokenRef, account: AddressValue) {
    if (sameToken(tokenIn, tokenOut)) throw new ParameterError("tokenIn and tokenOut must differ");
    const kuruIn = toKuru(tokenIn);
    const kuruOut = toKuru(tokenOut);
    const candidates = (await fetchMarketCandidates(tokenIn, tokenOut))
      .filter(
        (candidate) =>
          (sameAddress(candidate.base, kuruIn) && sameAddress(candidate.quote, kuruOut)) ||
          (sameAddress(candidate.base, kuruOut) && sameAddress(candidate.quote, kuruIn)),
      )
      .sort((left, right) => left.address.toLowerCase().localeCompare(right.address.toLowerCase()));
    const [candidate] = candidates;
    if (!candidate) throw new Error("no verified Kuru market lists this token pair directly");
    const market = await this.#verifyMarket(candidate, account);
    return { market, isBuy: sameAddress(market.params.quoteAsset, kuruIn) };
  }

  async #discoverRoutes(tokenIn: TokenRef, tokenOut: TokenRef, account: AddressValue) {
    const candidates = await fetchMarketCandidates(tokenIn, tokenOut);
    const markets = await Promise.all(
      candidates.map((candidate) => this.#verifyMarket(candidate, account)),
    );
    const routes: Route[] = [];
    for (const market of markets) {
      const leg = routeLeg(market, tokenIn);
      if (leg && sameToken(leg.output, tokenOut)) routes.push([leg]);
    }
    if (tokenIn !== NATIVE && tokenOut !== NATIVE) {
      const firstLegs = markets
        .map((market) => routeLeg(market, tokenIn))
        .filter((leg): leg is RouteLeg => !!leg && leg.output === NATIVE);
      const secondLegs = markets
        .map((market) => routeLeg(market, NATIVE))
        .filter((leg): leg is RouteLeg => !!leg && sameToken(leg.output, tokenOut));
      for (const first of firstLegs) {
        for (const second of secondLegs) {
          if (first.outputDecimals !== second.inputDecimals) {
            throw new Error("verified Kuru markets disagree on native MON decimals");
          }
          routes.push([first, second]);
        }
      }
    }
    const unique = new Map(routes.map((route) => [routeKey(route), route]));
    return [...unique.values()].sort(
      (left, right) => left.length - right.length || routeKey(left).localeCompare(routeKey(right)),
    );
  }

  async #verifyMarket(candidate: MarketCandidate, account: AddressValue): Promise<VerifiedMarket> {
    const [
      pricePrecision,
      sizePrecision,
      baseAsset,
      baseDecimals,
      quoteAsset,
      quoteDecimals,
      tickSize,
    ] = await this.router.read.verifiedMarket([candidate.address]);
    if (
      pricePrecision === 0 ||
      sizePrecision === 0n ||
      !sameAddress(baseAsset, candidate.base) ||
      !sameAddress(quoteAsset, candidate.quote)
    ) {
      throw new Error(`Kuru API returned unverified market ${candidate.address}`);
    }
    const parsedBaseDecimals = tokenDecimals(baseDecimals, candidate.address, "base");
    const parsedQuoteDecimals = tokenDecimals(quoteDecimals, candidate.address, "quote");
    return {
      address: candidate.address,
      handle: createHandle(KuruOrderbookAbi, candidate.address, this.runtime.client, account),
      params: {
        pricePrecision: BigInt(pricePrecision),
        sizePrecision,
        baseAsset,
        baseDecimals: parsedBaseDecimals,
        quoteAsset,
        quoteDecimals: parsedQuoteDecimals,
        tickSize: BigInt(tickSize),
      },
    };
  }

  async #quoteExactInput(routes: readonly Route[], amountIn: bigint) {
    const settled = await Promise.allSettled(
      routes.map(async (route) => ({ route, amountOut: await this.#quoteRoute(route, amountIn) })),
    );
    const quoted = settled.flatMap((result) =>
      result.status === "fulfilled" && result.value.amountOut > 0n ? [result.value] : [],
    );
    const [first] = quoted;
    if (!first) throw new Error("no Kuru market path can quote this input amount");
    return quoted.reduce((best, current) => (current.amountOut > best.amountOut ? current : best));
  }

  async #quoteTargetOutput(
    routes: readonly Route[],
    amountOut: bigint,
    inputDecimals: number,
    outputDecimals: number,
  ) {
    const settled = await Promise.allSettled(
      routes.map(async (route) => ({
        route,
        amountIn: await this.#requiredInput(route, amountOut, inputDecimals, outputDecimals),
      })),
    );
    const quoted = settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const [first] = quoted;
    if (!first) throw new Error("no Kuru market path can satisfy this output amount");
    return quoted.reduce((best, current) => (current.amountIn < best.amountIn ? current : best));
  }

  async #requiredInput(
    route: Route,
    target: bigint,
    inputDecimals: number,
    outputDecimals: number,
  ) {
    // ponytail: monotonic reverse quote; replace with an order-book estimator if RPC volume matters.
    let high = scaleUnits(target, outputDecimals, inputDecimals);
    if (high < 1n) high = 1n;
    for (let attempts = 0; (await this.#quoteRoute(route, high)) < target; attempts += 1) {
      if (attempts >= 255) throw new Error("Kuru target output exceeds uint256 input range");
      high *= 2n;
    }
    let low = 0n;
    while (low + 1n < high) {
      const middle = (low + high) / 2n;
      if ((await this.#quoteRoute(route, middle)) >= target) high = middle;
      else low = middle;
    }
    return high;
  }

  async #quoteRoute(route: Route, amountIn: bigint) {
    let amountOut = amountIn;
    for (const leg of route) {
      amountOut = await this.#quoteFill(leg, amountOut);
      if (amountOut === 0n) break;
    }
    return amountOut;
  }

  async #quoteFill(leg: RouteLeg, amountIn: bigint) {
    if (leg.isBuy) {
      const size =
        (amountIn * leg.market.params.pricePrecision) /
        10n ** BigInt(leg.market.params.quoteDecimals);
      if (size <= 0n) return 0n;
      return leg.market.handle.call.placeAndExecuteMarketBuy([size, 0n, false, false], {
        from: KURU_NATIVE,
      });
    }
    const size =
      (amountIn * leg.market.params.sizePrecision) / 10n ** BigInt(leg.market.params.baseDecimals);
    if (size <= 0n) return 0n;
    return leg.market.handle.call.placeAndExecuteMarketSell(
      [size, 0n, false, false],
      leg.market.params.baseAsset === KURU_NATIVE
        ? { value: amountIn, balance: amountIn }
        : { from: KURU_NATIVE },
    );
  }
}

async function fetchMarketCandidates(tokenIn: TokenRef, tokenOut: TokenRef) {
  const pairs = requestedPairs(tokenIn, tokenOut);
  let response: Response;
  try {
    response = await fetch(`${KURU_API_URL}/api/v1/markets/filtered`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs }),
    });
  } catch (error) {
    throw new Error(`Kuru market discovery failed: ${errorMessage(error)}`);
  }
  if (!response.ok) {
    throw new Error(`Kuru market discovery failed with HTTP ${response.status}`);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`Kuru market discovery returned invalid JSON: ${errorMessage(error)}`);
  }
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("Kuru market discovery returned an invalid response");
  }
  const candidates = payload.data.map(parseMarketCandidate);
  const unique = new Map<string, MarketCandidate>();
  for (const candidate of candidates) {
    const key = candidate.address.toLowerCase();
    const previous = unique.get(key);
    if (
      previous &&
      (!sameAddress(previous.base, candidate.base) || !sameAddress(previous.quote, candidate.quote))
    ) {
      throw new Error(`Kuru market discovery returned conflicting market ${candidate.address}`);
    }
    unique.set(key, candidate);
  }
  return [...unique.values()];
}

function requestedPairs(tokenIn: TokenRef, tokenOut: TokenRef) {
  const pairs = new Map<string, { baseToken: AddressValue; quoteToken: AddressValue }>();
  const add = (base: TokenRef, quote: TokenRef) => {
    if (sameToken(base, quote)) return;
    const pair = { baseToken: toKuru(base), quoteToken: toKuru(quote) };
    pairs.set(`${pair.baseToken.toLowerCase()}:${pair.quoteToken.toLowerCase()}`, pair);
  };
  add(tokenIn, tokenOut);
  add(tokenOut, tokenIn);
  if (tokenIn !== NATIVE && tokenOut !== NATIVE) {
    add(tokenIn, NATIVE);
    add(NATIVE, tokenIn);
    add(NATIVE, tokenOut);
    add(tokenOut, NATIVE);
  }
  return [...pairs.values()];
}

function parseMarketCandidate(value: unknown): MarketCandidate {
  if (!isRecord(value)) throw new Error("Kuru market discovery returned an invalid market");
  return {
    address: parseAddress(value.market, "market"),
    base: parseAddress(value.baseasset, "baseasset"),
    quote: parseAddress(value.quoteasset, "quoteasset"),
  };
}

function parseAddress(value: unknown, field: string): AddressValue {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new Error(`Kuru market discovery returned invalid ${field}`);
  }
  return getAddress(value);
}

function routeLeg(market: VerifiedMarket, input: TokenRef): RouteLeg | undefined {
  const kuruInput = toKuru(input);
  if (sameAddress(kuruInput, market.params.baseAsset)) {
    return {
      market,
      input,
      output: fromKuru(market.params.quoteAsset),
      inputDecimals: market.params.baseDecimals,
      outputDecimals: market.params.quoteDecimals,
      isBuy: false,
      nativeSend: input === NATIVE,
    };
  }
  if (sameAddress(kuruInput, market.params.quoteAsset)) {
    return {
      market,
      input,
      output: fromKuru(market.params.baseAsset),
      inputDecimals: market.params.quoteDecimals,
      outputDecimals: market.params.baseDecimals,
      isBuy: true,
      nativeSend: input === NATIVE,
    };
  }
  return undefined;
}

function routeTokens(route: Route): readonly TokenRef[] {
  const [first] = route;
  return first ? [first.input, ...route.map(({ output }) => output)] : [];
}

function routeKey(route: Route): string {
  return route.map(({ market }) => market.address.toLowerCase()).join(":");
}

function amountSide(params: SwapParams) {
  if (params.amountIn !== undefined && params.amountOut === undefined) {
    return { kind: "amountIn", amount: params.amountIn } as const;
  }
  if (params.amountOut !== undefined && params.amountIn === undefined) {
    return { kind: "amountOut", amount: params.amountOut } as const;
  }
  throw new ParameterError("provide exactly one of amountIn or amountOut");
}

/**
 * Convert a human-readable price ("0.022") to Kuru's tick-denominated uint32
 * order price: orderPrice = humanPrice * pricePrecision / tickSize.
 */
function toKuruPrice(humanPrice: string, pricePrecision: bigint, tickSize: bigint): bigint {
  if (tickSize <= 0n) throw new Error("Kuru market reports no tick size");
  const [intPart = "0", fracPart = ""] = humanPrice.split(".");
  const intVal = BigInt(intPart || "0");
  const raw =
    fracPart.length === 0
      ? intVal * pricePrecision
      : intVal * pricePrecision +
        (BigInt(fracPart) * pricePrecision) / 10n ** BigInt(fracPart.length);
  return raw / tickSize;
}

/** Convert a token base-unit amount into Kuru's sizePrecision units. */
function toKuruSize(amount: bigint, decimals: number, sizePrecision: bigint): bigint {
  return (amount * sizePrecision) / 10n ** BigInt(decimals);
}

function scaleUnits(amount: bigint, fromDecimals: number, toDecimals: number) {
  if (fromDecimals === toDecimals) return amount;
  if (fromDecimals < toDecimals) return amount * 10n ** BigInt(toDecimals - fromDecimals);
  const divisor = 10n ** BigInt(fromDecimals - toDecimals);
  return (amount + divisor - 1n) / divisor;
}

function tokenDecimals(value: bigint, market: AddressValue, asset: "base" | "quote") {
  if (value > 255n) throw new Error(`Kuru market ${market} has invalid ${asset} token decimals`);
  return Number(value);
}

function sameToken(left: TokenRef, right: TokenRef): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function toKuru(token: TokenRef): AddressValue {
  return token === NATIVE ? KURU_NATIVE : token;
}

function fromKuru(token: AddressValue): TokenRef {
  return sameAddress(token, KURU_NATIVE) ? NATIVE : token;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function tryDecodeKuruEvent<TAbi extends typeof KuruRouterAbi | typeof KuruOrderbookAbi>(
  abi: TAbi,
  change: Extract<Change, { kind: "event" }>,
) {
  try {
    return decodeEventLog({
      abi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}

function decodeKuruEvent<TAbi extends typeof KuruRouterAbi | typeof KuruOrderbookAbi>(
  abi: TAbi,
  change: Extract<Change, { kind: "event" }>,
) {
  const event = tryDecodeKuruEvent(abi, change);
  if (!event)
    throw new Error(`Unexpected Change: ${change.address} emitted an unsupported Kuru event`);
  return event;
}
