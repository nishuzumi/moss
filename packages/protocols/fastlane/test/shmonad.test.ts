// ============================================================
// Tests for FastLane shMONAD Protocol adapter
//
// Structure:
//   1. Offline unit tests — verify metadata validation,
//      Capability structure, Receipt parsing, and error cases.
//      These use a mock RPC client and never touch the chain.
//
//   2. Live E2E tests — skipped when MOSS_SKIP_E2E=1.
//      Verify deployed bytecode and happy-path simulation
//      on Monad mainnet with zero warnings.
// ============================================================

import {
  type CapabilityNode,
  type Change,
  flattenCapabilityTree,
  type ReceiptChange,
  type ReceiptResult,
  Registry,
  verifyReceiptCoverage,
} from "@themoss/core";
import { monadRuntime } from "@themoss/system";
import { encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ShmonadAbi } from "../src/abis/shmond.js";
import { SHMONAD_ADDRESS, Shmonad } from "../src/index.js";

// ── Constants ────────────────────────────────────────────────

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const VAULT = SHMONAD_ADDRESS;
const ZERO = getAddress("0x0000000000000000000000000000000000000000");

// ── Offline client mock ──────────────────────────────────────

function offlineRegistry() {
  const BALANCE = 100_000_000_000_000_000_000n;
  const TOTAL_ASSETS = 1_000_000_000_000_000_000_000n;
  const TOTAL_SUPPLY = 950_000_000_000_000_000_000n;

  const client = {
    call: async () => {
      throw new Error("call not expected in these tests");
    },
    readContract: async ({ functionName }: { functionName: string; args: readonly unknown[] }) => {
      switch (functionName) {
        case "balanceOf":
          return BALANCE;
        case "totalAssets":
          return TOTAL_ASSETS;
        case "totalSupply":
          return TOTAL_SUPPLY;
        default:
          throw new Error(`unexpected read: ${functionName}`);
      }
    },
  } as never;

  return {
    registry: new Registry({ rpcUrl: "http://offline", client } as never).use(Shmonad),
  };
}

/** Narrow a ReceiptResult entry to a ReceiptChange when kind === "change". */
function asChange(entry: ReceiptResult["changes"][number] | undefined): ReceiptChange {
  if (entry?.kind !== "change") throw new Error("expected ReceiptChange");
  return entry;
}

/** Narrow a CapabilityResult to a CapabilityNode. */
function asCapability(result: Awaited<ReturnType<Registry["action"]>>): CapabilityNode {
  if (result.kind !== "capability") throw new Error("expected CapabilityNode");
  return result;
}

// ── Test helpers ─────────────────────────────────────────────

function nativeTransferChange(from: string, to: string, value: bigint): Change {
  return {
    kind: "nativeTransfer",
    from: getAddress(from),
    to: getAddress(to),
    value: value.toString(),
  };
}

function eventChange(
  address: string,
  eventName: "Deposit" | "Withdraw" | "Transfer",
  args: Record<string, unknown>,
): Change {
  const topics = encodeEventTopics({
    abi: ShmonadAbi,
    eventName,
    args,
  } as never) as readonly [`0x${string}`, ...`0x${string}`[]];

  let data: `0x${string}` = "0x";

  if (eventName === "Deposit" || eventName === "Withdraw") {
    data = encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [args.assets as bigint, args.shares as bigint],
    );
  } else if (eventName === "Transfer") {
    data = encodeAbiParameters([{ type: "uint256" }], [args.value as bigint]);
  }

  return {
    kind: "event",
    address: getAddress(address),
    topics,
    data,
  };
}

function mintTransfer(receiver: string, shares: bigint): Change {
  return eventChange(VAULT, "Transfer", {
    from: ZERO,
    to: getAddress(receiver),
    value: shares,
  });
}

function burnTransfer(owner: string, shares: bigint): Change {
  return eventChange(VAULT, "Transfer", {
    from: getAddress(owner),
    to: ZERO,
    value: shares,
  });
}

function depositEvent(sender: string, owner: string, assets: bigint, shares: bigint): Change {
  return eventChange(VAULT, "Deposit", {
    sender: getAddress(sender),
    owner: getAddress(owner),
    assets,
    shares,
  });
}

