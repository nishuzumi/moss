import { getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import { PendleQuoteError, quoteVerifiedMarket } from "../src/market-quote.js";
import type {
  PendleApproxParams,
  PendleQuoteParams,
  PendleQuoteReader,
  PendleQuoteStage,
  VerifiedMarket,
} from "../src/types.js";

const MARKET = getAddress("0x1111111111111111111111111111111111111111");
const SY = getAddress("0x2222222222222222222222222222222222222222");
const PT = getAddress("0x3333333333333333333333333333333333333333");
const YT = getAddress("0x4444444444444444444444444444444444444444");
const UNDERLYING = getAddress("0x5555555555555555555555555555555555555555");
const OTHER_TOKEN = getAddress("0x6666666666666666666666666666666666666666");

const APPROX: PendleApproxParams = Object.freeze({
  guessMin: 10n,
  guessMax: 20n,
  guessOffchain: 15n,
  maxIteration: 30n,
  eps: 1_000_000_000_000_000n,
});

const NET_PT_OUT = 1_014_400n;
const NET_TOKEN_OUT = 985_200n;

describe("Pendle RouterStatic quote", () => {
  it("quotes buy PT with generated ApproxParams and a floored min out", async () => {
    const reader = mockReader();
    const quote = await quoteVerifiedMarket(reader, verifiedMarket(), {
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: 1_000_000n,
      slippageBps: 50,
    });

    expect(quote).toMatchObject({
      direction: "buy-pt",
      market: MARKET,
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: 1_000_000n,
      expectedOut: NET_PT_OUT,
      minOut: 1_009_328n, // floor(1_014_400 * 9950 / 10000)
      slippageBps: 50,
      decimals: { in: 6, out: 6 },
      approxParams: APPROX,
    });
    expect(Object.isFrozen(quote)).toBe(true);
    expect(reader.quoteExactTokenForPt).toHaveBeenCalledTimes(1);
    expect(reader.quoteExactPtForToken).not.toHaveBeenCalled();
  });

  it("maps caller slippageBps to a 1e18-scaled slippage for ApproxParams generation", async () => {
    const reader = mockReader();
    await quoteVerifiedMarket(reader, verifiedMarket(), {
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: 1_000_000n,
      slippageBps: 50,
    });

    // 50 bps == 0.005 == 5e15 in 1e18 fixed point.
    expect(reader.quoteExactTokenForPt).toHaveBeenCalledWith(
      MARKET,
      UNDERLYING,
      1_000_000n,
      5_000_000_000_000_000n,
    );
  });

  it("quotes sell PT without ApproxParams", async () => {
    const reader = mockReader();
    const quote = await quoteVerifiedMarket(reader, verifiedMarket(), {
      tokenIn: PT,
      tokenOut: UNDERLYING,
      amountIn: 1_000_000n,
      slippageBps: 100,
    });

    expect(quote).toMatchObject({
      direction: "sell-pt",
      tokenIn: PT,
      tokenOut: UNDERLYING,
      expectedOut: NET_TOKEN_OUT,
      minOut: 975_348n, // floor(985_200 * 9900 / 10000)
      decimals: { in: 6, out: 6 },
    });
    expect("approxParams" in quote).toBe(false);
    expect(reader.quoteExactPtForToken).toHaveBeenCalledWith(MARKET, 1_000_000n, UNDERLYING);
    expect(reader.quoteExactTokenForPt).not.toHaveBeenCalled();
  });

  it("returns the exact expected out as min out when slippage is zero", async () => {
    const quote = await quoteVerifiedMarket(mockReader(), verifiedMarket(), {
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: 1_000_000n,
      slippageBps: 0,
    });

    expect(quote.minOut).toBe(NET_PT_OUT);
  });

  it("rejects a buy quote whose protective minimum output would be zero at 100% slippage", async () => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1_000_000n, slippageBps: 10_000 },
      "min-out",
      verifiedMarket(),
    );
  });

  it("rejects a sell quote whose protective minimum output would be zero at 100% slippage", async () => {
    await expectFailure(
      { tokenIn: PT, tokenOut: UNDERLYING, amountIn: 1_000_000n, slippageBps: 10_000 },
      "min-out",
      verifiedMarket(),
    );
  });

  it("rejects a quote whose protective minimum rounds down to zero on a tiny expected output", async () => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1n, slippageBps: 1 },
      "min-out",
      verifiedMarket(),
      mockReader({ quoteExactTokenForPt: async () => [1n, 0n, 0n, 0n, 0n, APPROX] }),
    );
  });

  it("rejects a quote whose RouterStatic expectation is itself zero", async () => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1_000_000n, slippageBps: 0 },
      "min-out",
      verifiedMarket(),
      mockReader({ quoteExactTokenForPt: async () => [0n, 0n, 0n, 0n, 0n, APPROX] }),
    );
  });

  it("carries decimals from the verified market for each direction", async () => {
    const market = verifiedMarket({ decimals: { underlying: 6, pt: 18 } });
    const buy = await quoteVerifiedMarket(mockReader(), market, {
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: 1_000_000n,
      slippageBps: 0,
    });
    const sell = await quoteVerifiedMarket(mockReader(), market, {
      tokenIn: PT,
      tokenOut: UNDERLYING,
      amountIn: 1_000_000n,
      slippageBps: 0,
    });

    expect(buy.decimals).toEqual({ in: 6, out: 18 });
    expect(sell.decimals).toEqual({ in: 18, out: 6 });
  });

  it.each([
    ["underlying to underlying", UNDERLYING, UNDERLYING],
    ["pt to pt", PT, PT],
    ["unrelated token in", OTHER_TOKEN, PT],
    ["unrelated token out", UNDERLYING, OTHER_TOKEN],
  ])("rejects an unsupported direction: %s", async (_name, tokenIn, tokenOut) => {
    await expectFailure(
      { tokenIn, tokenOut, amountIn: 1_000_000n, slippageBps: 50 },
      "direction",
      verifiedMarket(),
    );
  });

  it("rejects buying PT when the market does not support the underlying as token-in", async () => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1_000_000n, slippageBps: 50 },
      "direction",
      verifiedMarket({ tokenSupport: { underlyingIn: false } }),
    );
  });

  it("rejects selling PT when the market does not support the underlying as token-out", async () => {
    await expectFailure(
      { tokenIn: PT, tokenOut: UNDERLYING, amountIn: 1_000_000n, slippageBps: 50 },
      "direction",
      verifiedMarket({ tokenSupport: { underlyingOut: false } }),
    );
  });

  it.each([
    ["negative", -1],
    ["above 100%", 10_001],
    ["non-integer", 12.5],
    ["NaN", Number.NaN],
  ])("rejects invalid slippageBps: %s", async (_name, slippageBps) => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1_000_000n, slippageBps },
      "params",
      verifiedMarket(),
    );
  });

  it.each([
    ["zero", 0n],
    ["negative", -5n],
  ])("rejects a non-positive amountIn: %s", async (_name, amountIn) => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn, slippageBps: 50 },
      "params",
      verifiedMarket(),
    );
  });

  it("rejects a malformed RouterStatic buy result", async () => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1_000_000n, slippageBps: 50 },
      "router-static-read",
      verifiedMarket(),
      mockReader({ quoteExactTokenForPt: async () => ({ netPtOut: NET_PT_OUT }) }),
    );
  });

  it("rejects a buy result whose netPtOut is not a uint256", async () => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1_000_000n, slippageBps: 50 },
      "router-static-read",
      verifiedMarket(),
      mockReader({ quoteExactTokenForPt: async () => [-1n, 0n, 0n, 0n, 0n, APPROX] }),
    );
  });

  it("rejects a buy result with malformed ApproxParams", async () => {
    await expectFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1_000_000n, slippageBps: 50 },
      "router-static-read",
      verifiedMarket(),
      mockReader({
        quoteExactTokenForPt: async () => [NET_PT_OUT, 0n, 0n, 0n, 0n, { guessMin: 1n }],
      }),
    );
  });

  it("rejects a sell result whose netTokenOut is not a uint256", async () => {
    await expectFailure(
      { tokenIn: PT, tokenOut: UNDERLYING, amountIn: 1_000_000n, slippageBps: 50 },
      "router-static-read",
      verifiedMarket(),
      mockReader({ quoteExactPtForToken: async () => ["oops"] }),
    );
  });

  it("propagates a RouterStatic read failure with a bounded diagnostic", async () => {
    const error = await captureFailure(
      { tokenIn: UNDERLYING, tokenOut: PT, amountIn: 1_000_000n, slippageBps: 50 },
      verifiedMarket(),
      mockReader({
        quoteExactTokenForPt: async () => {
          throw new Error(`RPC read failed: ${"response-body ".repeat(100)}`);
        },
      }),
    );

    expect(error).toMatchObject({ name: "PendleQuoteError", stage: "router-static-read" });
    expect(error.message).toContain("RPC read failed");
    expect(error.message.length).toBeLessThan(600);
  });
});

