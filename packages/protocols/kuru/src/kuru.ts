import {
  type ActionCtx,
  type AddressValue,
  BasisPoints,
  BooleanFlag,
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
  KuruUnavailableEvaluation,
  KuruUnavailableReason,
  KuruUnavailableRoute,
  MarketCandidate,
  PreparedSwap,
  Route,
  RouteLeg,
  VerifiedMarket,
} from "./types.js";

/** Why a Kuru quote could not be produced. */
export type KuruQuoteErrorCode =
  /** Discovery completed; no verified direct or via-MON route exists. */
  | "NO_VERIFIED_ROUTE"
  /** Every exact-input route completed and returned zero output. */
  | "NO_POSITIVE_QUOTE"
  /** Nothing could be quoted and at least one evaluation did not complete. */
  | "ROUTE_QUOTE_UNAVAILABLE"
  /** Every route completed and none can reach the requested output. */
  | "TARGET_OUTPUT_UNSATISFIABLE";

export type { KuruUnavailableRoute } from "./types.js";

/**
 * Typed rejection of a Kuru quote. `unavailable` holds the evaluations that did not complete,
 * so a caller can tell "the answer is no" from "we never finished asking".
 */
export class KuruQuoteError extends Error {
  readonly code: KuruQuoteErrorCode;
  readonly side: KuruQuote["amountSide"];
  declare readonly unavailable: readonly KuruUnavailableRoute[];

  constructor(
    code: KuruQuoteErrorCode,
    side: KuruQuote["amountSide"],
    detail: string,
    unavailable: readonly KuruUnavailableRoute[] = [],
  ) {
    super(`${code}: ${detail}`);
    this.name = "KuruQuoteError";
    this.code = code;
    this.side = side;
    // Non-enumerable on purpose. viem's errors carry the RPC URL and the request body in
    // enumerable fields, so a consumer's JSON.stringify(error) or a structured logger would
    // republish an endpoint credential. Both stay reachable for programmatic inspection.
    Object.defineProperty(this, "unavailable", { value: unavailable, enumerable: false });
    if (unavailable[0]) {
      Object.defineProperty(this, "cause", { value: unavailable[0].error, enumerable: false });
    }
  }
}

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
/** The markets take their size as `uint96`, so this is the largest probe one leg can be asked. */
const MAX_ENCODABLE_PROBE = 2n ** 96n - 1n;
/**
 * Live calls the search will spend coming down from a size the market itself refused.
 *
 * An encode refusal is free and has an exact boundary. A `Panic` is neither, so coming down
 * through one is a paid sweep against the node. Bounded because a market that refuses everywhere
 * would otherwise turn a single quote into a log2 sweep — and running out of budget costs only
 * accuracy of reporting, since the route is then reported as unmeasured rather than answered.
 */
const MAX_PAID_DESCENT_PROBES = 6;
/** Doubling steps the reverse search may take before it gives up rather than climb forever. */
const MAX_SEARCH_STEPS = 128;

const OptionalHumanTokenAmount = PositiveDecimalString.optional().describe(
  'An optional positive base-10 decimal amount in a token\'s display units, such as "1" or "1.5".',
);
const RequireExhaustive = BooleanFlag.describe(
  "Whether a swap must refuse when the route comparison was incomplete.",
);
const KuruSlippage = BasisPoints.min(50)
  .max(5_000)
  .describe("An integer basis-point count from 50 through 5000; 1 bps equals 0.01%.");

