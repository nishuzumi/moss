import { decodeFunctionData, getAddress, hexToBigInt, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";
import { PendleRouterAbi } from "../src/abis/pendle.js";
import { PENDLE_ROUTER_ADDRESS } from "../src/addresses.js";
import { buildPendleSwapPlan } from "../src/swap-builder.js";
import type { PendleBuyPtQuote, PendleSellPtQuote } from "../src/types.js";

const MARKET = getAddress("0x1111111111111111111111111111111111111111");
const PT = getAddress("0x3333333333333333333333333333333333333333");
const UNDERLYING = getAddress("0x5555555555555555555555555555555555555555");
const RECEIVER = getAddress("0x7777777777777777777777777777777777777777");
const ROUTER = getAddress(PENDLE_ROUTER_ADDRESS);

const APPROX = Object.freeze({
  guessMin: 1_004_036n,
  guessMax: 1_034_309n,
  guessOffchain: 1_009_082n,
  maxIteration: 30n,
  eps: 10_000_000_000_000n,
});

const BUY_QUOTE: PendleBuyPtQuote = Object.freeze({
  direction: "buy-pt",
  market: MARKET,
  tokenIn: UNDERLYING,
  tokenOut: PT,
  amountIn: 1_000_000n,
  expectedOut: 1_009_082n,
  minOut: 1_004_036n,
  slippageBps: 50,
  decimals: Object.freeze({ in: 6, out: 6 }),
  approxParams: APPROX,
});

const SELL_QUOTE: PendleSellPtQuote = Object.freeze({
  direction: "sell-pt",
  market: MARKET,
  tokenIn: PT,
  tokenOut: UNDERLYING,
  amountIn: 1_000_000n,
  expectedOut: 990_548n,
  minOut: 985_595n,
  slippageBps: 50,
  decimals: Object.freeze({ in: 6, out: 6 }),
});

describe("Pendle swap builder", () => {
  it("builds a direct buy-PT Router transaction with an empty simple route", () => {
    const plan = buildPendleSwapPlan(BUY_QUOTE, RECEIVER);

    expect(plan.direction).toBe("buy-pt");
    expect(plan.transaction.kind).toBe("transaction");
    expect(getAddress(plan.transaction.transaction.to)).toBe(ROUTER);
    expect(getAddress(plan.transaction.transaction.from)).toBe(RECEIVER);
    expect(hexToBigInt(plan.transaction.transaction.value)).toBe(0n);

    const decoded = decodeFunctionData({
      abi: PendleRouterAbi,
      data: plan.transaction.transaction.data,
    });
    expect(decoded.functionName).toBe("swapExactTokenForPt");
    // biome-ignore lint/suspicious/noExplicitAny: decoded ABI tuple is asserted field-by-field
    const [receiver, market, minPtOut, guessPtOut, input, limit] = decoded.args as readonly any[];
    expect(getAddress(receiver)).toBe(RECEIVER);
    expect(getAddress(market)).toBe(MARKET);
    expect(minPtOut).toBe(BUY_QUOTE.minOut);
    expect(guessPtOut).toMatchObject(APPROX);
    expect(getAddress(input.tokenIn)).toBe(UNDERLYING);
    expect(input.netTokenIn).toBe(BUY_QUOTE.amountIn);
    expect(getAddress(input.tokenMintSy)).toBe(UNDERLYING);
    expect(getAddress(input.pendleSwap)).toBe(zeroAddress);
    expect(input.swapData.swapType).toBe(0);
    expect(getAddress(input.swapData.extRouter)).toBe(zeroAddress);
    expect(input.swapData.extCalldata).toBe("0x");
    expect(input.swapData.needScale).toBe(false);
    expectEmptyLimit(limit);
  });

  it("builds a direct sell-PT Router transaction with an empty simple route", () => {
    const plan = buildPendleSwapPlan(SELL_QUOTE, RECEIVER);

    expect(plan.direction).toBe("sell-pt");
    expect(getAddress(plan.transaction.transaction.to)).toBe(ROUTER);
    expect(hexToBigInt(plan.transaction.transaction.value)).toBe(0n);

    const decoded = decodeFunctionData({
      abi: PendleRouterAbi,
      data: plan.transaction.transaction.data,
    });
    expect(decoded.functionName).toBe("swapExactPtForToken");
    // biome-ignore lint/suspicious/noExplicitAny: decoded ABI tuple is asserted field-by-field
    const [receiver, market, exactPtIn, output, limit] = decoded.args as readonly any[];
    expect(getAddress(receiver)).toBe(RECEIVER);
    expect(getAddress(market)).toBe(MARKET);
    expect(exactPtIn).toBe(SELL_QUOTE.amountIn);
    expect(getAddress(output.tokenOut)).toBe(UNDERLYING);
    expect(output.minTokenOut).toBe(SELL_QUOTE.minOut);
    expect(getAddress(output.tokenRedeemSy)).toBe(UNDERLYING);
    expect(getAddress(output.pendleSwap)).toBe(zeroAddress);
    expect(output.swapData.swapType).toBe(0);
    expect(output.swapData.extCalldata).toBe("0x");
    expect(output.swapData.needScale).toBe(false);
    expectEmptyLimit(limit);
  });

  it("requires approving the Router to spend the input token", () => {
    expect(buildPendleSwapPlan(BUY_QUOTE, RECEIVER).approval).toEqual({
      token: UNDERLYING,
      spender: ROUTER,
      amount: 1_000_000n,
    });
    expect(buildPendleSwapPlan(SELL_QUOTE, RECEIVER).approval).toEqual({
      token: PT,
      spender: ROUTER,
      amount: 1_000_000n,
    });
  });
});

// biome-ignore lint/suspicious/noExplicitAny: decoded ABI tuple is asserted field-by-field
function expectEmptyLimit(limit: any): void {
  expect(getAddress(limit.limitRouter)).toBe(zeroAddress);
  expect(limit.epsSkipMarket).toBe(0n);
  expect(limit.normalFills).toEqual([]);
  expect(limit.flashFills).toEqual([]);
  expect(limit.optData).toBe("0x");
}
