import type { ActionCtx } from "@themoss/core";
import type { Pendle } from "../src/index.js";
import type { PendleQuote, PendleSwapOutcome } from "../src/types.js";

declare const pendle: Pendle;
declare const ctx: ActionCtx;

const MARKET = "0x1519fb0d8885020387FCD6a67bC888a168a40afA";
const UNDERLYING = "0x0Bb150DFa86EA5d7742F07FEfCD8E8edA81D64eF";
const PT = "0xf104C6Cd68f81579C6a1D85849cB12Fcc64bD72A";

// Valid usage: swap takes params + context, quote takes params, markets takes none.
void pendle.swap(
  { market: MARKET, tokenIn: UNDERLYING, tokenOut: PT, amountIn: "1", slippageBps: 50 },
  ctx,
);
void pendle.quote({
  market: MARKET,
  tokenIn: PT,
  tokenOut: UNDERLYING,
  amountIn: "1",
  slippageBps: 50,
});
void pendle.markets();

void pendle.swap(
  {
    market: MARKET,
    tokenIn: UNDERLYING,
    tokenOut: PT,
    // @ts-expect-error amountIn is a decimal string, not a number
    amountIn: 1,
    slippageBps: 50,
  },
  ctx,
);

void pendle.quote({
  market: MARKET,
  tokenIn: UNDERLYING,
  tokenOut: PT,
  amountIn: "1",
  // @ts-expect-error slippageBps is an integer, not a string
  slippageBps: "50",
});

// @ts-expect-error market is a required parameter
const missingMarket: Parameters<Pendle["swap"]>[0] = {
  tokenIn: UNDERLYING,
  tokenOut: PT,
  amountIn: "1",
  slippageBps: 50,
};
void missingMarket;

// A PendleQuote exposes approxParams only after narrowing to the buy direction.
declare const quote: PendleQuote;
if (quote.direction === "buy-pt") {
  void quote.approxParams.guessMin;
}
// @ts-expect-error approxParams exists only on the buy-pt branch of the union
void quote.approxParams;

// PendleSwapOutcome is a typed, JSON-safe swap result with a fixed operation literal.
const outcome: PendleSwapOutcome = {
  operation: "swap",
  protocol: "pendle",
  direction: "sell-pt",
  market: MARKET,
  token: UNDERLYING,
  caller: MARKET,
  receiver: MARKET,
  amountIn: "1",
  amountOut: "1",
};
void outcome;

const wrongOutcome: PendleSwapOutcome = {
  ...outcome,
  // @ts-expect-error operation is the literal "swap"
  operation: "transfer",
};
void wrongOutcome;
