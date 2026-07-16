import {
  type CapabilityNode,
  type Change,
  type MossRuntime,
  flattenCapabilityTree,
  Registry,
  type Stub,
} from "@themoss/core";
import { describe, expect, it } from "vitest";
import { monadRuntime } from "@themoss/system";
import { FastLane, SHMON_PROXY_ADDRESS } from "../src/index.js";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// ── Helpers ──

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    // biome-ignore lint/suspicious/noExplicitAny: no reads in offline tests
    client: {} as any,
  } as MossRuntime;
  const registry = new Registry(runtime);
  registry.use(FastLane);
  return registry;
}

async function buildCapability(
  registry: Registry,
  method: string,
  amount: string,
): Promise<CapabilityNode> {
  return registry.action("fastlane", method, ACCOUNT, {
    amount,
  }) as Promise<CapabilityNode>;
}

// ── Offline: shape & discovery ──
describe("fastlane adapter (offline shape)", () => {
  it("discovers stake and unstake capabilities with correct metadata", () => {
    const registry = offlineRegistry();
    const caps = registry.discover({ protocol: "fastlane" });
    const methods = caps.map((c) => c.method).sort();
    expect(methods).toEqual(["balanceOf", "exchangeRate", "stake", "totalStaked", "unstake"]);

    const stake = caps.find((c) => c.method === "stake")!;
    expect(stake.verb).toBe("stake");
    expect(stake.tags).toContain("liquid-staking");

    const unstake = caps.find((c) => c.method === "unstake")!;
    expect(unstake.verb).toBe("unstake");
    expect(unstake.tags).toContain("liquid-staking");
  });

  it("loads the stake capability stub with correct params", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "fastlane", method: "stake" }]);
    expect(stub?.verb).toBe("stake");
    expect(stub?.risk).toEqual(["fundOut"]);
    expect(stub?.tags).toContain("liquid-staking");
    expect(stub?.params).toHaveProperty("amount");
  });

  it("loads the unstake capability stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "fastlane", method: "unstake" }]);
    expect(stub?.verb).toBe("unstake");
    expect(stub?.risk).toEqual(["fundOut"]);
  });

  it("loads query stubs", () => {
    const registry = offlineRegistry();
    const [balanceStub] = registry.load([{ protocol: "fastlane", method: "balanceOf" }]);
    expect(balanceStub?.kind).toBe("query");
    expect(balanceStub?.params).toHaveProperty("owner");

    const [rateStub] = registry.load([{ protocol: "fastlane", method: "exchangeRate" }]);
    expect(rateStub?.kind).toBe("query");
  });

  it("builds a stake capability with one direct transaction", async () => {
    const registry = offlineRegistry();
    const cap = await buildCapability(registry, "stake", "1");
    expect(cap.kind).toBe("capability");
    expect(cap.protocol).toBe("fastlane");
    expect(cap.method).toBe("stake");
    expect(cap.params).toEqual({ amount: "1" });
    expect(cap.receipt).toBe("stakeReceipt");

    // Exactly one direct transaction
    const flattened = flattenCapabilityTree(cap);
    expect(flattened).toHaveLength(1);
    const tx = flattened[0]!.transaction;
    expect(tx.to).toBe(SHMON_PROXY_ADDRESS);
    expect(BigInt(tx.value)).toBeGreaterThan(0n);
  });

  it("builds an unstake capability with one direct transaction (no value)", async () => {
    const registry = offlineRegistry();
    const cap = await buildCapability(registry, "unstake", "0.5");
    expect(cap.kind).toBe("capability");
    expect(cap.method).toBe("unstake");
    expect(cap.receipt).toBe("unstakeReceipt");

    const flattened = flattenCapabilityTree(cap);
    expect(flattened).toHaveLength(1);
    const tx = flattened[0]!.transaction;
    expect(tx.to).toBe(SHMON_PROXY_ADDRESS);
    expect(BigInt(tx.value)).toBe(0n); // redeem is non-payable
  });

  it("parses a stake receipt from changes (offline with empty changes)", () => {
    const registry = offlineRegistry();
    const cap = {
      kind: "capability" as const,
      protocol: "fastlane",
      method: "stake",
      params: { amount: "1" },
      receipt: "stakeReceipt",
      children: [
        {
          kind: "transaction" as const,
          transaction: {
            from: ACCOUNT,
            to: SHMON_PROXY_ADDRESS,
            data: "0x" as const,
            value: "0x0" as const,
          },
        },
      ],
    };
    const receipt = registry.parseReceipt(cap, []);
    expect(receipt.kind).toBe("receipt");
    expect(receipt.outcome).toEqual({ operation: "stake" });
    expect(receipt.changes).toHaveLength(0);
  });

  it("parses an unstake receipt from changes (offline with empty changes)", () => {
    const registry = offlineRegistry();
    const cap = {
      kind: "capability" as const,
      protocol: "fastlane",
      method: "unstake",
      params: { amount: "0.5" },
      receipt: "unstakeReceipt",
      children: [
        {
          kind: "transaction" as const,
          transaction: {
            from: ACCOUNT,
            to: SHMON_PROXY_ADDRESS,
            data: "0x" as const,
            value: "0x0" as const,
          },
        },
      ],
    };
    const receipt = registry.parseReceipt(cap, []);
    expect(receipt.kind).toBe("receipt");
    expect(receipt.outcome).toEqual({ operation: "unstake" });
    expect(receipt.changes).toHaveLength(0);
  });

  it("rejects invalid amounts", async () => {
    const registry = offlineRegistry();
    await expect(
      registry.action("fastlane", "stake", ACCOUNT, { amount: "-1" }),
    ).rejects.toThrow(/invalid parameters/);

    await expect(
      registry.action("fastlane", "stake", ACCOUNT, { amount: "abc" }),
    ).rejects.toThrow(/invalid parameters/);
  });
});

