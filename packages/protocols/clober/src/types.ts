import type { AddressValue, TokenRef } from "@themoss/core";
import type { ERC20Outcome } from "@themoss/erc";

export type CloberQuote = {
  maximumAmountIn: string;
  estimatedAmountSpent: string;
  estimatedAmountOut: string;
  minimumAmountOut: string;
};

export type CloberFill = {
  event: "Take";
  bookId: string;
  controller: AddressValue;
  tick: string;
  unit: string;
};

export type CloberTransferSettlement = Extract<ERC20Outcome, { operation: "transfer" }>;

export type CloberSwapOutcome = {
  operation: "swap";
  protocol: "clober";
  user: AddressValue;
  tokenIn: TokenRef;
  tokenOut: TokenRef;
  actualAmountIn: string;
  actualAmountOut: string;
  refundedAmountIn: string;
  fills: readonly CloberFill[];
  settlements: readonly CloberTransferSettlement[];
};
