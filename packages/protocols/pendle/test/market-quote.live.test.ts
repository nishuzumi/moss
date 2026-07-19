import type { MossRuntime } from "@themoss/core";
import { monadRuntime } from "@themoss/system";
import { beforeAll, describe, expect, it } from "vitest";
import { discoverPendleMarkets } from "../src/market-discovery.js";
import { quotePendleSwap } from "../src/market-quote.js";
import type { DiscoveredPendleMarket } from "../src/types.js";

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Pendle RouterStatic live quotes", () => {
  let runtime: MossRuntime;
  let discovered: DiscoveredPendleMarket | undefined;

  beforeAll(async () => {
    runtime = await monadRuntime();
    const result = await discoverPendleMarkets(runtime);
    discovered = result.verified[0];
  }, 180_000);

  it("quotes buying and selling PT for a verified market with consistent invariants", {
    timeout: 180_000,
  }, async () => {
    expect(discovered).toBeDefined();
    if (!discovered) return;
    const market = discovered.market;
    const slippageBps = 50;

    const buy = await quotePendleSwap(runtime, market, {
      tokenIn: market.underlying,
      tokenOut: market.pt,
      amountIn: 10n ** BigInt(market.decimals.underlying),
      slippageBps,
    });
    expect(buy.direction).toBe("buy-pt");
    expect(buy.expectedOut).toBeGreaterThan(0n);
    expect(buy.minOut).toBeGreaterThan(0n);
    expect(buy.minOut).toBeLessThanOrEqual(buy.expectedOut);
    expect(buy.decimals).toEqual({ in: market.decimals.underlying, out: market.decimals.pt });
    if (buy.direction === "buy-pt") {
      expect(buy.approxParams.guessMax).toBeGreaterThanOrEqual(buy.approxParams.guessMin);
    }

    const sell = await quotePendleSwap(runtime, market, {
      tokenIn: market.pt,
      tokenOut: market.underlying,
      amountIn: 10n ** BigInt(market.decimals.pt),
      slippageBps,
    });
    expect(sell.direction).toBe("sell-pt");
    expect(sell.expectedOut).toBeGreaterThan(0n);
    expect(sell.minOut).toBeGreaterThan(0n);
    expect(sell.minOut).toBeLessThanOrEqual(sell.expectedOut);
    expect(sell.decimals).toEqual({ in: market.decimals.pt, out: market.decimals.underlying });
    expect("approxParams" in sell).toBe(false);

    console.info(
      `[Pendle live quote] ${JSON.stringify(
        {
          market: market.market,
          underlying: market.underlying,
          pt: market.pt,
          decimals: market.decimals,
          slippageBps,
          buy: {
            amountIn: buy.amountIn.toString(),
            expectedOut: buy.expectedOut.toString(),
            minOut: buy.minOut.toString(),
            approxParams: Object.fromEntries(
              Object.entries(buy.direction === "buy-pt" ? buy.approxParams : {}).map(
                ([key, value]) => [key, (value as bigint).toString()],
              ),
            ),
          },
          sell: {
            amountIn: sell.amountIn.toString(),
            expectedOut: sell.expectedOut.toString(),
            minOut: sell.minOut.toString(),
          },
        },
        null,
        0,
      )}`,
    );
  });
});
