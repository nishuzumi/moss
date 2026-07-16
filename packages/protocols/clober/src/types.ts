import type { AddressValue } from "@themoss/core";
import type { ERC20Outcome } from "@themoss/erc";

export type CloberQuote = {
  amountIn: string;
  estimatedAmountSpent: string;
  estimatedAmountOut: string;
  minimumAmountOut: string;
};

export type CloberFill = {
  event: "Take";
  bookId: string;
  user: AddressValue;
  tick: string;
  unit: string;
};

export type CloberSwapOutcome = {
  operation: "swap";
  protocol: "clober";
  fills: readonly CloberFill[];
  settlements: readonly ERC20Outcome[];
};