function verifiedMarket(
  overrides: {
    decimals?: { underlying: number; pt: number };
    tokenSupport?: { underlyingIn?: boolean; underlyingOut?: boolean };
  } = {},
): VerifiedMarket {
  return Object.freeze({
    market: MARKET,
    factory: getAddress("0xA3cb62a49b66eB2536cf6F3C7AC82293784888A3"),
    sy: SY,
    pt: PT,
    yt: YT,
    underlying: UNDERLYING,
    decimals: Object.freeze(overrides.decimals ?? { underlying: 6, pt: 6 }),
    expiry: 2_000n,
    tokenSupport: Object.freeze({
      tokensIn: [UNDERLYING],
      tokensOut: [UNDERLYING, OTHER_TOKEN],
      underlyingIn: overrides.tokenSupport?.underlyingIn ?? true,
      underlyingOut: overrides.tokenSupport?.underlyingOut ?? true,
    }),
  }) as VerifiedMarket;
}

type MockReader = {
  quoteExactTokenForPt: ReturnType<typeof vi.fn>;
  quoteExactPtForToken: ReturnType<typeof vi.fn>;
};

function mockReader(overrides: Partial<PendleQuoteReader> = {}): MockReader {
  return {
    quoteExactTokenForPt: vi.fn(
      overrides.quoteExactTokenForPt ?? (async () => [NET_PT_OUT, 0n, 0n, 0n, 0n, APPROX]),
    ),
    quoteExactPtForToken: vi.fn(
      overrides.quoteExactPtForToken ?? (async () => [NET_TOKEN_OUT, 0n, 0n, 0n, 0n]),
    ),
  };
}

async function expectFailure(
  params: PendleQuoteParams,
  stage: PendleQuoteStage,
  market: VerifiedMarket,
  reader: PendleQuoteReader = mockReader(),
): Promise<void> {
  const error = await captureFailure(params, market, reader);
  expect(error).toBeInstanceOf(PendleQuoteError);
  expect(error).toMatchObject({ name: "PendleQuoteError", stage });
  expect(error.message).toContain(stage);
}

async function captureFailure(
  params: PendleQuoteParams,
  market: VerifiedMarket,
  reader: PendleQuoteReader,
): Promise<PendleQuoteError> {
  try {
    await quoteVerifiedMarket(reader, market, params);
  } catch (error) {
    if (error instanceof PendleQuoteError) return error;
    throw error;
  }
  throw new Error("expected Pendle quote to fail");
}
