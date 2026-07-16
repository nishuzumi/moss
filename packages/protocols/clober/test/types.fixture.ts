import { type ActionCtx, NATIVE } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type { Clober, CloberSwapParams } from "../src/index.js";

declare const clober: Clober;
declare const ctx: ActionCtx;

void clober.swap({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: "1" }, ctx);
void clober.quote({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: "1", slippage: 100 }, ctx);

// @ts-expect-error amountIn is required for exact-input swaps
const missingAmount: CloberSwapParams = { tokenIn: NATIVE, tokenOut: USDC_ADDRESS };
void clober.swap(missingAmount, ctx);

// @ts-expect-error symbols are not Token references
void clober.quote({ tokenIn: "MON", tokenOut: USDC_ADDRESS, amountIn: "1" }, ctx);

// @ts-expect-error ABI-generic Handles expose only real Controller functions
void clober.controller.notAControllerFunction();
