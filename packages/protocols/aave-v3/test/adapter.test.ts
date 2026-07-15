import { type MossRuntime, type Plan, Registry } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { systemManifest } from "@themoss/system";
import { POOL_ADDRESS, aaveV3Manifest } from "../src/index.js";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143, rpcUrl: "http://offline", client: {} as any,
  };
  const registry = new Registry(runtime);
  registry.use(systemManifest);
  registry.use(aaveV3Manifest);
  return registry;
}

describe("aave-v3 adapter (offline shape)", () => {
  it("discovers all capabilities and queries", () => {
    const registry = offlineRegistry();
    const caps = registry.discover({ protocol: "aave-v3" });
    expect(caps.map((c) => c.method).sort()).toEqual([
      "borrow", "repay", "reserveData", "supply",
      "userAccountData", "withdraw",
    ]);
  });

  it("loads supply stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "supply" }]);
    expect(stub?.verb).toBe("supply");
    expect(stub?.risk).toContain("approval");
    expect(stub?.params).toHaveProperty("amount");
  });

  it("loads withdraw stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "withdraw" }]);
    expect(stub?.verb).toBe("withdraw");
  });

  it("loads borrow stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "borrow" }]);
    expect(stub?.verb).toBe("borrow");
  });

  it("loads repay stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "repay" }]);
    expect(stub?.verb).toBe("repay");
  });

  it("builds a supply plan for WMON", async () => {
    const registry = offlineRegistry();
    const plan = (await registry.action("aave-v3", "supply", ACCOUNT, {
      asset: "WMON", amount: "10",
    })) as Plan;
    expect(plan.txs.length).toBeGreaterThanOrEqual(2); // approve + supply
    expect(plan.txs[0].to.toLowerCase()).toBe("0x3bd359c1119da7da1d913d1c4d2b7c461115433a");
    expect(plan.planHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("builds a withdraw plan for WMON", async () => {
    const registry = offlineRegistry();
    const plan = (await registry.action("aave-v3", "withdraw", ACCOUNT, {
      asset: "WMON", amount: "5",
    })) as Plan;
    expect(plan.txs).toHaveLength(1);
    expect(plan.txs[0].to).toBe(POOL_ADDRESS);
  });

  it("builds a borrow plan", async () => {
    const registry = offlineRegistry();
    const plan = (await registry.action("aave-v3", "borrow", ACCOUNT, {
      asset: "WMON", amount: "1",
    })) as Plan;
    expect(plan.txs).toHaveLength(1);
  });

  it("builds a repay plan", async () => {
    const registry = offlineRegistry();
    const plan = (await registry.action("aave-v3", "repay", ACCOUNT, {
      asset: "WMON", amount: "1",
    })) as Plan;
    expect(plan.txs.length).toBeGreaterThanOrEqual(2); // approve + repay
  });

  it("rejects native MON with a clear error", async () => {
    const registry = offlineRegistry();
    await expect(
      registry.action("aave-v3", "supply", ACCOUNT, {
        asset: "native", amount: "1",
      }),
    ).rejects.toThrow(/non-payable/);
  });
});
