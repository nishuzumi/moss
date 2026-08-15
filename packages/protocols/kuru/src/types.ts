import type { AddressValue, Handle, TokenRef } from "@themoss/core";
import type { KuruOrderbookAbi } from "./abis/kuru.js";

/**
 * A route evaluation that did not complete, and which route it was.
 *
 * The path is the same human-readable token list a successful quote returns, so a caller can see
 * which candidate went unmeasured without market addresses or SDK structures leaking out.
 */
export type KuruUnavailableRoute = {
  readonly path: readonly TokenRef[];
  readonly error: Error;
};

/**
 * The same gap as {@link KuruUnavailableRoute}, carrying a message instead of the Error.
 *
 * Reporting a category rather than an Error is the whole defence, not a convenience. The
 * framework's JSON-safe coercion blanks a *plain* Error to `{}`, but viem's errors carry the RPC
 * URL and the request body in enumerable fields, so one placed in a Query result would be
 * published in full — measured at 335 bytes including the endpoint key. Nothing behind this
 * catches it.
 */
/**
 * Why an evaluation did not complete, as a closed set of stable categories.
 *
 * Deliberately not the underlying message. Viem puts the RPC URL and the request body into
 * `HttpRequestError.message`, so an API key in the endpoint path — the usual shape for hosted
 * providers — would travel out through a successful Query and into MCP output. The live Error,
 * with its cause chain, stays on the thrown `KuruQuoteError`, which never crosses that boundary.
 */
export type KuruUnavailableReason =
  /** The request never completed: transport, timeout, provider refusal. */
  | "transport"
  /** The market reverted with nothing that attributes the failure to it. */
  | "reverted"
  /** Our own probe outgrew what the market can represent, so nothing was asked of the chain. */
  | "unencodable-probe"
  /** Anything else: kept distinct so an unclassified failure is not silently called transport. */
  | "unknown";

export type KuruUnavailableEvaluation = {
  readonly path: readonly TokenRef[];
  readonly reason: KuruUnavailableReason;
};

/**
 * `unavailable` is the comparison's own provenance: the verified candidates whose evaluation
 * never completed, so the winner below was picked from a subset. Empty means the comparison was
 * exhaustive. A caller that wants to refuse partial evidence checks it; one that wants a usable
 * price ignores it. Routes that completed and simply cannot reach the target are not listed —
 * those are answers, not gaps.
 */
type QuoteProvenance = {
  readonly unavailable: readonly KuruUnavailableEvaluation[];
};

export type KuruQuote =
  | (QuoteProvenance & {
      amountSide: "amountIn";
      amountIn: string;
      estimatedAmountOut: string;
      minimumAmountOut: string;
      path: readonly TokenRef[];
    })
  | (QuoteProvenance & {
      amountSide: "amountOut";
      estimatedAmountIn: string;
      maximumAmountIn: string;
      minimumAmountOut: string;
      path: readonly TokenRef[];
    });

export type MarketParams = {
  pricePrecision: bigint;
  sizePrecision: bigint;
  baseAsset: AddressValue;
  baseDecimals: number;
  quoteAsset: AddressValue;
  quoteDecimals: number;
};

export type MarketCandidate = {
  address: AddressValue;
  base: AddressValue;
  quote: AddressValue;
};

export type VerifiedMarket = {
  address: AddressValue;
  handle: Handle<typeof KuruOrderbookAbi>;
  params: MarketParams;
};

export type RouteLeg = {
  market: VerifiedMarket;
  input: TokenRef;
  output: TokenRef;
  inputDecimals: number;
  outputDecimals: number;
  isBuy: boolean;
  nativeSend: boolean;
};

export type Route = readonly RouteLeg[];

export type PreparedSwap = {
  side: "amountIn" | "amountOut";
  route: Route;
  estimatedAmountIn: bigint;
  executionAmountIn: bigint;
  estimatedAmountOut: bigint;
  minimumAmountOut: bigint;
  inputDecimals: number;
  outputDecimals: number;
  unavailable: readonly KuruUnavailableRoute[];
};

export type KuruSwapOutcome = {
  operation: "swap";
  protocol: "kuru";
  sender: AddressValue;
  tokenIn: TokenRef;
  tokenOut: TokenRef;
  amountIn: string;
  amountOut: string;
};
