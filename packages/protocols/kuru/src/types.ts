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
  /**
   * Order prices are humanPrice * pricePrecision and must be a multiple of
   * tickSize (contract reverts with TickSizeError otherwise). Verified against
   * @kuru-labs/kuru-sdk GTC.placeLimit and live mainnet orders (2026-07-17).
   */
  tickSize: bigint;
  /** Inclusive bounds for order size in sizePrecision units. */
  minSize: bigint;
  maxSize: bigint;
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

/**
 * Outcome of a post-only limit order. postOnly guarantees the order cannot
 * take liquidity, so exactly one OrderCreated event backs every field.
 */
export type KuruLimitOrderOutcome = {
  operation: "limitOrder";
  protocol: "kuru";
  market: AddressValue;
  orderId: string;
  owner: AddressValue;
  /** Resting size in Kuru sizePrecision units. */
  size: string;
  /** Resting price in Kuru pricePrecision units. */
  price: string;
  isBuy: boolean;
};

export type KuruMarginDepositOutcome = {
  operation: "depositMargin";
  protocol: "kuru";
  marginAccount: AddressValue;
  user: AddressValue;
  token: TokenRef;
  /** Deposited amount in the token's base units. */
  amount: string;
};
