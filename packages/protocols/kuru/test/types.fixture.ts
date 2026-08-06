import { type ActionCtx, NATIVE } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import {
  type Kuru,
  KuruQuoteError,
  type KuruQuoteErrorCode,
  type KuruRouteQuoteFailure,
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

const noVerifiedRoute: KuruQuoteErrorCode = "NO_VERIFIED_ROUTE";
const noPositiveQuote: KuruQuoteErrorCode = "NO_POSITIVE_QUOTE";
const routeQuoteUnavailable: KuruQuoteErrorCode = "ROUTE_QUOTE_UNAVAILABLE";
const targetOutputUnsatisfiable: KuruQuoteErrorCode = "TARGET_OUTPUT_UNSATISFIABLE";
void [noVerifiedRoute, noPositiveQuote, routeQuoteUnavailable, targetOutputUnsatisfiable];

const routeFailure: KuruRouteQuoteFailure = {
  path: [NATIVE, USDC_ADDRESS],
  markets: [USDC_ADDRESS],
  message: "market preview rejected",
};
const quoteError = new KuruQuoteError("ROUTE_QUOTE_UNAVAILABLE", "comparison incomplete", {
  failures: [routeFailure],
  cause: new Error("market preview rejected"),
});
const inferredCode: KuruQuoteErrorCode = quoteError.code;
void inferredCode;

// @ts-expect-error unknown Kuru quote error code
new KuruQuoteError("UNKNOWN_QUOTE_FAILURE", "unknown");

// @ts-expect-error route failure context requires market addresses
const malformedFailure: KuruRouteQuoteFailure = {
  path: [NATIVE, USDC_ADDRESS],
  message: "missing markets",
};
void malformedFailure;

// @ts-expect-error public error code is readonly
quoteError.code = "NO_POSITIVE_QUOTE";
// @ts-expect-error public route failures are readonly
quoteError.failures = [];
// @ts-expect-error route failure message is readonly
routeFailure.message = "changed";
// @ts-expect-error route failure paths are readonly
routeFailure.path.push(NATIVE);
// @ts-expect-error route failure markets are readonly
routeFailure.markets.push(USDC_ADDRESS);
