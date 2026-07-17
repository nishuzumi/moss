import { type ActionCtx, type CapabilityNode, NATIVE, type ProtocolRef } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type { Kuru } from "../src/index.js";
import type { KuruLimitOrderOutcome, KuruMarginDepositOutcome } from "../src/types.js";

declare const kuru: Kuru;
declare const ctx: ActionCtx;
declare const ref: ProtocolRef<Kuru>;

void kuru.swap({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: "1" }, ctx);
void kuru.quote({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountOut: "1" }, ctx);

// @ts-expect-error exactly one amount side is required
const missingAmount: Parameters<Kuru["swap"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
};
void kuru.swap(missingAmount, ctx);

// @ts-expect-error amountIn and amountOut are mutually exclusive
const conflictingAmounts: Parameters<Kuru["quote"]>[0] = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  amountOut: "1",
};
void kuru.quote(conflictingAmounts, ctx);

// --- limit orders ---

void kuru.limitOrder(
  { tokenIn: NATIVE, tokenOut: USDC_ADDRESS, market: USDC_ADDRESS, amount: "1", price: "0.05" },
  ctx,
);
// The market override is optional; the committed amount and price never are.
void kuru.limitOrder({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amount: "1", price: "0.05" }, ctx);

// @ts-expect-error prices are human decimal strings, not numbers
void kuru.limitOrder({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amount: "1", price: 0.05 }, ctx);

// @ts-expect-error the committed amount is required
void kuru.limitOrder({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, price: "0.05" }, ctx);

void kuru.limitOrder(
  // @ts-expect-error the market override must be an address string
  { tokenIn: NATIVE, tokenOut: USDC_ADDRESS, market: 5, amount: "1", price: "1" },
  ctx,
);

// @ts-expect-error order lookups are market-addressed; token pairs cannot identify one
void kuru.orderStatus({ tokenIn: NATIVE, tokenOut: USDC_ADDRESS, orderId: "1" }, ctx);

async function limitOrderInference() {
  // Through a ProtocolRef, capabilities build typed CapabilityNodes.
  const node: CapabilityNode = await ref.limitOrder({
    tokenIn: NATIVE,
    tokenOut: USDC_ADDRESS,
    amount: "1",
    price: "0.05",
  });
  void node;
  const deposit: CapabilityNode = await ref.depositMargin({ token: NATIVE, amount: "1" });
  void deposit;
  // @ts-expect-error deposit amounts are human decimal strings, not bigints
  await ref.depositMargin({ token: NATIVE, amount: 1n });

  const balance = await ref.marginBalance({ token: USDC_ADDRESS });
  const balanceUnits: string = balance.balance;
  void balanceUnits;

  const status = await ref.orderStatus({ market: USDC_ADDRESS, orderId: "1" });
  const statusValue: "open" | "gone" = status.status;
  void statusValue;
}
void limitOrderInference;

const limitOutcome: KuruLimitOrderOutcome = kuru.limitOrderReceipt([]).outcome;
const restingOrderId: string = limitOutcome.orderId;
void restingOrderId;
// @ts-expect-error postOnly orders never trade, so the outcome carries no fills
void limitOutcome.fills;

const depositOutcome: KuruMarginDepositOutcome = kuru.depositMarginReceipt([]).outcome;
void depositOutcome;
// @ts-expect-error a margin deposit outcome is not a limit order outcome
const wrongOutcome: KuruLimitOrderOutcome = kuru.depositMarginReceipt([]).outcome;
void wrongOutcome;
