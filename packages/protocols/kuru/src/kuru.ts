import {
  type ActionCtx,
  Address,
  type AddressValue,
  BasisPoints,
  Capability,
  type CapabilityNode,
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
import { KuruMarginAccountAbi, KuruOrderbookAbi, KuruRouterAbi } from "./abis/kuru.js";
import type {
  KuruLimitOrderOutcome,
  KuruMarginDepositOutcome,
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
const UINT256_MAX = (1n << 256n) - 1n;
/**
 * bestBidAsk() returns prices as 1e18 fixed-point quote-per-base, independent
 * of the market's pricePrecision. Verified empirically across three mainnet
 * markets with pricePrecision 1e7/1e8 against their resting orders
 * (2026-07-17); the live e2e test cross-checks this against a market quote.
 */
const BEST_BID_ASK_DECIMALS = 18;

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

const OptionalMarket = Address.optional().describe(
  "An optional 20-byte 0x address of a specific contract instance.",
);

const pairParams = {
  tokenIn: { type: TokenReference, description: "One asset of the traded pair." },
  tokenOut: { type: TokenReference, description: "The other asset of the traded pair." },
} satisfies ParamsSpec;

const marketPairParams = {
  tokenIn: { type: TokenReference, description: "Asset offered to the market." },
  tokenOut: { type: TokenReference, description: "Asset requested from the market." },
  market: {
    type: OptionalMarket,
    description:
      "Router-verified Kuru market to use. Required when several markets list the pair; " +
      "when omitted and exactly one market lists the pair directly, that market is used.",
  },
} satisfies ParamsSpec;

const limitOrderParams = {
  ...marketPairParams,
  amount: { type: HumanTokenAmount, description: "Quantity of tokenIn committed to the order." },
  price: { type: HumanPrice, description: "Limit price the resting order is placed at." },
} satisfies ParamsSpec;

// orderId is market-local, so status lookups address the market directly.
const orderStatusParams = {
  market: {
    type: Address,
    description: "Router-verified Kuru market the order was placed on; ids are market-local.",
  },
  orderId: { type: UnsignedIntegerString, description: "Kuru order id to look up." },
} satisfies ParamsSpec;

const marginBalanceParams = {
  token: { type: TokenReference, description: "Asset whose Kuru margin balance is read." },
} satisfies ParamsSpec;

const depositMarginParams = {
  token: { type: TokenReference, description: "Asset deposited into the Kuru margin account." },
  amount: { type: HumanTokenAmount, description: "Quantity of token to deposit." },
} satisfies ParamsSpec;

type InferredSwapParams = InferParams<typeof swapParams>;
type SwapParams = Omit<InferredSwapParams, "amountIn" | "amountOut" | "slippage"> &
  Partial<Pick<InferredSwapParams, "amountIn" | "amountOut" | "slippage">>;
type KuruSwapParams = Pick<SwapParams, "tokenIn" | "tokenOut"> & {
  slippage?: InferredSwapParams["slippage"];
} & ({ amountIn: string; amountOut?: never } | { amountIn?: never; amountOut: string });

type WithOptionalMarket<Params> = Omit<Params, "market"> &
  Partial<Pick<Params & { market?: AddressValue }, "market">>;
type MarketPairParams = WithOptionalMarket<InferParams<typeof marketPairParams>>;
type LimitOrderParams = WithOptionalMarket<InferParams<typeof limitOrderParams>>;

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
  async bestBidAsk(params: MarketPairParams, ctx: ActionCtx) {
    const { market } = await this.#directMarket(
      params.tokenIn,
      params.tokenOut,
      ctx.account,
      params.market,
    );
    const [bid, ask] = await market.handle.read.bestBidAsk();
    return {
      market: market.address,
      bestBid: emptyBookSide(bid) ? null : formatUnits(bid, BEST_BID_ASK_DECIMALS),
      bestAsk: emptyBookSide(ask) ? null : formatUnits(ask, BEST_BID_ASK_DECIMALS),
      note: "Prices in quote-per-base units. null means no orders on that side.",
    };
  }

  @Query({
    intent: "List the Router-verified Kuru markets for a token pair with their top of book",
    params: pairParams,
    tags: ["clob", "orderbook"],
  })
  async markets(params: InferParams<typeof pairParams>, ctx: ActionCtx) {
    const candidates = await this.#pairCandidates(params.tokenIn, params.tokenOut);
    const verified = await Promise.all(
      candidates.map((candidate) => this.#verifyMarket(candidate, ctx.account)),
    );
    return Promise.all(
      verified.map(async (market) => {
        const [bid, ask] = await market.handle.read.bestBidAsk();
        return {
          market: market.address,
          baseAsset: fromKuru(market.params.baseAsset),
          quoteAsset: fromKuru(market.params.quoteAsset),
          pricePrecision: market.params.pricePrecision.toString(),
          sizePrecision: market.params.sizePrecision.toString(),
          tickSize: market.params.tickSize.toString(),
          minSize: market.params.minSize.toString(),
          maxSize: market.params.maxSize.toString(),
          bestBid: emptyBookSide(bid) ? null : formatUnits(bid, BEST_BID_ASK_DECIMALS),
          bestAsk: emptyBookSide(ask) ? null : formatUnits(ask, BEST_BID_ASK_DECIMALS),
        };
      }),
    );
  }

  @Query({
    intent: "Look up a Kuru limit order by market and id",
    params: orderStatusParams,
    tags: ["clob", "orderbook"],
  })
  async orderStatus(params: InferParams<typeof orderStatusParams>, ctx: ActionCtx) {
    const market = await this.#verifiedMarket(getAddress(params.market), ctx.account);
    const [owner, size, , , , price, , isBuy] = await market.handle.read.s_orders([
      Number(params.orderId),
    ]);
    // Kuru deletes an order's storage both on full fill and on cancel, so a
    // zeroed owner only proves the order is gone — not which way it went.
    const exists = !sameAddress(owner, KURU_NATIVE);
    return {
      market: market.address,
      orderId: params.orderId,
      owner: exists ? owner : null,
      size: exists ? size.toString() : null,
      price: exists ? String(price) : null,
      isBuy: exists ? isBuy : null,
      status: exists ? ("open" as const) : ("gone" as const),
      note: exists
        ? "Order is resting on the book; size is the unfilled remainder in sizePrecision units."
        : "gone means fully filled or cancelled; Kuru does not distinguish the two on-chain.",
    };
  }

  @Query({
    intent: "Read a Kuru margin account balance",
    params: marginBalanceParams,
    tags: ["margin", "balance"],
  })
  async marginBalance(params: InferParams<typeof marginBalanceParams>, ctx: ActionCtx) {
    const marginAccount = await this.#marginAccount(ctx.account);
    const balance = await marginAccount.handle.read.getBalance([ctx.account, toKuru(params.token)]);
    return {
      marginAccount: marginAccount.address,
      user: ctx.account,
      token: params.token,
      balance: balance.toString(),
      note: "Balance in the token's base units; limit orders are funded from this balance.",
    };
  }

  @Capability<Kuru, typeof depositMarginParams>({
    intent: "Deposit funds into the Kuru margin account that funds limit orders",
    verb: "supply",
    params: depositMarginParams,
    receipt: "depositMarginReceipt",
    risk: ["fundOut", "approval"],
    tags: ["margin"],
  })
  async depositMargin(
    params: InferParams<typeof depositMarginParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    const marginAccount = await this.#marginAccount(ctx.account);
    const decimals =
      params.token === NATIVE ? 18 : (await this.erc20.metadata({ token: params.token })).decimals;
    const amount = parseUnits(params.amount, decimals);
    if (amount <= 0n) throw new ParameterError("deposit amount must be positive");
    const children = [];
    if (params.token !== NATIVE) {
      children.push(
        await this.erc20.approve({
          token: params.token,
          spender: marginAccount.address,
          amount: amount.toString(),
        }),
      );
    }
    children.push(
      marginAccount.handle.deposit([ctx.account, toKuru(params.token), amount], {
        value: params.token === NATIVE ? amount : 0n,
      }),
    );
    return children;
  }

  @Receipt()
  depositMarginReceipt(changes: readonly Change[]): ReceiptResult<KuruMarginDepositOutcome> {
    let deposit: KuruMarginDepositOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") return this.erc20.changesReceipt([change]);
      const event = tryDecodeKuruEvent(KuruMarginAccountAbi, change);
      if (!event) return this.erc20.changesReceipt([change]);
      if (event.eventName !== "Deposit") {
        throw new Error(`Unexpected Change: Kuru margin account emitted ${event.eventName}`);
      }
      if (deposit) throw new Error("Kuru margin deposit emitted multiple Deposit events");
      deposit = {
        operation: "depositMargin",
        protocol: "kuru",
        marginAccount: change.address,
        user: event.args.owner,
        token: fromKuru(event.args.token),
        amount: event.args.amount.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: deposit,
        text: `Kuru Margin Deposit: ${deposit.amount} ${deposit.token} for ${deposit.user}`,
      };
    });
    if (!deposit) throw new Error("Kuru margin deposit Receipt requires a Deposit event");
    return {
      kind: "receipt",
      outcome: deposit,
      text: `Kuru Margin Deposit: ${deposit.amount} base units of ${deposit.token} credited to ${deposit.user}`,
      changes: parsed,
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
    intent:
      "Place a post-only resting limit order on a Kuru market, depositing any missing margin first",
    verb: "swap",
    params: limitOrderParams,
    receipt: "limitOrderReceipt",
    risk: ["fundOut", "approval"],
    tags: ["clob", "orderbook", "limit"],
  })
  async limitOrder(params: LimitOrderParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const { market, isBuy } = await this.#directMarket(
      params.tokenIn,
      params.tokenOut,
      ctx.account,
      params.market,
    );
    const { pricePrecision, sizePrecision, baseDecimals, quoteDecimals, tickSize } = market.params;
    const price = toKuruPrice(params.price, pricePrecision, tickSize);
    if (price > UINT32_MAX) {
      throw new ParameterError("price exceeds Kuru's uint32 limit after precision conversion");
    }
    const inputDecimals = isBuy ? quoteDecimals : baseDecimals;
    const amountIn = parseUnits(params.amount, inputDecimals);
    // Order size is denominated in base-asset sizePrecision units. A buy
    // spends quote, so derive the base size the spend affords at the limit
    // price; a sell commits base directly.
    const size = isBuy
      ? (amountIn * pricePrecision * sizePrecision) / (price * 10n ** BigInt(quoteDecimals))
      : (amountIn * sizePrecision) / 10n ** BigInt(baseDecimals);
    if (size < market.params.minSize) {
      throw new ParameterError(
        `order size ${size} is below the market minimum ${market.params.minSize} (sizePrecision units)`,
      );
    }
    if (market.params.maxSize > 0n && size > market.params.maxSize) {
      throw new ParameterError(
        `order size ${size} exceeds the market maximum ${market.params.maxSize} (sizePrecision units)`,
      );
    }

    // Kuru provisions limit orders from the maker's margin account, not via
    // transferFrom. Top up any shortfall with a nested deposit so the tree is
    // executable by itself; the deposit never exceeds what the order commits.
    const children = [];
    const marginAccount = await this.#marginAccount(ctx.account);
    const balance = await marginAccount.handle.read.getBalance([
      ctx.account,
      toKuru(params.tokenIn),
    ]);
    if (balance < amountIn) {
      children.push(
        await this.#nestedDeposit(params.tokenIn, amountIn - balance, inputDecimals, ctx),
      );
    }
    // postOnly=true: the order can never take liquidity. A price that crosses
    // the current book reverts with PostOnlyError instead of filling.
    children.push(
      isBuy
        ? market.handle.addBuyOrder([Number(price), size, true])
        : market.handle.addSellOrder([Number(price), size, true]),
    );
    return children;
  }

  @Receipt()
  limitOrderReceipt(changes: readonly Change[]): ReceiptResult<KuruLimitOrderOutcome> {
    let created: KuruLimitOrderOutcome | undefined;
    let deposits = 0;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") return this.erc20.changesReceipt([change]);
      const orderEvent = tryDecodeKuruEvent(KuruOrderbookAbi, change);
      if (orderEvent) {
        // postOnly placement can emit exactly one OrderCreated and can never
        // trade, so any other order-book event means the plan was not ours.
        if (orderEvent.eventName !== "OrderCreated") {
          throw new Error(`Unexpected Change: Kuru market emitted ${orderEvent.eventName}`);
        }
        if (created) throw new Error("Kuru limit order emitted multiple OrderCreated events");
        created = {
          operation: "limitOrder",
          protocol: "kuru",
          market: change.address,
          orderId: orderEvent.args.orderId.toString(),
          owner: orderEvent.args.owner,
          size: orderEvent.args.size.toString(),
          price: orderEvent.args.price.toString(),
          isBuy: orderEvent.args.isBuy,
        };
        return {
          kind: "change" as const,
          change,
          data: created,
          text: `Kuru Order Created: #${created.orderId} ${created.isBuy ? "buy" : "sell"} size ${created.size} (sizePrecision units) at price ${created.price} (pricePrecision units) on ${created.market}`,
        };
      }
      const marginEvent = tryDecodeKuruEvent(KuruMarginAccountAbi, change);
      if (marginEvent) {
        if (marginEvent.eventName !== "Deposit") {
          throw new Error(
            `Unexpected Change: Kuru margin account emitted ${marginEvent.eventName}`,
          );
        }
        deposits += 1;
        const data = {
          event: "Deposit",
          marginAccount: change.address,
          user: marginEvent.args.owner,
          token: fromKuru(marginEvent.args.token),
          amount: marginEvent.args.amount.toString(),
        } as const;
        return {
          kind: "change" as const,
          change,
          data,
          text: `Kuru Margin Deposit: ${data.amount} ${data.token} for ${data.user}`,
        };
      }
      return this.erc20.changesReceipt([change]);
    });

    if (!created) throw new Error("Kuru limit order Receipt requires exactly one OrderCreated");
    return {
      kind: "receipt",
      outcome: created,
      text: `Kuru Limit Order: #${created.orderId} ${created.isBuy ? "buy" : "sell"} resting on ${created.market} at price ${created.price} (pricePrecision units)${deposits > 0 ? `; ${deposits} margin deposit${deposits === 1 ? "" : "s"}` : ""}`,
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
   * Resolve the market a pair-addressed method operates on. An explicit
   * market parameter is verified against the Router and must list the pair;
   * without one the pair must map to exactly one direct market — an
   * ambiguous pair is an error rather than an arbitrary choice, because
   * price, liquidity, and order ids are all market-local.
   */
  async #directMarket(
    tokenIn: TokenRef,
    tokenOut: TokenRef,
    account: AddressValue,
    explicit?: AddressValue,
  ) {
    const kuruIn = toKuru(tokenIn);
    const kuruOut = toKuru(tokenOut);

    if (explicit) {
      if (sameToken(tokenIn, tokenOut)) {
        throw new ParameterError("tokenIn and tokenOut must differ");
      }
      const market = await this.#verifiedMarket(getAddress(explicit), account);
      if (!pairMatches(market.params.baseAsset, market.params.quoteAsset, kuruIn, kuruOut)) {
        throw new ParameterError(`market ${explicit} does not list this token pair`);
      }
      return { market, isBuy: sameAddress(market.params.quoteAsset, kuruIn) };
    }

    const candidates = await this.#pairCandidates(tokenIn, tokenOut);
    if (candidates.length === 0) {
      throw new Error("no verified Kuru market lists this token pair directly");
    }
    if (candidates.length > 1) {
      const addresses = candidates
        .map((candidate) => candidate.address)
        .sort()
        .join(", ");
      throw new ParameterError(
        `multiple Kuru markets list this pair (${addresses}); pass the market parameter to choose one — the markets Query lists each market with its top of book`,
      );
    }
    const market = await this.#verifyMarket(candidates[0] as MarketCandidate, account);
    return { market, isBuy: sameAddress(market.params.quoteAsset, kuruIn) };
  }

  /** All API-discovered markets that list the pair directly, in either orientation. */
  async #pairCandidates(tokenIn: TokenRef, tokenOut: TokenRef) {
    if (sameToken(tokenIn, tokenOut)) throw new ParameterError("tokenIn and tokenOut must differ");
    const kuruIn = toKuru(tokenIn);
    const kuruOut = toKuru(tokenOut);
    return (await fetchMarketCandidates(tokenIn, tokenOut)).filter((candidate) =>
      pairMatches(candidate.base, candidate.quote, kuruIn, kuruOut),
    );
  }

  /** Verify an explicitly supplied market address against the Router alone. */
  async #verifiedMarket(address: AddressValue, account: AddressValue): Promise<VerifiedMarket> {
    const market = await this.#marketFromRouter(address, account);
    if (!market) throw new Error(`${address} is not a Router-verified Kuru market`);
    return market;
  }

  /**
   * The Kuru margin account, discovered from the Router (never hardcoded).
   * Wrapped in an object because a bare Handle proxy must never be a promise's
   * resolution value — its catch-all `then` would make it a thenable.
   */
  async #marginAccount(account: AddressValue) {
    const address = await this.router.read.marginAccountAddress();
    return {
      address,
      handle: createHandle(KuruMarginAccountAbi, address, this.runtime.client, account),
    };
  }

  /** Wrap a margin deposit as a nested Capability so the tree stays self-describing. */
  async #nestedDeposit(
    token: TokenRef,
    shortfall: bigint,
    decimals: number,
    ctx: ActionCtx,
  ): Promise<CapabilityNode> {
    const depositParams = { token, amount: formatUnits(shortfall, decimals) };
    const children = await this.depositMargin(depositParams, ctx);
    return {
      kind: "capability",
      protocol: "kuru",
      method: "depositMargin",
      params: depositParams,
      children: Array.isArray(children) ? children : [children],
    };
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
    const market = await this.#marketFromRouter(candidate.address, account);
    if (
      !market ||
      !sameAddress(market.params.baseAsset, candidate.base) ||
      !sameAddress(market.params.quoteAsset, candidate.quote)
    ) {
      throw new Error(`Kuru API returned unverified market ${candidate.address}`);
    }
    return market;
  }

  async #marketFromRouter(
    address: AddressValue,
    account: AddressValue,
  ): Promise<VerifiedMarket | undefined> {
    const [
      pricePrecision,
      sizePrecision,
      baseAsset,
      baseDecimals,
      quoteAsset,
      quoteDecimals,
      tickSize,
      minSize,
      maxSize,
    ] = await this.router.read.verifiedMarket([address]);
    if (pricePrecision === 0 || sizePrecision === 0n) return undefined;
    return {
      address,
      handle: createHandle(KuruOrderbookAbi, address, this.runtime.client, account),
      params: {
        pricePrecision: BigInt(pricePrecision),
        sizePrecision,
        baseAsset,
        baseDecimals: tokenDecimals(baseDecimals, address, "base"),
        quoteAsset,
        quoteDecimals: tokenDecimals(quoteDecimals, address, "quote"),
        tickSize: BigInt(tickSize),
        minSize,
        maxSize,
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
 * Convert a human-readable price ("0.022") to Kuru's uint32 order price in
 * pricePrecision units: orderPrice = humanPrice * pricePrecision. This
 * matches @kuru-labs/kuru-sdk GTC.placeLimit (parseUnits over
 * log10(pricePrecision)) and live mainnet orders; the SDK silently clips
 * excess decimals, we reject them instead. tickSize does not scale the
 * price — it only constrains which prices are valid, mirroring the
 * contract's TickSizeError.
 */
function toKuruPrice(humanPrice: string, pricePrecision: bigint, tickSize: bigint): bigint {
  const [intPart = "0", fracPart = ""] = humanPrice.split(".");
  const fracScale = 10n ** BigInt(fracPart.length);
  const fracRaw = fracPart ? BigInt(fracPart) * pricePrecision : 0n;
  if (fracRaw % fracScale !== 0n) {
    throw new ParameterError(
      `price ${humanPrice} has more decimals than the market's price precision (${pricePrecision}) can represent`,
    );
  }
  const raw = BigInt(intPart || "0") * pricePrecision + fracRaw / fracScale;
  if (raw <= 0n) throw new ParameterError("price is zero at the market's price precision");
  if (tickSize > 0n && raw % tickSize !== 0n) {
    throw new ParameterError(
      `price ${humanPrice} maps to ${raw} price units, which is not a multiple of the market tick size ${tickSize}`,
    );
  }
  return raw;
}

/** True when a bestBidAsk side carries no orders: 0 and MaxUint256 are both empty-side sentinels. */
function emptyBookSide(raw: bigint): boolean {
  return raw === 0n || raw === UINT256_MAX;
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

/** True when a market's base/quote equal the pair in either orientation. */
function pairMatches(
  base: AddressValue,
  quote: AddressValue,
  kuruIn: AddressValue,
  kuruOut: AddressValue,
): boolean {
  return (
    (sameAddress(base, kuruIn) && sameAddress(quote, kuruOut)) ||
    (sameAddress(base, kuruOut) && sameAddress(quote, kuruIn))
  );
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

function tryDecodeKuruEvent<
  TAbi extends typeof KuruRouterAbi | typeof KuruOrderbookAbi | typeof KuruMarginAccountAbi,
>(abi: TAbi, change: Extract<Change, { kind: "event" }>) {
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

function decodeKuruEvent<
  TAbi extends typeof KuruRouterAbi | typeof KuruOrderbookAbi | typeof KuruMarginAccountAbi,
>(abi: TAbi, change: Extract<Change, { kind: "event" }>) {
  const event = tryDecodeKuruEvent(abi, change);
  if (!event)
    throw new Error(`Unexpected Change: ${change.address} emitted an unsupported Kuru event`);
  return event;
}
