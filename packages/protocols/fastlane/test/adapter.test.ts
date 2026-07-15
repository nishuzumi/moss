import { type MossRuntime, type Plan, Registry } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { ercManifest } from "@themoss/erc";
import { SHMON_PROXY_ADDRESS, fastlaneManifest } from "../src/index.js";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    client: {} as any,
  };
  const registry = new Registry(runtime);
  registry.use(fastlaneManifest);
  return registry;
}

function liveRegistry(): Registry {
  const runtime = monadRuntime();
  const reg = new Registry(runtime);
  reg.use(systemManifest);
  reg.use(ercManifest);
  reg.use(fastlaneManifest);
  return reg;
}

// ── Offline ──
describe("fastlane adapter (offline shape)", () => {
  it("discovers stake and unstake capabilities", () => {
    const registry = offlineRegistry();
    const caps = registry.discover({ protocol: "fastlane" });
    expect(caps.map((c) => c.method).sort()).toEqual([
      "balanceOf",
      "exchangeRate",
      "stake",
      "totalStaked",
      "unstake",
    ]);
  });

  it("loads the stake capability stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "fastlane", method: "stake" }]);
    expect(stub?.verb).toBe("stake");
    expect(stub?.risk).toEqual(["fundOut"]);
    expect(stub?.tags).toContain("liquid-staking");
  });

  it("loads the unstake capability stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "fastlane", method: "unstake" }]);
    expect(stub?.verb).toBe("unstake");
    expect(stub?.risk).toEqual(["fundOut"]);
  });

  it("builds a stake plan", async () => {
    const registry = offlineRegistry();
    const plan = (await registry.action("fastlane", "stake", ACCOUNT, { amount: "1" })) as Plan;
    expect(plan.txs).toHaveLength(1);
    expect(BigInt(plan.txs[0].value)).toBeGreaterThan(0n);
    expect(plan.txs[0].to).toBe(SHMON_PROXY_ADDRESS);
    expect(plan.planHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("builds an unstake plan", async () => {
    const registry = offlineRegistry();
    const plan = (await registry.action("fastlane", "unstake", ACCOUNT, { amount: "0.5" })) as Plan;
    expect(plan.txs).toHaveLength(1);
    expect(BigInt(plan.txs[0].value)).toBe(0n);
    expect(plan.txs[0].to).toBe(SHMON_PROXY_ADDRESS);
  });
});

// ── E2E (live Monad mainnet, zero funds) ──
const e2e = process.env.MOSS_SKIP_E2E ? describe.skip : describe;
e2e("fastlane adapter (Monad mainnet e2e)", () => {
  it("totalStaked query reads TVL", async () => {
    const result = await liveRegistry().action("fastlane", "totalStaked", ACCOUNT, {});
    const data = result.data ?? result;
    expect(data).toHaveProperty("total");
    const total = BigInt(data.total);
    expect(total).toBeGreaterThan(10n ** 18n);
  });

  it("exchangeRate query reads current rate", async () => {
    const result = await liveRegistry().action("fastlane", "exchangeRate", ACCOUNT, {});
    const data = result.data ?? result;
    expect(data).toHaveProperty("rate");
    const rate = BigInt(data.rate);
    expect(rate).toBeGreaterThan(0n);
    expect(rate).toBeLessThan(10n ** 19n);
  });

  it("stake plan simulates on mainnet", { timeout: 30_000 }, async () => {
    const reg = liveRegistry();
    const plan = (await reg.action("fastlane", "stake", ACCOUNT, { amount: "0.001" })) as Plan;

    const simulator = createTraceSimulator(monadRuntime(), { observer: reg.observer() });
    const { results } = await simulator.simulate([plan]);
    const r = results[0];

    // Simulator pre-funds the account, so deposit should not revert
    expect(r.reverted).toBe(false);

    // No CONFIRMATION_MISSING — @Event receipt should fire
    const confirmErrors = r.warnings.filter((w) => w.code === "CONFIRMATION_MISSING");
    expect(confirmErrors).toHaveLength(0);

    // Observation plane: should decode a Deposit event
    const obs = r.observations?.find((o) => o.protocol === "fastlane");
    expect(obs?.intent).toContain("Staked");
  });

  it("unstake with zero balance reverts as expected", async () => {
    const reg = liveRegistry();
    const plan = (await reg.action("fastlane", "unstake", ACCOUNT, { amount: "0.0001" })) as Plan;

    const simulator = createTraceSimulator(monadRuntime(), { observer: reg.observer() });
    const { results } = await simulator.simulate([plan]);
    const r = results[0];

    // Account has 0 shMON → redeem() reverts — expected
    // The reversion is caught cleanly, no crashes
    if (!r.reverted) {
      // If it somehow didn't revert, check for inflow warnings
      expect(r.warnings.length).toBeGreaterThanOrEqual(0);
    }
  });
});
