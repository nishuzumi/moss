/**
 * Compile-time fixture proving swap parameter types are correctly inferred
 * and invalid parameters are rejected by the TypeScript compiler.
 *
 * This is a .ts file that is included in the tsconfig "include" array.
 * It is compiled (not executed) — type errors here are compile-time errors.
 */

import { NATIVE } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type { UniswapV4 } from "../src/adapter.js";
import type { SwapOutcome } from "../src/types.js";

// ---------------------------------------------------------------------------
// SwapOutcome type verification — these compile-time checks prove the type
// has the expected shape. Unused variables are prefixed with _ to avoid
// lint warnings while still being type-checked.
// ---------------------------------------------------------------------------

/** Verify SwapOutcome has the protocol field for identification */
const _swapOutcome: SwapOutcome = {
  operation: "swap",
  protocol: "uniswap-v4",
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1000000000000000000",
  amountOut: "980000000",
  fee: 3000,
  zeroForOne: true,
};

/** Verify SwapOutcome protocol field is always "uniswap-v4" */
const _protocolType: SwapOutcome["protocol"] = "uniswap-v4";

// ---------------------------------------------------------------------------
// Valid swap params compile — these prove inference works correctly
// ---------------------------------------------------------------------------

// Valid native-input swap params
const _validNativeInput: Parameters<UniswapV4["swap"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1.5",
  slippageBps: 50,
  hookData: "0x",
};

/** Valid swap params — ERC20 input, native output */
const _validErc20Input: Parameters<UniswapV4["swap"]>[0] = {
  tokenIn: USDC_ADDRESS,
  tokenOut: NATIVE,
  amountIn: "100",
  slippageBps: 100,
  hookData: "0x",
};

// ---------------------------------------------------------------------------
// Invalid params should be rejected at compile time
// ---------------------------------------------------------------------------

/** @ts-expect-error tokenIn is required */
const _missingTokenIn: Parameters<UniswapV4["swap"]>[0] = {
  tokenOut: NATIVE,
  amountIn: "1",
  slippageBps: 50,
  hookData: "0x",
};

/** @ts-expect-error tokenOut is required */
const _missingTokenOut: Parameters<UniswapV4["swap"]>[0] = {
  tokenIn: NATIVE,
  amountIn: "1",
  slippageBps: 50,
  hookData: "0x",
};

/** @ts-expect-error amountIn is required */
const _missingAmount: Parameters<UniswapV4["swap"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  slippageBps: 50,
  hookData: "0x",
};

// Note: slippageBps runtime validation (number type) and amountIn regex validation
// are enforced at runtime by Zod, not at compile time.
