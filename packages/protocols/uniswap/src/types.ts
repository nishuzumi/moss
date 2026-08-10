import type { AddressValue, TokenRef } from "@themoss/core";

/** One curated hookless pool candidate: a canonical Uniswap v4 fee tier. */
export type FeeTier = {
  /** Pool fee in hundredths of a basis point (pips). */
  fee: number;
  /** Tick spacing the canonical interface pairs with this fee. */
  tickSpacing: number;
};

export type PoolKey = {
  currency0: AddressValue;
  currency1: AddressValue;
  fee: number;
  tickSpacing: number;
  hooks: AddressValue;
};

export type UniswapQuote = {
  amountIn: string;
  estimatedAmountOut: string;
  minimumAmountOut: string;
  feeTier: number;
  tickSpacing: number;
  path: readonly TokenRef[];
};

export type PreparedSwap = {
  poolKey: PoolKey;
  zeroForOne: boolean;
  amountIn: bigint;
  quotedAmountOut: bigint;
  minimumAmountOut: bigint;
  inputDecimals: number;
};

export type UniswapSwapOutcome = {
  operation: "swap";
  protocol: "uniswap";
  recipient: AddressValue;
  tokenIn: TokenRef;
  tokenOut: TokenRef;
  amountIn: string;
  amountOut: string;
  fee: number;
};

export type Permit2ApprovalOutcome = {
  operation: "approve";
  token: AddressValue;
  owner: AddressValue;
  spender: AddressValue;
  amount: string;
  expiration: string;
};
