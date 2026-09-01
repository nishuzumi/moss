import { type ActionCtx, NATIVE, type TokenRef } from "@themoss/core";
import type { PancakeSwap } from "../src/index.js";

declare const pancakeswap: PancakeSwap;
declare const ctx: ActionCtx;

// Valid: all params match the declared schema.
void pancakeswap.swap(
  {
    tokenIn: "native",
    tokenOut: "0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb",
    amount: "1",
    fee: 3000,
    slippage: 50,
  },
  ctx,
);

void pancakeswap.quote(
  {
    tokenIn: "native",
    tokenOut: "0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb",
    amount: "1",
    fee: 3000,
    slippage: 50,
  },
  ctx,
);

// @ts-expect-error ReceiptResult has no .protocol; Core stamps that.
void (null as unknown as ReturnType<PancakeSwap["swapReceipt"]>).protocol;

// #181: a native-input swap Receipt carries the NATIVE sentinel as tokenIn, so
// the Outcome's tokenIn is TokenRef (Address | typeof NATIVE), wider than a bare
// Address. Both directions are checked so a silent regression to Address fails.
declare const swapReceipt: ReturnType<PancakeSwap["swapReceipt"]>;
void (swapReceipt.outcome.tokenIn satisfies TokenRef);
void (NATIVE satisfies TokenRef);
// @ts-expect-error tokenIn may be the NATIVE sentinel, so it is no longer a bare Address.
void (swapReceipt.outcome.tokenIn satisfies `0x${string}`);
