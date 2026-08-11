import type { AddressValue, TokenRef } from "@themoss/core";

export type BeetsSwapOutcome = {
  operation: "swap";
  pool: AddressValue;
  tokenIn: TokenRef;
  tokenOut: TokenRef;
  amountIn: string;
  amountOut: string;
  swapFeePercentage: string;
  swapFeeAmount: string;
};

export type BeetsLiquidityOutcome = {
  operation: "addLiquidity" | "removeLiquidity";
  pool: AddressValue;
  provider: AddressValue;
  kind: number;
  /** Raw per-token amounts in the pool's canonical token order (see pool).
   * The pure Receipt parser cannot resolve token addresses by itself, so
   * names come from the `pool` Query for the same pool. */
  amounts: readonly string[];
  swapFees: readonly string[];
  totalBptSupply: string;
};

export type BeetsSwapQuote =
  | {
      pool: AddressValue;
      amountSide: "amountIn";
      tokenIn: TokenRef;
      tokenOut: TokenRef;
      amountIn: string;
      estimatedAmountOut: string;
      minimumAmountOut: string;
    }
  | {
      pool: AddressValue;
      amountSide: "amountOut";
      tokenIn: TokenRef;
      tokenOut: TokenRef;
      estimatedAmountIn: string;
      maximumAmountIn: string;
      amountOut: string;
    };