const quoteParams = {
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

// Only the write carries it. Declaring it on `quote` as well would put a parameter in front of an
// Agent that does nothing there: a quote reports the gaps and answers regardless.
const swapParams = {
  ...quoteParams,
  requireExhaustive: {
    type: RequireExhaustive.default(true),
    description:
      "Refuse to build the swap when some verified routes could not be evaluated. Default true: a write is not the place to guess. Set false to accept the best of a partial comparison.",
  },
} satisfies ParamsSpec;

type InferredQuoteParams = InferParams<typeof quoteParams>;
type InferredSwapParams = InferParams<typeof swapParams>;
type QuoteParams = Omit<InferredQuoteParams, "amountIn" | "amountOut" | "slippage"> &
  Partial<Pick<InferredQuoteParams, "amountIn" | "amountOut" | "slippage">>;
type SwapParams = Omit<
  InferredSwapParams,
  "amountIn" | "amountOut" | "slippage" | "requireExhaustive"
> &
  Partial<Pick<InferredSwapParams, "amountIn" | "amountOut" | "slippage" | "requireExhaustive">>;
type KuruQuoteParams = Pick<QuoteParams, "tokenIn" | "tokenOut"> & {
  slippage?: InferredQuoteParams["slippage"];
} & ({ amountIn: string; amountOut?: never } | { amountIn?: never; amountOut: string });
type KuruSwapParams = Pick<SwapParams, "tokenIn" | "tokenOut"> & {
  slippage?: InferredSwapParams["slippage"];
  requireExhaustive?: InferredSwapParams["requireExhaustive"];
} & ({ amountIn: string; amountOut?: never } | { amountIn?: never; amountOut: string });

/** A search probe either priced, or could not be represented at that size. */
type SearchProbe =
  | { readonly ok: true; readonly amountOut: bigint }
  | { readonly ok: false; readonly error: Error; readonly free: boolean };

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

  quote(params: KuruQuoteParams, ctx: ActionCtx): Promise<KuruQuote>;
  @Query({ intent: "Quote the best Kuru swap path", params: quoteParams, tags: ["clob", "quote"] })
  async quote(params: QuoteParams, ctx: ActionCtx): Promise<KuruQuote> {
    const prepared = await this.#prepareSwap(params, ctx.account);
    const path = routeTokens(prepared.route);
    if (prepared.side === "amountIn") {
      return {
        amountSide: "amountIn" as const,
        amountIn: formatUnits(prepared.estimatedAmountIn, prepared.inputDecimals),
        estimatedAmountOut: formatUnits(prepared.estimatedAmountOut, prepared.outputDecimals),
        minimumAmountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
        path,
        unavailable: reportable(prepared.unavailable),
      };
    }
    return {
      amountSide: "amountOut" as const,
      estimatedAmountIn: formatUnits(prepared.estimatedAmountIn, prepared.inputDecimals),
      maximumAmountIn: formatUnits(prepared.executionAmountIn, prepared.inputDecimals),
      minimumAmountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
      path,
      unavailable: reportable(prepared.unavailable),
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
    // Before any Capability is built, not after: a partial comparison means a route we never
    // measured might have been the better one, and a write is not the place to guess. `quote`
    // stays advisory and reports the gaps; a swap refuses unless the caller opts out in so many
    // words.
    if (params.requireExhaustive !== false && prepared.unavailable.length > 0) {
      throw new KuruQuoteError(
        "ROUTE_QUOTE_UNAVAILABLE",
        prepared.side,
        `${prepared.unavailable.length} of the verified routes could not be evaluated, so this swap would execute on an incomplete comparison; pass requireExhaustive: false to accept it`,
        prepared.unavailable,
      );
    }
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
    const parsed = changes.map((change, index) => {
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
      if (event.eventName === "FlipOrderUpdated") {
        requireFollowingRouterTrade(changes, index, change.address);
        const data = {
          event: "FlipOrderUpdated",
          emitter: change.address,
          orderId: event.args.orderId.toString(),
          size: event.args.size.toString(),
        } as const;
        return {
          kind: "change" as const,
          change,
          data,
          text: `Flip Order Updated: order ${data.orderId} has size ${data.size} emitted by ${data.emitter}`,
        };
      }
      if (event.eventName === "FlippedOrderCreated") {
        requireFollowingRouterTrade(changes, index, change.address);
        const data = {
          event: "FlippedOrderCreated",
          emitter: change.address,
          orderId: event.args.orderId.toString(),
          flippedId: event.args.flippedId.toString(),
          owner: event.args.owner,
          size: event.args.size.toString(),
          price: event.args.price.toString(),
          flippedPrice: event.args.flippedPrice.toString(),
          isBuy: event.args.isBuy,
        } as const;
        return {
          kind: "change" as const,
          change,
          data,
          text: `Flipped Order Created: order ID ${data.orderId}, flipped ID ${data.flippedId}, owner ${data.owner}; size ${data.size}, price ${data.price}, flipped price ${data.flippedPrice}, is buy ${data.isBuy}, emitted by ${data.emitter}`,
        };
      }
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

  async #prepareSwap(params: QuoteParams, account: AddressValue): Promise<PreparedSwap> {
    if (sameToken(params.tokenIn, params.tokenOut)) {
      throw new ParameterError("tokenIn and tokenOut must differ");
    }
    const side = amountSide(params);
    const routes = await this.#discoverRoutes(params.tokenIn, params.tokenOut, account);
    const [firstRoute] = routes;
    const firstLeg = firstRoute?.[0];
    const lastLeg = firstRoute?.at(-1);
    if (!firstLeg || !lastLeg) {
      // Discovery completed and produced nothing: a different claim from any quote outcome.
      throw new KuruQuoteError(
        "NO_VERIFIED_ROUTE",
        side.kind,
        "no verified Kuru market path for this token pair",
      );
    }
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
        unavailable: quoted.unavailable,
      };
    }

    const minimumAmountOut = parseUnits(side.amount, outputDecimals);
    // A target below the token's smallest unit rounds to zero, and a swap whose minimum output is
    // zero carries no slippage protection at all — it can be emptied and still satisfy its own
    // floor. `PositiveDecimalString` accepts "0.0000001"; the token's decimals decide whether that
    // is a quantity or nothing.
    if (minimumAmountOut === 0n) {
      throw new ParameterError(
        `amountOut ${side.amount} is below the smallest unit this token can represent (${outputDecimals} decimals), so it rounds to zero`,
      );
    }
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
      unavailable: quoted.unavailable,
    };
  }

  async #discoverRoutes(tokenIn: TokenRef, tokenOut: TokenRef, account: AddressValue) {
    const candidates = await fetchMarketCandidates(tokenIn, tokenOut);
    // Verification is the one on-chain read outside the quoting path, and it used to escape raw:
    // a provider hiccup here threw viem's error, whose message carries the RPC URL and request
    // body, straight past every sanitizer this adapter has. Same credential, same wire, reached
    // through discovery instead of quoting.
    const markets = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          return await this.#verifyMarket(candidate, account);
        } catch (error) {
          if (error instanceof KuruQuoteError || isOurOwnRefusal(error)) throw error;
          throw sanitized(
            `Kuru market verification could not be completed for ${candidate.address} (${categorize(asError(error))})`,
            error,
          );
        }
      }),
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
    // Rejections are kept with the route they belong to: each one is a candidate that was never
    // compared, and naming it is the difference between evidence and a bare count.
    const unavailable = settled.flatMap((result, index) =>
      result.status === "rejected"
        ? [{ path: routeTokens(routes[index] as Route), error: asError(result.reason) }]
        : [],
    );
    const completed = settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );

    const quoted = completed.filter((entry) => entry.amountOut > 0n);
    const [first] = quoted;
    if (!first) {
      // These were one message before, and they are different claims.
      if (unavailable.length > 0) {
        throw new KuruQuoteError(
          "ROUTE_QUOTE_UNAVAILABLE",
          "amountIn",
          `no route quoted this input and ${unavailable.length} of ${routes.length} evaluations did not complete, so the comparison is incomplete`,
          unavailable,
        );
      }
      throw new KuruQuoteError(
        "NO_POSITIVE_QUOTE",
        "amountIn",
        `all ${routes.length} verified routes completed and quoted zero output for this input amount`,
      );
    }
    const best = quoted.reduce((left, right) => (right.amountOut > left.amountOut ? right : left));
    return { ...best, unavailable };
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
    // The reverse search rejects both when a route cannot reach the target and when the
    // evaluation failed; only the first is an answer.
    const unsatisfiable: KuruUnavailableRoute[] = [];
    const unavailable: KuruUnavailableRoute[] = [];
    settled.forEach((result, index) => {
      if (result.status !== "rejected") return;
      const entry = {
        path: routeTokens(routes[index] as Route),
        error: asError(result.reason),
      };
      (isUnsatisfiableTarget(entry.error) ? unsatisfiable : unavailable).push(entry);
    });
    const quoted = settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );

    const [first] = quoted;
    if (!first) {
      if (unavailable.length > 0) {
        throw new KuruQuoteError(
          "ROUTE_QUOTE_UNAVAILABLE",
          "amountOut",
          `no route satisfied this output and ${unavailable.length} of ${routes.length} evaluations did not complete, so the comparison is incomplete`,
          unavailable,
        );
      }
      throw new KuruQuoteError(
        "TARGET_OUTPUT_UNSATISFIABLE",
        "amountOut",
        `all ${routes.length} verified routes outgrew what their markets can price for this output amount`,
        unsatisfiable,
      );
    }
    // Only `unavailable` marks the comparison partial: a route that completed and cannot reach
    // the target was measured, and saying so would overstate the gap.
    const best = quoted.reduce((left, right) => (right.amountIn < left.amountIn ? right : left));
    return { ...best, unavailable };
  }

  /**
   * Quote a search probe, reporting "this size cannot be represented" as a value rather than a
   * verdict.
   *
   * The refusal used to be classified here as "the target is unreachable". On a single-leg route
   * that holds: the probe is the market's own size argument, so nothing larger can be priced. On a
   * multi-leg route it does not. Our probe sizes the FIRST leg; every leg after it is sized by
   * what the chain returned for the one before, so a cheap first leg can amplify a small probe
   * past the next leg's `uint96` while a smaller input already reaches the target. Mainnet has
   * such routes, and calling them unsatisfiable turned a quotable pair into a refusal.
   */
  async #quoteRouteForSearch(route: Route, amountIn: bigint): Promise<SearchProbe> {
    try {
      return { ok: true, amountOut: await this.#quoteRoute(route, amountIn) };
    } catch (error) {
      // Carried on the result, not on the instance: routes are probed concurrently, so a field
      // would hand one route's failure to another. The two refusals are told apart because one is
      // free and the other is not — viem refuses to encode without asking the chain anything,
      // while a market Panic costs a live eth_call. Only the free one is worth searching with.
      if (isProbeBeyondEncodableSize(error)) {
        return { ok: false, error: asError(error), free: true };
      }
      if (isMarketArithmeticOverflow(error)) {
        return { ok: false, error: asError(error), free: false };
      }
      throw error;
    }
  }

  /**
   * Comes down from a size the route would not price, to the largest one it will.
   *
   * The two refusals prove different things, so they are searched differently. viem's encode
   * refusal is deterministic and its boundary is known exactly: on a single leg the probe *is* the
   * market's `uint96` size argument, so one probe at that type's maximum settles where the ceiling
   * is. A market `Panic` is the market's own arithmetic giving out at that size — it says nothing
   * about smaller ones and offers no boundary to jump to, so it has to be searched for, in live
   * calls, which is why the paid descent is bounded.
   *
   * Returns null when no priceable size was found. That is not an answer about the target: nothing
   * was measured, so the route is reported as unevaluated.
   */
  async #largestPriceable(
    route: Route,
    refusedAt: bigint,
    refusal: Extract<SearchProbe, { ok: false }>,
  ): Promise<{ high: bigint; probe: Extract<SearchProbe, { ok: true }> } | null> {
    let above = refusedAt;
    let probe: SearchProbe = refusal;

    if (refusal.free && route.length === 1 && refusedAt > MAX_ENCODABLE_PROBE) {
      const at = await this.#quoteRouteForSearch(route, MAX_ENCODABLE_PROBE);
      if (at.ok) return { high: MAX_ENCODABLE_PROBE, probe: at };
      above = MAX_ENCODABLE_PROBE;
      probe = at;
    }

    // Only the paid steps are budgeted. viem refuses to encode without asking the chain anything,
    // so coming down through those costs nothing and stopping early would throw away a route we
    // could still measure; a market Panic is a live call each time, and that is what needs a limit.
    let high = above;
    let paid = 0;
    while (high > 1n && !probe.ok) {
      if (!probe.free) {
        if (paid >= MAX_PAID_DESCENT_PROBES) break;
        paid += 1;
      }
      high /= 2n;
      probe = await this.#quoteRouteForSearch(route, high);
    }
    if (!probe.ok) return null;

    // Halving alone leaves the band it jumped over unexplored, and the answer often lives there.
    let below = high;
    let ceiling = above;
    let priced = probe;
    while (below + 1n < ceiling) {
      const middle = (below + ceiling) / 2n;
      const at = await this.#quoteRouteForSearch(route, middle);
      if (at.ok) {
        below = middle;
        priced = at;
      } else {
        ceiling = middle;
      }
    }
    return { high: below, probe: priced };
  }

  /**
   * The one thing this search may declare out of reach, and the only evidence that establishes it.
   *
   * The route priced the largest size its market can be asked for — the `uint96` maximum, not a
   * guess — and still fell short. Nothing above it can be requested at all, so no further probe
   * exists. A market's own refusal never gets here: its arithmetic failing at one size says
   * nothing about the next, and reporting that as a definitive no is the mistake this search
   * exists to avoid.
   */
  #outOfReach(route: Route, priced: bigint): never {
    throw new KuruQuoteError(
      "TARGET_OUTPUT_UNSATISFIABLE",
      "amountOut",
      "reaching this target needs more input than this market can price",
      [
        {
          path: routeTokens(route),
          error: new Error(
            `Kuru priced the largest encodable size (${priced}) and it did not reach the target`,
          ),
        },
      ],
    );
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

    // The opening guess assumes a 1:1 price, so on any route that gains it is already too large.
    // A refusal there is evidence about the guess, not about the target: come down to a size the
    // route will price before concluding anything at all.
    let probe = await this.#quoteRouteForSearch(route, high);
    if (!probe.ok) {
      const found = await this.#largestPriceable(route, high, probe);
      if (!found) throw probe.error;
      high = found.high;
      probe = found.probe;
    }

    // An explicit backstop, as upstream had. Termination otherwise rests entirely on viem refusing
    // to encode above `uint96`, which is a property of a dependency rather than of this search.
    for (let steps = 0; probe.amountOut < target; steps += 1) {
      if (steps >= MAX_SEARCH_STEPS) {
        throw new Error("Kuru reverse search did not converge on an input for this target");
      }
      if (route.length === 1 && high >= MAX_ENCODABLE_PROBE) this.#outOfReach(route, high);
      let next = high * 2n;
      // Doubling past the argument type would be refused for a reason that has nothing to do with
      // the market, and the answer can sit between here and there.
      if (route.length === 1 && next > MAX_ENCODABLE_PROBE) next = MAX_ENCODABLE_PROBE;
      const doubled = await this.#quoteRouteForSearch(route, next);
      if (!doubled.ok) {
        const found = await this.#largestPriceable(route, next, doubled);
        if (!found || found.high <= high) throw doubled.error;
        high = found.high;
        probe = found.probe;
        if (probe.amountOut < target) {
          if (route.length === 1 && high >= MAX_ENCODABLE_PROBE) this.#outOfReach(route, high);
          // The route prices nothing larger, but a market that gives out at one size proves
          // nothing about the next, so this is an unmeasured route rather than an answer.
          throw doubled.error;
        }
        continue;
      }
      high = next;
      probe = doubled;
    }
    let low = 0n;
    while (low + 1n < high) {
      const middle = (low + high) / 2n;
      // Deliberately not the classifier: `middle` is below a size that already priced, so a
      // refusal here says nothing about the range. For a two-leg route the second leg is sized
      // from what the chain returned for the first, so it can fail on a smaller probe.
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
  } catch {
    // Not the parser's message: V8 embeds the opening characters of the body in it, which is
    // remote-controlled text on its way to an Agent.
    throw new Error("Kuru market discovery returned invalid JSON");
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

// The pinned OrderBook executes _fillOrder -> _handleFlipOrderUpdate -> _emitTrade.
function requireFollowingRouterTrade(
  changes: readonly Change[],
  index: number,
  market: AddressValue,
): void {
  const next = changes[index + 1];
  if (next?.kind === "event" && sameAddress(next.address, market)) {
    const event = tryDecodeKuruEvent(KuruOrderbookAbi, next);
    if (event?.eventName === "Trade" && sameAddress(event.args.takerAddress, KURU_ROUTER_ADDRESS)) {
      return;
    }
  }
  throw new Error(
    "Kuru flip-order Receipt requires an immediately following Router Trade from the same market",
  );
}

/** Anything thrown, as an Error, so provenance survives a non-Error rejection. */
/**
 * Gaps as a Query result can carry them: a stable category, never the underlying message.
 *
 * `HttpRequestError.message` from viem carries the RPC URL and the request body. Viem strips the
 * userinfo, but not the path — and a hosted endpoint usually keeps its API key there, so copying
 * the message would publish that key whenever another route succeeded and the result left through
 * a Query. Categories are a closed set, so nothing an upstream library later decides to put in a
 * message can widen what leaves here. The live Error stays on the thrown `KuruQuoteError`.
 */
function reportable(
  unavailable: readonly KuruUnavailableRoute[],
): readonly KuruUnavailableEvaluation[] {
  return unavailable.map(({ path, error }) => ({ path, reason: categorize(error) }));
}

/** Map a failure onto the closed reason set, walking the cause chain viem builds. */
/** An Error whose message is ours, keeping the original reachable but never enumerable. */
function sanitized(message: string, cause: unknown): Error {
  const error = new Error(message);
  Object.defineProperty(error, "cause", { value: cause, enumerable: false });
  return error;
}

/**
 * Whether this adapter wrote the message itself.
 *
 * Every refusal this package raises names Kuru first — an unverified market, invalid decimals, a
 * discovery bound. Anything else arrived from below, where viem puts the endpoint URL and the
 * request body into the text, and must not be passed on as it stands.
 */
function isOurOwnRefusal(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Kuru ");
}

function categorize(error: Error): KuruUnavailableReason {
  if (isProbeBeyondEncodableSize(error)) return "unencodable-probe";
  for (
    let current: unknown = error, depth = 0;
    current instanceof Error && depth < 16;
    depth += 1
  ) {
    const { name } = current;
    // `RpcRequestError` is what viem chains under every JSON-RPC *error response*, including the
    // 429 the default endpoint returns after a few dozen sequential calls — runtime.ts documents
    // that. Without it the likeliest real gap on the default configuration would read "unknown".
    if (
      name === "HttpRequestError" ||
      name === "TimeoutError" ||
      name === "SocketClosedError" ||
      name === "RpcRequestError" ||
      name.endsWith("RpcError")
    ) {
      return "transport";
    }
    if (name === "ExecutionRevertedError" || name === "ContractFunctionRevertedError") {
      return "reverted";
    }
    current = current.cause;
  }
  return "unknown";
}

function asError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

/**
 * True when a route rejection means "this route cannot reach the target", as opposed to "the
 * evaluation did not complete". Only the reverse search raises the former, and it says so with
 * a typed error rather than a message match.
 */
function isUnsatisfiableTarget(error: Error): boolean {
  return error instanceof KuruQuoteError && error.code === "TARGET_OUTPUT_UNSATISFIABLE";
}

/**
 * True when the probe outgrew what the market's size parameter can even hold.
 *
 * This is viem refusing to encode a `uint96` argument: client-side, before anything is asked of
 * the chain. Applied only to the doubling loop, where each probe is deliberately larger than the
 * last, so a refusal means the search has outgrown what the size argument can hold. The binary
 * search uses the raw quote instead — its probes are below a size that already priced, and for a
 * two-leg route the second leg is sized from the chain's answer to the first, so a refusal there
 * would prove nothing.
 *
 * An on-chain revert is deliberately NOT accepted here. It looks similar and is not: `eth_call`
 * reverts for a paused market, a failed require, or the provider's own gas cap, none of which
 * say anything about the priceable range. Calling those "the target cannot be reached" would
 * state a definitive no from evidence that establishes nothing — the very failure this change
 * exists to prevent. They stay unavailable, which is the honest reading: we could not find out.
 *
 * Matched on viem's error name rather than message text: the name is part of its API, the
 * wording is not. The walk is depth-bounded because a `cause` chain can be cyclic.
 */
function isProbeBeyondEncodableSize(error: unknown): boolean {
  for (let current = error, depth = 0; current instanceof Error && depth < 16; depth += 1) {
    if (current.name === "IntegerOutOfRangeError") return true;
    current = current.cause;
  }
  return false;
}

/** Solidity `Panic(uint256)` selector, followed by the code as a uint256. */
const PANIC_SELECTOR = "0x4e487b71";
const PANIC_ARITHMETIC_OVERFLOW = 0x11n;

/**
 * True when the market itself refused the probe with an arithmetic overflow.
 *
 * Authenticated the same way the Uniswap adapter authenticates its skippable reverts: the revert
 * data is decoded and matched, not inferred from an error class. `Panic(0x11)` from the
 * orderbook means the size overflowed its own arithmetic, so a larger probe cannot help either.
 *
 * A revert with no data stays unavailable. Kuru markets produce those below the panic threshold,
 * and so does a provider `eth_call` gas cap — nothing in an empty revert attributes the failure
 * to the market.
 */
function isMarketArithmeticOverflow(error: unknown): boolean {
  for (let current = error, depth = 0; current instanceof Error && depth < 16; depth += 1) {
    // viem hands revert data back either as the hex itself or wrapped a level down, and its own
    // `getRevertErrorData` unwraps exactly this shape. Reading only the string form would miss a
    // real Panic on whichever providers use the object one, and miss it silently.
    const raw = (current as { data?: unknown }).data;
    const data = typeof raw === "object" && raw !== null ? (raw as { data?: unknown }).data : raw;
    if (
      typeof data === "string" &&
      data.startsWith(PANIC_SELECTOR) &&
      data.length === PANIC_SELECTOR.length + 64
    ) {
      // The tail comes from the provider. `BigInt` throws on anything that is not hex, and this
      // runs inside the search's catch block, so an unchecked parse would replace the market's
      // real failure with a SyntaxError and lose the reason the probe failed at all.
      const tail = data.slice(PANIC_SELECTOR.length);
      if (/^[0-9a-fA-F]{64}$/.test(tail) && BigInt(`0x${tail}`) === PANIC_ARITHMETIC_OVERFLOW) {
        return true;
      }
    }
    current = current.cause;
  }
  return false;
}
