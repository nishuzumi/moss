import { type ActionCtx, NATIVE, type TokenRef } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type {
  Kuru,
  KuruQuoteError,
  KuruQuoteErrorCode,
  KuruUnavailableEvaluation,
} from "../src/index.js";

declare const kuru: Kuru;
declare const ctx: ActionCtx;

void kuru.swap({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: "1" }, ctx);
void kuru.quote({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountOut: "1" }, ctx);

// @ts-expect-error exactly one amount side is required
const missingAmount: Parameters<Kuru["swap"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
};
void kuru.swap(missingAmount, ctx);

// @ts-expect-error amountIn and amountOut are mutually exclusive
const conflictingAmounts: Parameters<Kuru["quote"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  amountOut: "1",
};
void kuru.quote(conflictingAmounts, ctx);

// ── KuruQuoteError: the code is part of the published contract ───────────────
// A consumer branches on `code`. These pin that the four published members still exist and that
// the union admits nothing outside them; removing one breaks the list below. Adding a fifth is
// not caught here — TypeScript has no exhaustiveness check for a bare union — so a new member
// still needs a deliberate decision rather than a silent widening.

declare const quoteError: KuruQuoteError;
const code: KuruQuoteErrorCode = quoteError.code;
void code;

const everyCode: readonly KuruQuoteErrorCode[] = [
  "NO_VERIFIED_ROUTE",
  "NO_POSITIVE_QUOTE",
  "ROUTE_QUOTE_UNAVAILABLE",
  "TARGET_OUTPUT_UNSATISFIABLE",
];
void everyCode;

// @ts-expect-error the code union does not admit arbitrary strings
const unknownCode: KuruQuoteErrorCode = "SOMETHING_ELSE";
void unknownCode;

// @ts-expect-error side is amountIn or amountOut, not any string
const wrongSide: KuruQuoteError["side"] = "both";
void wrongSide;

// @ts-expect-error the retained failures are read-only
quoteError.unavailable = [];

// Each retained failure names the route it belongs to, in the same shape a quote returns.
const failedPath: readonly TokenRef[] | undefined = quoteError.unavailable[0]?.path;
void failedPath;

// ── KuruQuote: partiality is part of the published contract too ──────────────
// The gap list is what lets a caller refuse a partial comparison, so it must be reachable
// without a cast and must not be silently optional — an `unavailable?:` would let a consumer
// forget the check and still compile.

declare const quote: Awaited<ReturnType<Kuru["quote"]>>;
const gaps: readonly KuruUnavailableEvaluation[] = quote.unavailable;
void gaps;

// The reason is a string, not an Error: a Query result is JSON-coerced on the way out.
const reason: string | undefined = quote.unavailable[0]?.reason;
void reason;

// @ts-expect-error the gap list is read-only
quote.unavailable = [];

// @ts-expect-error a gap reports a message, not the live Error the thrown form keeps
const liveError: Error | undefined = quote.unavailable[0]?.error;
void liveError;
