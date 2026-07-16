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
  /** Kuru order prices are denominated in ticks: orderPrice = humanPrice * pricePrecision / tickSize. */
  tickSize: bigint;
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

/** One Trade event observed while a limit order crossed the book on placement. */
export type KuruOrderFill = {
  orderId: string;
  maker: AddressValue;
  price: string;
  filledSize: string;
};

export type KuruLimitOrderOutcome = {
  operation: "limitOrder";
  protocol: "kuru";
  market: AddressValue;
  /** null when the order fully filled on placement and nothing rested on the book. */
  orderId: string | null;
  owner: AddressValue | null;
  /** Resting size in Kuru sizePrecision units; null when nothing rested. */
  size: string | null;
  /** Resting tick price; null when nothing rested. */
  price: string | null;
  isBuy: boolean | null;
  fills: readonly KuruOrderFill[];
};
