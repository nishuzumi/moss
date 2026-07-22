import { type ActionCtx, NATIVE } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type { PancakeSwapV2 } from "../src/index.js";

declare const pancakeswap: PancakeSwapV2;
declare const ctx: ActionCtx;

void pancakeswap.swap({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: "1" }, ctx);
void pancakeswap.quote({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountOut: "1" }, ctx);

// @ts-expect-error exactly one amount side is required
const missingAmount: Parameters<PancakeSwapV2["swap"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
};
void pancakeswap.swap(missingAmount, ctx);

// @ts-expect-error amountIn and amountOut are mutually exclusive
const conflictingAmounts: Parameters<PancakeSwapV2["quote"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  amountOut: "1",
};
void pancakeswap.quote(conflictingAmounts, ctx);

// @ts-expect-error Package-authored ReceiptResult has no Core-owned Protocol provenance.
void (null as unknown as ReturnType<PancakeSwapV2["swapReceipt"]>).protocol;
