import {
  type CapabilityNode,
  type Change,
  type MossRuntime,
  flattenCapabilityTree,
  Registry,
} from "@themoss/core";
import { describe, expect, it } from "vitest";
import { monadRuntime } from "@themoss/system";
import { parseUnits } from "viem";
import { AaveV3, POOL_ADDRESS } from "../src/index.js";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";

// ── Helpers ──

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    // biome-ignore lint/suspicious/noExplicitAny: no reads in offline tests
    client: {} as any,
  } as MossRuntime;
  const registry = new Registry(runtime);
  registry.use(AaveV3);
  return registry;
}

// ── Offline: shape & discovery ──

describe("aave-v3 adapter (offline shape)", () => {
  it("discovers all capabilities and queries", () => {
    const registry = offlineRegistry();
    const caps = registry.discover({ protocol: "aave-v3" });
    const methods = caps.map((c) => c.method).sort();
    expect(methods).toEqual([
      "borrow",
      "repay",
      "reserveData",
      "supply",
      "userAccountData",
      "withdraw",
    ]);
  });

  it("supplies correct verb and risk metadata for each capability", () => {
    const registry = offlineRegistry();
    const caps = registry.discover({ protocol: "aave-v3" });

    const supply = caps.find((c) => c.method === "supply")!;
    expect(supply.verb).toBe("supply");
    expect(supply.tags).toContain("collateral");

    const withdraw = caps.find((c) => c.method === "withdraw")!;
    expect(withdraw.verb).toBe("withdraw");

    const borrow = caps.find((c) => c.method === "borrow")!;
    expect(borrow.verb).toBe("borrow");
    expect(borrow.tags).toContain("variable-rate");

    const repay = caps.find((c) => c.method === "repay")!;
    expect(repay.verb).toBe("repay");
  });

  it("loads the supply capability stub with correct params", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "supply" }]);
    expect(stub?.verb).toBe("supply");
    expect(stub?.risk).toEqual(["fundOut", "approval"]);
    expect(stub?.params).toHaveProperty("asset");
    expect(stub?.params).toHaveProperty("amount");
  });

  it("loads query stubs", () => {
    const registry = offlineRegistry();
    const [dataStub] = registry.load([
      { protocol: "aave-v3", method: "userAccountData" },
    ]);
    expect(dataStub?.kind).toBe("query");
    expect(dataStub?.params).toHaveProperty("user");
  });

  it("builds a supply capability with two child transactions (approve + supply)", async () => {
    const registry = offlineRegistry();
    const cap = (await registry.action("aave-v3", "supply", ACCOUNT, {
      asset: WMON,
      amount: "10",
    })) as CapabilityNode;
    expect(cap.kind).toBe("capability");
    expect(cap.protocol).toBe("aave-v3");
    expect(cap.method).toBe("supply");
    expect(cap.receipt).toBe("supplyReceipt");
    // Two children: approve (CapabilityNode) + supply (TransactionNode)
    expect(cap.children).toHaveLength(2);
    expect(cap.children[0]?.kind).toBe("capability");
    expect((cap.children[0] as { protocol: string }).protocol).toBe("erc20");
    expect(cap.children[1]?.kind).toBe("transaction");
    expect((cap.children[1] as { transaction: { to: string } }).transaction.to).toBe(POOL_ADDRESS);
  });

  it("builds a withdraw capability with one direct transaction", async () => {
    const registry = offlineRegistry();
    const cap = (await registry.action("aave-v3", "withdraw", ACCOUNT, {
      asset: WMON,
      amount: "5",
    })) as CapabilityNode;
    expect(cap.kind).toBe("capability");
    expect(cap.method).toBe("withdraw");
    expect(cap.receipt).toBe("withdrawReceipt");

    const flattened = flattenCapabilityTree(cap);
    expect(flattened).toHaveLength(1);
    expect(flattened[0]!.transaction.to).toBe(POOL_ADDRESS);
  });

  it("builds a borrow capability with one direct transaction", async () => {
    const registry = offlineRegistry();
    const cap = (await registry.action("aave-v3", "borrow", ACCOUNT, {
      asset: WMON,
      amount: "1",
    })) as CapabilityNode;
    expect(cap.kind).toBe("capability");
    expect(cap.method).toBe("borrow");
    expect(cap.receipt).toBe("borrowReceipt");

    const flattened = flattenCapabilityTree(cap);
    expect(flattened).toHaveLength(1);
    expect(flattened[0]!.transaction.to).toBe(POOL_ADDRESS);
  });

  it("builds a repay capability with two child transactions (approve + repay)", async () => {
    const registry = offlineRegistry();
    const cap = (await registry.action("aave-v3", "repay", ACCOUNT, {
      asset: WMON,
      amount: "2",
    })) as CapabilityNode;
    expect(cap.kind).toBe("capability");
    expect(cap.method).toBe("repay");
    expect(cap.receipt).toBe("repayReceipt");
    // Two children: approve (CapabilityNode) + repay (TransactionNode)
    expect(cap.children).toHaveLength(2);
    expect(cap.children[0]?.kind).toBe("capability");
    expect(cap.children[1]?.kind).toBe("transaction");
    expect((cap.children[1] as { transaction: { to: string } }).transaction.to).toBe(POOL_ADDRESS);
  });

  it("rejects native MON with a clear error", async () => {
    const registry = offlineRegistry();
    await expect(
      registry.action("aave-v3", "supply", ACCOUNT, {
        asset: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        amount: "1",
      }),
    ).rejects.toThrow(/non-payable/);

    await expect(
      registry.action("aave-v3", "withdraw", ACCOUNT, {
        asset: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        amount: "1",
      }),
    ).rejects.toThrow(/non-payable/);
  });

  it("parses a supply receipt from empty changes (offline)", () => {
    const registry = offlineRegistry();
    const cap = {
      kind: "capability" as const,
      protocol: "aave-v3",
      method: "supply",
      params: { asset: WMON, amount: "10" },
      receipt: "supplyReceipt",
      children: [
        {
          kind: "transaction" as const,
          transaction: {
            from: ACCOUNT,
            to: POOL_ADDRESS,
            data: "0x" as const,
            value: "0x0" as const,
          },
        },
      ],
    };
    const receipt = registry.parseReceipt(cap as CapabilityNode, []);
    expect(receipt.kind).toBe("receipt");
    expect(receipt.outcome).toEqual({ operation: "supply" });
    expect(receipt.changes).toHaveLength(0);
  });

  it("rejects invalid amounts", async () => {
    const registry = offlineRegistry();
    await expect(
      registry.action("aave-v3", "supply", ACCOUNT, {
        asset: WMON,
        amount: "-1",
      }),
    ).rejects.toThrow(/invalid parameters/);

    await expect(
      registry.action("aave-v3", "supply", ACCOUNT, {
        asset: WMON,
        amount: "abc",
      }),
    ).rejects.toThrow(/invalid parameters/);
  });
});

