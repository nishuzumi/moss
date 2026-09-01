import type { ActionCtx, Handle, ProtocolRef } from "@themoss/core";
import type { NadFunLensAbi } from "../src/abis/lens.js";
import type { NadFun } from "../src/index.js";

declare const nadfun: NadFun;
declare const ctx: ActionCtx;

type QuoteBuyParams = Parameters<NadFun["quoteBuy"]>[0];
type QuoteSellParams = Parameters<NadFun["quoteSell"]>[0];
type TokenStatusParams = Parameters<NadFun["tokenStatus"]>[0];

type BuyResult = Awaited<ReturnType<NadFun["quoteBuy"]>>;
type SellResult = Awaited<ReturnType<NadFun["quoteSell"]>>;
type TokenStatusResult = Awaited<ReturnType<NadFun["tokenStatus"]>>;

const TOKEN = "0xe85170a4303cBA6DD224628F5Aa052fb7FeB7777" as const;

// Valid parameter usage.
const buyParams: QuoteBuyParams = {
  token: TOKEN,
  amountIn: "1000000000000000000",
};

const sellParams: QuoteSellParams = {
  token: TOKEN,
  amountIn: "1000",
};

const statusParams: TokenStatusParams = {
  token: TOKEN,
};

// Results are inferred from the concrete method return types.
const buyResult: BuyResult = {
  side: "buy",
  token: TOKEN,
  amountIn: "1000000000000000000",
  router: TOKEN,
  amountOut: "11802",
};

const sellResult: SellResult = {
  side: "sell",
  token: TOKEN,
  amountIn: "1000",
  router: TOKEN,
  amountOut: "2500",
};

const tokenStatusResult: TokenStatusResult = {
  token: TOKEN,
  graduated: false,
  locked: true,
  progressBps: "7500",
};

// Positive: side is the exact literal expected by each method.
const exactBuySide: "buy" = buyResult.side;
const exactSellSide: "sell" = sellResult.side;

// Negative: sides are not interchangeable.
// @ts-expect-error buy side is not "sell"
const buyAsSell: "sell" = buyResult.side;

// @ts-expect-error sell side is not "buy"
const sellAsBuy: "buy" = sellResult.side;

// Negative: amountIn rejects number inputs.
const numericAmount: QuoteBuyParams = {
  token: TOKEN,
  // @ts-expect-error amountIn must be a string
  amountIn: 42,
};

// Negative: missing required fields.
// @ts-expect-error token is required
const missingToken: QuoteBuyParams = {
  amountIn: "1",
};

// @ts-expect-error amountIn is required
const missingAmount: QuoteSellParams = {
  token: TOKEN,
};

// Real ProtocolRef usage: injected references expose Query methods, not Handles.
const dependency = null as unknown as ProtocolRef<NadFun>;

void dependency.quoteBuy({ token: TOKEN, amountIn: "1" });
void dependency.quoteSell({ token: TOKEN, amountIn: "1" });
void dependency.tokenStatus({ token: TOKEN });

// @ts-expect-error Injected Protocol references expose methods, not Handles.
void dependency.lens;

// Handle type checks against the vendored Lens ABI.
function handleFixture(handle: Handle<typeof NadFunLensAbi>) {
  handle.read.getAmountOut([TOKEN, 1n, true]);
  handle.read.getAmountOut([TOKEN, 1n, false]);

  handle.read.isGraduated([TOKEN]);
  handle.read.isLocked([TOKEN]);
  handle.read.getProgress([TOKEN]);

  // @ts-expect-error Lens has no unknownQuery function.
  handle.read.unknownQuery([TOKEN]);

  handle.read.getAmountOut([
    TOKEN,
    1n,
    // @ts-expect-error getAmountOut requires a boolean side flag.
    "true",
  ]);
}

void nadfun;
void ctx;
void buyParams;
void sellParams;
void statusParams;
void buyResult;
void sellResult;
void tokenStatusResult;
void exactBuySide;
void exactSellSide;
void buyAsSell;
void sellAsBuy;
void numericAmount;
void missingToken;
void missingAmount;
void handleFixture;
