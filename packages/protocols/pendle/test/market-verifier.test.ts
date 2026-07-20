import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { PENDLE_MARKET_FACTORY_ADDRESS } from "../src/addresses.js";
import { PendleMarketVerificationError, verifyMarketCandidate } from "../src/market-verifier.js";
import type { MarketVerificationReader, MarketVerificationStage } from "../src/types.js";

const MARKET = getAddress("0x1111111111111111111111111111111111111111");
const SY = getAddress("0x2222222222222222222222222222222222222222");
const PT = getAddress("0x3333333333333333333333333333333333333333");
const YT = getAddress("0x4444444444444444444444444444444444444444");
const UNDERLYING = getAddress("0x5555555555555555555555555555555555555555");
const OTHER_TOKEN = getAddress("0x6666666666666666666666666666666666666666");
const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000");
const EXPIRY = 2_000n;
const BLOCK_TIMESTAMP = 1_000n;

describe("Pendle market verifier", () => {
  it("returns immutable typed on-chain facts after every check passes", async () => {
    const verified = await verifyMarketCandidate(defaultReader(), { market: MARKET }, UNDERLYING);

    expect(verified).toEqual({
      market: MARKET,
      factory: PENDLE_MARKET_FACTORY_ADDRESS,
      sy: SY,
      pt: PT,
      yt: YT,
      underlying: UNDERLYING,
      decimals: {
        underlying: 6,
        pt: 18,
      },
      expiry: EXPIRY,
      tokenSupport: {
        tokensIn: [UNDERLYING],
        tokensOut: [UNDERLYING, OTHER_TOKEN],
        underlyingIn: true,
        underlyingOut: true,
      },
    });
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.decimals)).toBe(true);
    expect(Object.isFrozen(verified.tokenSupport)).toBe(true);
    expect(Object.isFrozen(verified.tokenSupport.tokensIn)).toBe(true);
    expect(Object.isFrozen(verified.tokenSupport.tokensOut)).toBe(true);
  });

  it("rejects the wrong chain", async () => {
    await expectFailure(defaultReader({ chainId: async () => 1 }), "chain", "reported 1");
  });

  it("rejects a market without bytecode", async () => {
    await expectFailure(
      defaultReader({ codeAt: async (address) => (address === MARKET ? undefined : "0x6000") }),
      "market-bytecode",
      "no deployed bytecode",
    );
  });

  it("rejects a market that the official V6 Factory has not registered", async () => {
    await expectFailure(
      defaultReader({ isValidMarket: async () => false }),
      "factory-registration",
      "isValidMarket returned false",
    );
  });

  it("rejects a market whose factory getter differs from the official V6 Factory", async () => {
    await expectFailure(
      defaultReader({ marketFactory: async () => OTHER_TOKEN }),
      "factory-getter",
      OTHER_TOKEN,
    );
  });

  it.each([
    ["zero SY", [ZERO_ADDRESS, PT, YT]],
    ["duplicate PT/YT", [SY, PT, PT]],
  ])("rejects invalid readTokens output: %s", async (_name, tokens) => {
    await expectFailure(
      defaultReader({ marketTokens: async () => tokens }),
      "read-tokens",
      "non-zero, distinct SY/PT/YT",
    );
  });

  it.each([
    ["SY", SY],
    ["PT", PT],
    ["YT", YT],
    ["underlying", UNDERLYING],
  ])("rejects a dynamic %s contract without bytecode", async (_name, missingAddress) => {
    await expectFailure(
      defaultReader({
        codeAt: async (address) => (address === missingAddress ? "0x" : "0x6000"),
      }),
      "dynamic-bytecode",
      missingAddress,
    );
  });

  it("rejects a claimed underlying that is not the SY yieldToken", async () => {
    await expectFailure(
      defaultReader({ yieldToken: async () => OTHER_TOKEN }),
      "underlying-identity",
      OTHER_TOKEN,
    );
  });

  it("rejects a supported SY token that is not the yieldToken from masquerading as underlying", async () => {
    // OTHER_TOKEN is a valid SY token (getTokensOut) but not the canonical yieldToken; a multi-token
    // SY must not let it stand in for the underlying (Blocker 2).
    let error: unknown;
    try {
      await verifyMarketCandidate(defaultReader(), { market: MARKET }, OTHER_TOKEN);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(PendleMarketVerificationError);
    expect(error).toMatchObject({ stage: "underlying-identity" });
  });

  it("rejects an underlying unsupported for SY token-in", async () => {
    await expectFailure(
      defaultReader({ tokensIn: async () => [OTHER_TOKEN] }),
      "token-support-in",
      UNDERLYING,
    );
  });

  it("rejects an underlying unsupported for SY token-out", async () => {
    await expectFailure(
      defaultReader({ tokensOut: async () => [OTHER_TOKEN] }),
      "token-support-out",
      UNDERLYING,
    );
  });

  it("rejects a market expired at the latest block timestamp", async () => {
    await expectFailure(
      defaultReader({ latestBlockTimestamp: async () => EXPIRY }),
      "expiry",
      "is not later than latest block",
    );
  });

  it.each([
    ["underlying", UNDERLYING, 256],
    ["PT", PT, -1],
  ])("rejects invalid %s decimals", async (_name, invalidToken, invalidDecimals) => {
    await expectFailure(
      defaultReader({
        decimals: async (token) => (token === invalidToken ? invalidDecimals : 18),
      }),
      "decimals",
      "invalid decimals",
    );
  });

  it("propagates a read failure with a bounded diagnostic", async () => {
    const error = await captureFailure(
      defaultReader({
        marketTokens: async () => {
          throw new Error(`RPC read failed: ${"response-body ".repeat(100)}`);
        },
      }),
    );

    expect(error).toMatchObject({
      name: "PendleMarketVerificationError",
      stage: "read-tokens",
      candidate: MARKET,
    });
    expect(error.message).toContain("RPC read failed");
    expect(error.message.length).toBeLessThan(600);
  });

  it("rejects malformed ABI output with an explicit read stage", async () => {
    await expectFailure(
      defaultReader({ marketTokens: async () => [SY, PT] }),
      "read-tokens",
      "malformed readTokens result",
    );
  });
});

