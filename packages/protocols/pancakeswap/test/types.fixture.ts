import type { ActionCtx } from "@themoss/core";
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
