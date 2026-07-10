import { type MossRuntime, NATIVE, type Plan, Registry } from "@themoss/core";
import { erc20MetadataSource, ercManifest } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { describe, expect, it } from "vitest";
import { monadRuntime, systemManifest, WMON_ADDRESS } from "../src/index.js";

const ACCOUNT = "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const AMOUNT = 1_500_000_000_000_000_000n; // 1.5 MON

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    // biome-ignore lint/suspicious/noExplicitAny: reads are unused in offline tests
    client: {} as any,
  };
  const registry = new Registry(runtime);
  registry.use(systemManifest);
  return registry;
}

describe("wmon system protocol (offline)", () => {
  it("ships via systemManifest: discoverable by verb, loadable params", () => {
    const registry = offlineRegistry();
    expect(registry.discover({ verb: "wrap" })).toHaveLength(1);
    const [stub] = registry.load([{ protocol: "wmon", method: "wrap" }]);
    expect(stub?.risk).toEqual(["fundOut"]);
    expect(stub?.params.amount).toContain("MON");
  });

  it("builds the wrap plan: value-carrying deposit, symmetric expects", async () => {
    const registry = offlineRegistry();
    const built = (await registry.action("wmon", "wrap", ACCOUNT, { amount: "1.5" })) as Plan;
    expect(built.txs).toEqual([
      {
        from: ACCOUNT,
        to: WMON_ADDRESS,
        data: "0xd0e30db0", // deposit()
        value: "0x14d1120d7b160000", // 1.5e18 — the amount rides on tx.value
      },
    ]);
    expect(built.expects.out).toEqual([{ token: NATIVE, amountMax: AMOUNT.toString() }]);
    expect(built.expects.in).toEqual([{ token: WMON_ADDRESS, amountMin: AMOUNT.toString() }]);
    expect(built.verb).toBe("wrap");
  });

  it("builds the unwrap plan with the mirrored expectations", async () => {
    const registry = offlineRegistry();
    const built = (await registry.action("wmon", "unwrap", ACCOUNT, { amount: "1.5" })) as Plan;
    expect(built.txs[0]?.data.startsWith("0x2e1a7d4d")).toBe(true); // withdraw(uint256)
    expect(built.expects.out).toEqual([{ token: WMON_ADDRESS, amountMax: AMOUNT.toString() }]);
    expect(built.expects.in).toEqual([{ token: NATIVE, amountMin: AMOUNT.toString() }]);
  });
});

// Live e2e against Monad mainnet with zero funds. Set MOSS_SKIP_E2E=1 offline.
describe.skipIf(!!process.env.MOSS_SKIP_E2E)("system layer (Monad mainnet e2e)", () => {
  it("wrap → unwrap chain simulates with zero warnings", { timeout: 120_000 }, async () => {
    const runtime = monadRuntime();
    const registry = new Registry(runtime);
    registry.use(systemManifest);
    const simulator = createTraceSimulator(runtime);

    const wrap = (await registry.action("wmon", "wrap", ACCOUNT, { amount: "1.5" })) as Plan;
    const unwrap = (await registry.action("wmon", "unwrap", ACCOUNT, { amount: "1.5" })) as Plan;

    const { results, halted } = await simulator.simulate([wrap, unwrap]);
    expect(halted).toBeUndefined();
    expect(results.map((r) => r.warnings)).toEqual([[], []]);
    expect(results[0]?.effects.assetsIn).toEqual([
      { token: WMON_ADDRESS.toLowerCase(), amount: AMOUNT.toString() },
    ]);
    expect(results[1]?.effects.assetsIn).toEqual([{ token: NATIVE, amount: AMOUNT.toString() }]);
  });

  // Cross-package composition: system's wmon mints simulated WMON, erc's
  // generic erc20 protocol transfers it — chained state, zero warnings.
  it("wrap → erc20-transfer WMON chain simulates cleanly", { timeout: 120_000 }, async () => {
    const runtime = monadRuntime();
    const registry = new Registry(runtime, {
      tokenFallback: erc20MetadataSource(runtime.client),
    });
    registry.use(systemManifest);
    registry.use(ercManifest);
    const simulator = createTraceSimulator(runtime);

    const wrap = (await registry.action("wmon", "wrap", ACCOUNT, { amount: "1" })) as Plan;
    const send = (await registry.action("erc20", "transfer", ACCOUNT, {
      token: "WMON",
      to: RECIPIENT,
      amount: "0.5",
    })) as Plan;

    const { results, halted } = await simulator.simulate([wrap, send]);
    expect(halted).toBeUndefined();
    expect(results.map((r) => r.warnings)).toEqual([[], []]);
    expect(results[1]?.effects.assetsOut).toEqual([
      { token: WMON_ADDRESS.toLowerCase(), amount: (5n * 10n ** 17n).toString() },
    ]);
    expect(results[1]?.effects.recipients).toContain(RECIPIENT.toLowerCase());
  });
});
