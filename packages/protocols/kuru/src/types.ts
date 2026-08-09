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
 * A Query result is passed through the framework's JSON-safe coercion, which reduces an Error to
 * an empty object; the thrown {@link KuruQuoteError} never crosses that boundary and so keeps the
 * live Error and its cause chain. Reporting a string here is what actually reaches the caller.
 */
export type KuruUnavailableEvaluation = {
  readonly path: readonly TokenRef[];
  readonly reason: string;
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
