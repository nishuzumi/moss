import type { AddressValue, Handle, TokenRef } from "@themoss/core";
import type { KuruOrderbookAbi } from "./abis/kuru.js";

export type KuruQuote =
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

export type MarketParams = {
  pricePrecision: bigint;
  sizePrecision: bigint;
  baseAsset: AddressValue;
  baseDecimals: number;
  quoteAsset: AddressValue;
  quoteDecimals: number;
};

export type MarketCandidate = {
  address: AddressValue;
  base: AddressValue;
  quote: AddressValue;
};

export type VerifiedMarket = {
  address: AddressValue;
  handle: Handle<typeof KuruOrderbookAbi>;
  params: MarketParams;
};

export type RouteLeg = {
  market: VerifiedMarket;
  input: TokenRef;
  output: TokenRef;
  inputDecimals: number;
  outputDecimals: number;
  isBuy: boolean;
  nativeSend: boolean;
};

export type Route = readonly RouteLeg[];

export type PreparedSwap = {
  side: "amountIn" | "amountOut";
  route: Route;
  estimatedAmountIn: bigint;
  executionAmountIn: bigint;
  estimatedAmountOut: bigint;
  minimumAmountOut: bigint;
  inputDecimals: number;
  outputDecimals: number;
};

export type KuruSwapOutcome = {
  operation: "swap";
  protocol: "kuru";
  sender: AddressValue;
  tokenIn: TokenRef;
  tokenOut: TokenRef;
  amountIn: string;
  amountOut: string;
};