// ── E2E (live Monad mainnet, zero funds — Moss never signs/sends) ──
const e2e = process.env.MOSS_SKIP_E2E ? describe.skip : describe;
e2e("fastlane adapter (Monad mainnet e2e)", () => {
  async function liveRegistry(): Promise<Registry> {
    const runtime = await monadRuntime();
    const reg = new Registry(runtime);
    reg.use(FastLane);
    return reg;
  }

  it("totalStaked query reads TVL", { timeout: 30_000 }, async () => {
    const reg = await liveRegistry();
    const result = await reg.action("fastlane", "totalStaked", ACCOUNT, {});
    if (result.kind !== "query") throw new Error("expected query result");
    const data = result.data as { total: string };
    expect(data).toHaveProperty("total");
    expect(BigInt(data.total)).toBeGreaterThan(0n);
  });

  it("exchangeRate query reads current rate", { timeout: 30_000 }, async () => {
    const reg = await liveRegistry();
    const result = await reg.action("fastlane", "exchangeRate", ACCOUNT, {});
    if (result.kind !== "query") throw new Error("expected query result");
    const data = result.data as { rate: string };
    expect(data).toHaveProperty("rate");
    const rate = BigInt(data.rate);
    expect(rate).toBeGreaterThan(0n);
  });

  it("stake capability builds valid calldata on mainnet", { timeout: 30_000 }, async () => {
    const reg = await liveRegistry();
    const cap = await reg.action("fastlane", "stake", ACCOUNT, {
      amount: "0.001",
    });
    expect(cap.kind).toBe("capability");
    const flattened = flattenCapabilityTree(cap as CapabilityNode);
    expect(flattened).toHaveLength(1);
    const tx = flattened[0]!.transaction;
    expect(tx.to).toBe(SHMON_PROXY_ADDRESS);
    expect(BigInt(tx.value)).toBe(parseUnits("0.001", 18));
    // data should be a valid deposit() function selector (0x6e553f65)
    expect(tx.data).toMatch(/^0x6e553f65/);
  });

  it("unstake capability builds valid calldata on mainnet", { timeout: 30_000 }, async () => {
    const reg = await liveRegistry();
    const cap = await reg.action("fastlane", "unstake", ACCOUNT, {
      amount: "0.0001",
    });
    expect(cap.kind).toBe("capability");
    const flattened = flattenCapabilityTree(cap as CapabilityNode);
    expect(flattened).toHaveLength(1);
    const tx = flattened[0]!.transaction;
    expect(tx.to).toBe(SHMON_PROXY_ADDRESS);
    // redeem() function selector (0xba087652)
    expect(tx.data).toMatch(/^0xba087652/);
    expect(BigInt(tx.value)).toBe(0n);
  });
});

// Need parseUnits for e2e tests
import { parseUnits } from "viem";