// ── E2E (live Monad mainnet, zero funds — Moss never signs/sends) ──

const e2e = process.env.MOSS_SKIP_E2E ? describe.skip : describe;
e2e("aave-v3 adapter (Monad mainnet e2e)", () => {
  async function liveRegistry(): Promise<Registry> {
    const runtime = await monadRuntime();
    const reg = new Registry(runtime);
    reg.use(AaveV3);
    return reg;
  }

  it(
    "userAccountData query reads zero state for a random account",
    { timeout: 30_000 },
    async () => {
      const reg = await liveRegistry();
      const result = await reg.action("aave-v3", "userAccountData", ACCOUNT, {
        user: ACCOUNT,
      });
      if (result.kind !== "query") throw new Error("expected query result");
      const data = result.data as { healthFactor: string };
      expect(data).toHaveProperty("healthFactor");
      // A random account with no position has healthFactor == max
      expect(BigInt(data.healthFactor)).toBeGreaterThan(0n);
    },
  );

  it(
    "reserveData query reads WMON reserve config",
    { timeout: 30_000 },
    async () => {
      const reg = await liveRegistry();
      const result = await reg.action("aave-v3", "reserveData", ACCOUNT, {
        asset: WMON,
      });
      if (result.kind !== "query") throw new Error("expected query result");
      const data = result.data as {
        liquidityRate: string;
        aTokenAddress: string;
      };
      expect(data).toHaveProperty("liquidityRate");
      expect(data.aTokenAddress).toMatch(/^0x[a-f0-9]{40}$/i);
    },
  );

  it(
    "supply capability builds valid calldata on mainnet",
    { timeout: 30_000 },
    async () => {
      const reg = await liveRegistry();
      const cap = (await reg.action("aave-v3", "supply", ACCOUNT, {
        asset: WMON,
        amount: "0.001",
      })) as CapabilityNode;
      expect(cap.kind).toBe("capability");
      expect(cap.children).toHaveLength(2);
      // supply() function selector: 0x617ba037
      const supplyTx = (cap.children[1] as { transaction: { to: string; data: string } }).transaction;
      expect(supplyTx.to).toBe(POOL_ADDRESS);
      expect(supplyTx.data).toMatch(/^0x617ba037/);
    },
  );

  it(
    "withdraw capability builds valid calldata on mainnet",
    { timeout: 30_000 },
    async () => {
      const reg = await liveRegistry();
      const cap = (await reg.action("aave-v3", "withdraw", ACCOUNT, {
        asset: WMON,
        amount: "0.0001",
      })) as CapabilityNode;
      expect(cap.kind).toBe("capability");
      // withdraw() function selector: 0x69328dec
      const tx = (cap.children[0] as { transaction: { to: string; data: string } }).transaction;
      expect(tx.to).toBe(POOL_ADDRESS);
      expect(tx.data).toMatch(/^0x69328dec/);
    },
  );
});
