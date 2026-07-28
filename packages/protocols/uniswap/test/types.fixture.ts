import { type ActionCtx, type Handle, NATIVE, type ProtocolRef } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type { UniversalRouterAbi } from "../src/abis/uniswap.js";
import type { Uniswap } from "../src/index.js";

declare const uniswap: Uniswap;
declare const ctx: ActionCtx;

void uniswap.swap({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: "1" }, ctx);
void uniswap.swap({ tokenIn: USDC_ADDRESS, tokenOut: NATIVE, amountIn: "1.5", slippage: 100 }, ctx);
void uniswap.quote({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: "1" }, ctx);
void uniswap.permit2Approve({ token: USDC_ADDRESS, amount: "1000000", expiration: "0" });

// @ts-expect-error amountIn is required
const missingAmount: Parameters<Uniswap["swap"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
};
void uniswap.swap(missingAmount, ctx);

// @ts-expect-error amounts are display-unit decimal strings, not numbers
void uniswap.quote({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: 1 }, ctx);

// @ts-expect-error native MON needs no Permit2 allowance; token is an address
void uniswap.permit2Approve({ token: NATIVE, amount: "1", expiration: "0" });

const dependency = null as unknown as ProtocolRef<Uniswap>;
void dependency.swap;
void dependency.quote;
dependency.swapReceipt([]).protocol satisfies string;
dependency.permit2ApproveReceipt([]).protocol satisfies string;
// @ts-expect-error injected Protocol references expose methods, not Handles
void dependency.router;

function handleFixture(handle: Handle<typeof UniversalRouterAbi>) {
  handle.execute(["0x10", ["0x"], 0n], { value: 1n });
  // @ts-expect-error ABI-generic Handles reject unknown contract methods
  handle.swapExactTokensForTokens([]);
  // @ts-expect-error execute takes packed command bytes, not a number
  handle.execute([16, ["0x"], 0n]);
}

void handleFixture;
