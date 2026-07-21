import type { AddressValue, TokenRef } from "@themoss/core";

export type PancakeV2Quote =
  | {
      amountSide: "amountIn";
      amountIn: string;
      estimatedAmountOut: string;
      minimumAmountOut: string;
      path: readonly TokenRef[];
    }
  | {
      amountSide: "amountOut";
      estimatedAmountIn: string;
      maximumAmountIn: string;
      minimumAmountOut: string;
      path: readonly TokenRef[];
    };

export type PreparedV2Swap = {
  side: "amountIn" | "amountOut";
  path: readonly AddressValue[];
  estimatedAmountIn: bigint;
  executionAmountIn: bigint;
  estimatedAmountOut: bigint;
  minimumAmountOut: bigint;
  inputDecimals: number;
  outputDecimals: number;
};

export type PancakeV2SwapOutcome = {
  operation: "swap";
  protocol: "pancakeswap-v2";
  sender: AddressValue;
  recipient: AddressValue;
  tokenIn: TokenRef;
  tokenOut: TokenRef;
  amountIn: string;
  amountOut: string;
  pairs: readonly AddressValue[];
};
