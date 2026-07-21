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
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { decodeEventLog, formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { KuruOrderbookAbi, KuruRouterAbi } from "./abis/kuru.js";
import type {
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
const KURU_MARKET_DISCOVERY_TIMEOUT_MS = 10_000;
const MAX_KURU_MARKET_DISCOVERY_BYTES = 1_000_000;
const MAX_KURU_MARKET_CANDIDATES = 256;
const MAX_KURU_MARKET_ROUTES = 256;

const OptionalHumanTokenAmount = PositiveDecimalString.optional().describe(
  'An optional positive base-10 decimal amount in a token\'s display units, such as "1" or "1.5".',
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

  async #discoverRoutes(tokenIn: TokenRef, tokenOut: TokenRef, account: AddressValue) {
    const candidates = await fetchMarketCandidates(tokenIn, tokenOut);
    const markets = await Promise.all(
      candidates.map((candidate) => this.#verifyMarket(candidate, account)),
    );
    const routes: Route[] = [];
    const addRoute = (route: Route): void => {
      if (routes.length >= MAX_KURU_MARKET_ROUTES) {
        throw new Error(`too many Kuru market routes; maximum is ${MAX_KURU_MARKET_ROUTES}`);
      }
      routes.push(route);
    };
    for (const market of markets) {
      const leg = routeLeg(market, tokenIn);
      if (leg && sameToken(leg.output, tokenOut)) addRoute([leg]);
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
          addRoute([first, second]);
        }
      }
    }
    const unique = new Map(routes.map((route) => [routeKey(route), route]));
    return [...unique.values()].sort(
      (left, right) => left.length - right.length || routeKey(left).localeCompare(routeKey(right)),
    );
  }

  async #verifyMarket(candidate: MarketCandidate, account: AddressValue): Promise<VerifiedMarket> {
    const [pricePrecision, sizePrecision, baseAsset, baseDecimals, quoteAsset, quoteDecimals] =
      await this.router.read.verifiedMarket([candidate.address]);
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KURU_MARKET_DISCOVERY_TIMEOUT_MS);
  let text: string;
  try {
    const response = await fetch(`${KURU_API_URL}/api/v1/markets/filtered`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Kuru market discovery failed with HTTP ${response.status}`);
    }
    text = await readBoundedMarketDiscoveryResponse(response);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `Kuru market discovery timed out after ${KURU_MARKET_DISCOVERY_TIMEOUT_MS}ms`,
      );
    }
    if (error instanceof Error && error.message.startsWith("Kuru market discovery")) throw error;
    throw new Error(`Kuru market discovery failed: ${errorMessage(error)}`);
  } finally {
    clearTimeout(timeout);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(`Kuru market discovery returned invalid JSON: ${errorMessage(error)}`);
  }
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("Kuru market discovery returned an invalid response");
  }
  if (payload.data.length > MAX_KURU_MARKET_CANDIDATES) {
    throw new Error(
      `Kuru market discovery returned too many markets; maximum is ${MAX_KURU_MARKET_CANDIDATES}`,
    );
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

async function readBoundedMarketDiscoveryResponse(response: Response) {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > MAX_KURU_MARKET_DISCOVERY_BYTES) {
      throw new Error("Kuru market discovery response is too large");
    }
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_KURU_MARKET_DISCOVERY_BYTES) {
      throw new Error("Kuru market discovery response is too large");
    }
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_KURU_MARKET_DISCOVERY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Kuru market discovery response is too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
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
