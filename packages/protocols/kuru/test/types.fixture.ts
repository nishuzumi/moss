import { type ActionCtx, NATIVE } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type { Kuru } from "../src/index.js";

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
