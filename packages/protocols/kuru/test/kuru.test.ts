import { type MossRuntime, NATIVE, type Plan, type QueryResult, Registry } from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { formatUnits } from "viem";
import { describe, expect, it } from "vitest";
import { kuruManifest, USDC_ADDRESS } from "../src/index.js";

const ACCOUNT = "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC";

// Everything below talks to Monad mainnet: Kuru quoting is an eth_call
// against the live orderbook, so there is no meaningful offline test beyond
// discover/load. Set MOSS_SKIP_E2E=1 when offline.
describe("kuru adapter (offline)", () => {
  it("is discoverable as a CLOB swap without inventing a new verb", () => {
    const runtime: MossRuntime = {
      chainId: 143,
      rpcUrl: "http://offline",
      // biome-ignore lint/suspicious/noExplicitAny: no reads in discover/load
      client: {} as any,
    };
    const registry = new Registry(runtime);
    registry.use(systemManifest); // USDC/AUSD symbols come from the system table
    registry.use(kuruManifest);
    const swaps = registry.discover({ verb: "swap" });
    expect(swaps).toHaveLength(1);
    expect(swaps[0]?.tags).toContain("clob");
    const [stub] = registry.load([{ protocol: "kuru", method: "swap" }]);
    expect(stub?.risk).toEqual(["fundOut", "approval", "priceImpact"]);
    expect(Object.keys(stub?.params ?? {})).toEqual(["tokenIn", "tokenOut", "amount", "slippage"]);
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("kuru adapter (Monad mainnet e2e)", () => {
  const runtime = monadRuntime();
  const registry = new Registry(runtime);
  registry.use(systemManifest);
  registry.use(kuruManifest);

  it("quotes a live MON→USDC market order, by symbol", { timeout: 60_000 }, async () => {
    // Symbols resolve through the token table — agents never need to know
    // USDC's address (ADR 0005).
    const result = (await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: "MON",
      tokenOut: "USDC",
      amount: "1",
    })) as QueryResult;
    expect(result.kind).toBe("query");
    const data = result.data as { amountOut: string; direction: string };
    expect(data.direction).toBe("sell"); // spending base (MON) into quote
    expect(BigInt(data.amountOut)).toBeGreaterThan(0n);
  });

  it("round-trips MON→USDC→MON across two chained plans with zero warnings", {
    timeout: 180_000,
  }, async () => {
    // observer wired: the swap capability's `confirms` needs the @Event plane
    const simulator = createTraceSimulator(runtime, { observer: registry.observer() });

    // Plan 1: sell 1 native MON into USDC — both sides by symbol.
    const sell = (await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: "MON",
      tokenOut: "USDC",
      amount: "1",
    })) as Plan;
    expect(sell.txs).toHaveLength(1); // native input: no approve step
    expect(sell.txs[0]?.value).not.toBe("0x0");

    // Plan 2: spend half of the quoted USDC back into MON. The account only
    // holds that USDC inside the simulation — plan 2 exercises the
    // approve → transferFrom path on state carried over from plan 1.
    const quotedOut = BigInt((sell.expects.in ?? [])[0]?.amountMin ?? "0");
    const human = formatUnits(quotedOut / 2n, 6);
    const buy = (await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: "USDC",
      tokenOut: "MON",
      amount: human,
    })) as Plan;
    expect(buy.txs).toHaveLength(2); // approve + swap
    expect(buy.expects.approvals).toHaveLength(1);

    const { results, halted } = await simulator.simulate([sell, buy]);
    expect(halted).toBeUndefined();

    // Observation plane: the @Event receipt renders per plan, satisfying the
    // capability's `confirms` (a missing receipt would warn below).
    for (const result of results) {
      const receipt = result?.observations.find((o) => o.name === "swapResult");
      expect(receipt?.intent).toMatch(/^Swapped [\d.]+ \w+ into [\d.]+ \w+ on Kuru \(\d+ fills\)$/);
    }

    const [sellResult, buyResult] = results;
    expect(sellResult?.reverted).toBe(false);
    expect(sellResult?.warnings).toEqual([]);
    expect(sellResult?.effects.assetsOut).toEqual([
      { token: NATIVE, amount: (10n ** 18n).toString() },
    ]);
    const usdcIn = sellResult?.effects.assetsIn.find((a) => a.token === USDC_ADDRESS.toLowerCase());
    expect(BigInt(usdcIn?.amount ?? "0")).toBeGreaterThan(0n);

    expect(buyResult?.reverted).toBe(false);
    expect(buyResult?.warnings).toEqual([]);
    const monBack = buyResult?.effects.assetsIn.find((a) => a.token === NATIVE);
    expect(BigInt(monBack?.amount ?? "0")).toBeGreaterThan(0n);
  });
});