function defaultReader(
  overrides: Partial<MarketVerificationReader> = {},
): MarketVerificationReader {
  return {
    chainId: async () => 143,
    codeAt: async () => "0x6000",
    isValidMarket: async () => true,
    marketFactory: async () => PENDLE_MARKET_FACTORY_ADDRESS,
    marketTokens: async () => [SY, PT, YT],
    marketExpiry: async () => EXPIRY,
    yieldToken: async () => UNDERLYING,
    tokensIn: async () => [UNDERLYING],
    tokensOut: async () => [UNDERLYING, OTHER_TOKEN],
    decimals: async (token) => (token === UNDERLYING ? 6 : 18),
    latestBlockTimestamp: async () => BLOCK_TIMESTAMP,
    ...overrides,
  };
}

async function expectFailure(
  reader: MarketVerificationReader,
  stage: MarketVerificationStage,
  detail: string,
): Promise<void> {
  const error = await captureFailure(reader);
  expect(error).toBeInstanceOf(PendleMarketVerificationError);
  expect(error).toMatchObject({
    name: "PendleMarketVerificationError",
    stage,
    candidate: MARKET,
  });
  expect(error.message).toContain(stage);
  expect(error.message).toContain(MARKET);
  expect(error.message).toContain(detail);
}

async function captureFailure(
  reader: MarketVerificationReader,
): Promise<PendleMarketVerificationError> {
  try {
    await verifyMarketCandidate(reader, { market: MARKET }, UNDERLYING);
  } catch (error) {
    if (error instanceof PendleMarketVerificationError) return error;
    throw error;
  }
  throw new Error("expected Pendle market verification to fail");
}
