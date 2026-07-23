import type { MossRuntime } from "@themoss/core";
import { monadRuntime } from "@themoss/system";
import { beforeAll, describe, expect, it } from "vitest";
import { PENDLE_MARKET_FACTORY_ADDRESS } from "../src/addresses.js";
import { discoverPendleMarkets } from "../src/market-discovery.js";

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Pendle verified Monad markets", () => {
  let runtime: MossRuntime;

  beforeAll(async () => {
    runtime = await monadRuntime();
  });

  it("discovers every current API candidate and admits only on-chain verified markets", {
    timeout: 180_000,
  }, async () => {
    const result = await discoverPendleMarkets(runtime);

    expect(result.status).toBe("available");
    expect(result.candidateCount).toBeGreaterThan(0);
    expect(result.verified.length).toBeGreaterThan(0);
    expect(new Set(result.verified.map(({ market }) => market.market.toLowerCase())).size).toBe(
      result.verified.length,
    );

    for (const { market, metadata } of result.verified) {
      expect(market.factory).toBe(PENDLE_MARKET_FACTORY_ADDRESS);
      expect(market.tokenSupport).toMatchObject({
        underlyingIn: true,
        underlyingOut: true,
      });
      expect(market.expiry).toBeGreaterThan(0n);
      expect(metadata.provenance).toMatchObject({
        kind: "inferred",
        provider: "Pendle official API",
        source: "https://api-v2.pendle.finance/core/v2/markets/all?chainId=143",
      });
      expect(Number.isFinite(Date.parse(metadata.provenance.fetchedAt))).toBe(true);
    }

    console.info(
      `[Pendle live discovery] ${JSON.stringify({
        candidateCount: result.candidateCount,
        verifiedCount: result.verified.length,
        rejectedCount: result.rejections.length,
        verified: result.verified.map(({ market, metadata }) => ({
          name: metadata.name,
          protocol: metadata.protocol,
          market: market.market,
          underlying: market.underlying,
          expiryUtc: new Date(Number(market.expiry) * 1_000).toISOString(),
          aggregatedApy: metadata.aggregatedApy ?? null,
          apyProvenance: metadata.provenance,
        })),
        rejections: result.rejections,
      })}`,
    );
  });
});