function withdrawEvent(
  sender: string,
  receiver: string,
  owner: string,
  assets: bigint,
  shares: bigint,
): Change {
  return eventChange(VAULT, "Withdraw", {
    sender: getAddress(sender),
    owner: getAddress(owner),
    receiver: getAddress(receiver),
    assets,
    shares,
  });
}

// ════════════════════════════════════════════════════════════
// Offline tests
// ════════════════════════════════════════════════════════════

describe("Shmonad", () => {
  // ── Metadata ──────────────────────────────────────────────

  it("loads parameter metadata with descriptions", async () => {
    const { registry } = offlineRegistry();
    const [loaded] = registry.load([{ protocol: "fastlane-shmonad", method: "stake" }]);

    expect(loaded?.params.amount).toMatchObject({
      description: expect.stringContaining("MON"),
      type: expect.objectContaining({
        description: expect.stringContaining("decimal"),
      }),
    });
  });

  it("discovers the Protocol via category and verb", async () => {
    const { registry } = offlineRegistry();
    const discovered = registry.discover({ category: "staking" });

    expect(discovered).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "fastlane-shmonad",
          verb: "stake",
        }),
      ]),
    );
  });

  // ── Capabilities ──────────────────────────────────────────

  it("stake returns exactly one direct TransactionNode", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "stake", ACCOUNT, {
      amount: "1.5",
    });
    const capability = asCapability(result);

    expect(capability).toMatchObject({
      kind: "capability",
      protocol: "fastlane-shmonad",
      method: "stake",
      receipt: "stakeReceipt",
    });

    const [tx] = flattenCapabilityTree(capability);
    if (!tx) throw new Error("missing stake transaction");
    expect(tx.transaction.to.toLowerCase()).toBe(VAULT.toLowerCase());
  });

  it("unstake returns exactly one direct TransactionNode", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "unstake", ACCOUNT, {
      amount: "50",
    });
    const capability = asCapability(result);

    const [tx] = flattenCapabilityTree(capability);
    if (!tx) throw new Error("missing unstake transaction");
    expect(tx.transaction.to.toLowerCase()).toBe(VAULT.toLowerCase());
  });

  // ── Queries ───────────────────────────────────────────────

  it("queries shMON balance", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "balanceOf", ACCOUNT, {
      owner: ACCOUNT,
    });

    expect(result).toMatchObject({
      kind: "query",
      data: {
        token: VAULT,
        symbol: "shMON",
        decimals: 18,
        balance: expect.stringMatching(/^\d+$/),
      },
    });
  });

  it("queries exchange rate", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "exchangeRate", ACCOUNT, {});

    expect(result).toMatchObject({
      kind: "query",
      data: {
        token: VAULT,
        symbol: "shMON",
        decimals: 18,
        rate: expect.stringMatching(/^\d+\.\d+$/),
        totalAssets: expect.stringMatching(/^\d+$/),
        totalShares: expect.stringMatching(/^\d+$/),
      },
    });
  });

  // ── Receipts ──────────────────────────────────────────────

  it("stakeReceipt parses ordered Changes into a typed Outcome", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "stake", ACCOUNT, {
      amount: "1.5",
    });
    const capability = asCapability(result);

    const amount = 1_500_000_000_000_000_000n;
    const shares = 1_425_000_000_000_000_000n;

    const changes: readonly Change[] = [
      mintTransfer(ACCOUNT, shares),
      depositEvent(ACCOUNT, ACCOUNT, amount, shares),
      nativeTransferChange(ACCOUNT, VAULT, amount),
    ];

    const receipt = registry.parseReceipt(capability, changes);

    expect(receipt.outcome).toEqual({
      operation: "stake",
      account: ACCOUNT,
      assets: amount.toString(),
      shares: shares.toString(),
    });

    expect(receipt.changes).toHaveLength(3);
    const c0 = asChange(receipt.changes[0]);
    const c1 = asChange(receipt.changes[1]);
    const c2 = asChange(receipt.changes[2]);
    expect(c0.change).toBe(changes[0]);
    expect(c1.change).toBe(changes[1]);
    expect(c2.change).toBe(changes[2]);
  });

  it("unstakeReceipt parses ordered Changes into a typed Outcome", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "unstake", ACCOUNT, {
      amount: "10",
    });
    const capability = asCapability(result);

    const shares = 10_000_000_000_000_000_000n;
    const assets = 10_526_000_000_000_000_000n;

    const changes: readonly Change[] = [
      burnTransfer(ACCOUNT, shares),
      withdrawEvent(ACCOUNT, ACCOUNT, ACCOUNT, assets, shares),
      nativeTransferChange(VAULT, ACCOUNT, assets),
    ];

    const receipt = registry.parseReceipt(capability, changes);

    expect(receipt.outcome).toEqual({
      operation: "unstake",
      account: ACCOUNT,
      shares: shares.toString(),
      assets: assets.toString(),
    });

    expect(receipt.changes).toHaveLength(3);
    const u0 = asChange(receipt.changes[0]);
    const u1 = asChange(receipt.changes[1]);
    const u2 = asChange(receipt.changes[2]);
    expect(u0.change).toBe(changes[0]);
    expect(u1.change).toBe(changes[1]);
    expect(u2.change).toBe(changes[2]);
  });

  // ── Error handling ────────────────────────────────────────

  it("rejects missing Deposit event in stakeReceipt", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "stake", ACCOUNT, {
      amount: "1",
    });
    const capability = asCapability(result);

    const changes: readonly Change[] = [
      mintTransfer(ACCOUNT, 1_000_000_000_000_000_000n),
      nativeTransferChange(ACCOUNT, VAULT, 1_000_000_000_000_000_000n),
    ];

    expect(() => registry.parseReceipt(capability, changes)).toThrow("Deposit");
  });

  it("rejects missing Withdraw event in unstakeReceipt", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "unstake", ACCOUNT, {
      amount: "1",
    });
    const capability = asCapability(result);

    const changes: readonly Change[] = [
      burnTransfer(ACCOUNT, 1_000_000_000_000_000_000n),
      nativeTransferChange(VAULT, ACCOUNT, 1_000_000_000_000_000_000n),
    ];

    expect(() => registry.parseReceipt(capability, changes)).toThrow("Withdraw");
  });

  it("verifies exact Change object identity and order", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "stake", ACCOUNT, {
      amount: "1.5",
    });
    const capability = asCapability(result);

    const amount = 1_500_000_000_000_000_000n;
    const shares = 1_425_000_000_000_000_000n;

    const changes: readonly Change[] = [
      nativeTransferChange(ACCOUNT, VAULT, amount),
      mintTransfer(ACCOUNT, shares),
      depositEvent(ACCOUNT, ACCOUNT, amount, shares),
    ];

    const receipt = registry.parseReceipt(capability, changes);

    // verifyReceiptCoverage checks exact object identity, length, and order
    expect(() => verifyReceiptCoverage(changes, receipt)).not.toThrow();
  });

  it("rejects duplicate Deposit events", async () => {
    const { registry } = offlineRegistry();
    const result = await registry.action("fastlane-shmonad", "stake", ACCOUNT, {
      amount: "1",
    });
    const capability = asCapability(result);

    const amount = 1_000_000_000_000_000_000n;

    const changes: readonly Change[] = [
      mintTransfer(ACCOUNT, amount),
      depositEvent(ACCOUNT, ACCOUNT, amount, amount),
      depositEvent(ACCOUNT, ACCOUNT, amount, amount),
      nativeTransferChange(ACCOUNT, VAULT, amount),
    ];

    expect(() => registry.parseReceipt(capability, changes)).toThrow("multiple Deposit");
  });
});

// ════════════════════════════════════════════════════════════
// Live Monad mainnet tests
// ════════════════════════════════════════════════════════════

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Shmonad mainnet", () => {
  it("has deployed bytecode at shMONAD address", { timeout: 30_000 }, async () => {
    const runtime = await monadRuntime();
    const code = await runtime.client.getCode({ address: SHMONAD_ADDRESS });
    expect(code?.length).toBeGreaterThan(2);
  });

  it("simulates a stake and returns a typed Receipt with zero warnings", {
    timeout: 180_000,
  }, async () => {
    // Dynamic import so the module can resolve even when
    // @themoss/simulator is not in this package's dependencies.
    const { createTraceSimulator } = await import("@themoss/simulator");
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Shmonad);

    const result = await registry.action("fastlane-shmonad", "stake", ACCOUNT, {
      amount: "0.001",
    });
    const capability = asCapability(result);

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "stake",
      account: ACCOUNT,
    });
  });
});
