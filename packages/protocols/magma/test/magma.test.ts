import { type MossRuntime, NATIVE, type Plan, Registry } from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { MAGMA_VAULT_ADDRESS, magmaManifest, WMON_ADDRESS } from "../src/index.js";

// 使用 getAddress 获取正确的 EIP-55 Checksum 地址
const ACCOUNT = getAddress("0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC");

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    // biome-ignore lint/suspicious/noExplicitAny: offline tests do not make calls
    client: {} as any,
  };
  const registry = new Registry(runtime);
  registry.use(systemManifest);
  registry.use(magmaManifest);
  return registry;
}

describe("magma adapter (offline shape)", () => {
  it("is discoverable and loads described stubs", () => {
    const registry = offlineRegistry();

    const stakes = registry.discover({ verb: "stake", protocol: "magma" });
    expect(stakes).toHaveLength(1);

    const [stub] = registry.load([{ protocol: "magma", method: "stake" }]);
    expect(stub?.risk).toEqual(["fundOut", "approval"]);
    expect(Object.keys(stub?.params ?? {})).toEqual(["asset", "amount"]);
  });

  it("loads unstake and claim capabilities", () => {
    const registry = offlineRegistry();

    const unstakes = registry.discover({ verb: "unstake", protocol: "magma" });
    expect(unstakes).toHaveLength(1);

    const withdraws = registry.discover({ verb: "withdraw", protocol: "magma" });
    expect(withdraws).toHaveLength(1);
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("magma adapter (Monad mainnet e2e)", () => {
  const runtime = monadRuntime();
  const registry = new Registry(runtime);
  registry.use(systemManifest);
  registry.use(magmaManifest);

  it("simulates staking native MON into Magma with zero warnings", { timeout: 60_000 }, async () => {
    const simulator = createTraceSimulator(runtime, { observer: registry.observer() });

    // 构建质押 0.1 MON 的 Plan
    const planObj = (await registry.action("magma", "stake", ACCOUNT, {
      asset: "MON",
      amount: "0.1",
    })) as Plan;

    expect(planObj.txs).toHaveLength(1); // 直接发送 depositMON 交易
    expect(planObj.txs[0]?.to.toLowerCase()).toBe(MAGMA_VAULT_ADDRESS.toLowerCase());

    const { results, halted } = await simulator.simulate([planObj]);
    expect(halted).toBeUndefined();

    const [res] = results;
    expect(res?.reverted).toBe(false);
    expect(res?.warnings).toEqual([]);

    // 验证代币移出和移入是否符合断言
    const outAsset = res?.effects.assetsOut.find((a) => a.token === NATIVE);
    expect(outAsset).toBeDefined();
    expect(BigInt(outAsset?.amount ?? "0")).toBe(10n ** 17n); // 0.1 MON

    const inAsset = res?.effects.assetsIn.find(
      (a) => a.token.toLowerCase() === MAGMA_VAULT_ADDRESS.toLowerCase()
    );
    expect(inAsset).toBeDefined();
    expect(BigInt(inAsset?.amount ?? "0")).toBeGreaterThan(0n);

    // 验证 @Event 收据正常渲染
    const receipt = res?.observations.find((o) => o.name === "stakeReceipt");
    expect(receipt).toBeDefined();
    expect(receipt?.intent).toMatch(/^Staked 0\.1 MON into Magma for [\d.]+ gMON$/);
  });

  it("simulates staking WMON into Magma", { timeout: 60_000 }, async () => {
    const planObj = (await registry.action("magma", "stake", ACCOUNT, {
      asset: "WMON",
      amount: "0.05",
    })) as Plan;

    expect(planObj.txs).toHaveLength(2); // approve + deposit
    expect(planObj.txs[0]?.to.toLowerCase()).toBe(WMON_ADDRESS.toLowerCase());
    expect(planObj.txs[1]?.to.toLowerCase()).toBe(MAGMA_VAULT_ADDRESS.toLowerCase());
  });
});
