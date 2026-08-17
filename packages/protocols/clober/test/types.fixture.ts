import { type ActionCtx, type Change, NATIVE, type ReceiptResult } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type {
  Clober,
  CloberQuote,
  CloberQuoteParams,
  CloberSwapOutcome,
  CloberSwapParams,
  CloberTransferSettlement,
} from "../src/index.js";

declare const clober: Clober;
declare const ctx: ActionCtx;

const quoteParams: CloberQuoteParams = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  slippage: 100,
};
const swapParams: CloberSwapParams = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
};
void clober.quote(quoteParams, ctx);
void clober.swap(swapParams, ctx);

// @ts-expect-error amountIn is required as the maximum input for a Clober swap.
const missingAmount: CloberSwapParams = { tokenIn: NATIVE, tokenOut: USDC_ADDRESS };
void clober.swap(missingAmount, ctx);

// @ts-expect-error symbols are not Token references.
void clober.quote({ tokenIn: "MON", tokenOut: USDC_ADDRESS, amountIn: "1" }, ctx);

// @ts-expect-error human token amounts are decimal strings, not numbers.
void clober.swap({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: 1 }, ctx);

// @ts-expect-error ABI-generic Handles expose only real Controller functions.
void clober.controller.notAControllerFunction();

const quoteResult: CloberQuote = {
  maximumAmountIn: "1",
  estimatedAmountSpent: "0.999",
  estimatedAmountOut: "2",
  minimumAmountOut: "1.99",
};
const actualQueryResult: Awaited<ReturnType<Clober["quote"]>> = quoteResult;
// @ts-expect-error Quote results expose the input cap as maximumAmountIn.
const obsoleteQuoteAmount = actualQueryResult.amountIn;
const invalidQuoteResult: CloberQuote = {
  maximumAmountIn: "1",
  // @ts-expect-error Query amounts remain JSON-safe decimal strings.
  estimatedAmountSpent: 1,
  estimatedAmountOut: "2",
  minimumAmountOut: "1.99",
};

const actualCapabilityResult: Awaited<ReturnType<Clober["swap"]>> = {
  kind: "transaction",
  transaction: {
    from: "0x1111111111111111111111111111111111111111",
    to: "0x2222222222222222222222222222222222222222",
    data: "0x",
    value: "0x0",
  },
};
// @ts-expect-error A Query result is not a Capability result.
const invalidCapabilityResult: Awaited<ReturnType<Clober["swap"]>> = quoteResult;

const transferSettlement: CloberTransferSettlement = {
  operation: "transfer",
  token: USDC_ADDRESS,
  from: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  amount: "1000000",
};
const invalidApprovalSettlement: CloberTransferSettlement = {
  // @ts-expect-error Clober settlements cannot contain ERC-20 approval outcomes.
  operation: "approve",
  token: USDC_ADDRESS,
  owner: "0x1111111111111111111111111111111111111111",
  spender: "0x2222222222222222222222222222222222222222",
  amount: "1000000",
};

const swapOutcome: CloberSwapOutcome = {
  operation: "swap",
  protocol: "clober",
  user: "0x1111111111111111111111111111111111111111",
  tokenIn: USDC_ADDRESS,
  tokenOut: NATIVE,
  actualAmountIn: "1000000",
  actualAmountOut: "2000000000000000000",
  refundedAmountIn: "0",
  fills: [],
  settlements: [transferSettlement],
};
const receiptResult: ReturnType<Clober["swapReceipt"]> = {
  kind: "receipt",
  outcome: swapOutcome,
  text: "compile fixture",
  changes: [],
};

type CloberReceiptName = {
  [K in keyof Clober]: Clober[K] extends (changes: readonly Change[]) => infer Result
    ? Result extends ReceiptResult
      ? K
      : never
    : never;
}[keyof Clober];
const receiptName: CloberReceiptName = "swapReceipt";
// @ts-expect-error quote is a Query, not a Receipt parser.
const invalidReceiptName: CloberReceiptName = "quote";

type ReceiptOperation = ReturnType<Clober["swapReceipt"]>["outcome"]["operation"];
const receiptOperation: ReceiptOperation = "swap";
// @ts-expect-error The Clober swap Receipt has one literal operation.
const invalidReceiptOperation: ReceiptOperation = "approve";
type ReceiptProtocol = ReturnType<Clober["swapReceipt"]>["outcome"]["protocol"];
const receiptProtocol: ReceiptProtocol = "clober";
// @ts-expect-error The Clober swap Receipt has one literal protocol.
const invalidReceiptProtocol: ReceiptProtocol = "other";

void actualQueryResult;
void obsoleteQuoteAmount;
void invalidQuoteResult;
void actualCapabilityResult;
void invalidCapabilityResult;
void transferSettlement;
void invalidApprovalSettlement;
void receiptResult;
void receiptName;
void invalidReceiptName;
void receiptOperation;
void invalidReceiptOperation;
void receiptProtocol;
void invalidReceiptProtocol;
