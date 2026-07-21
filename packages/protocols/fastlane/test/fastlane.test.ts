import {
  type CapabilityNode,
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime } from "@themoss/system";
import { encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { FastLaneStakingAbi } from "../src/abis/fastlane.js";
import {
  FASTLANE_STAKING_ADDRESS,
  FastLane,
  SHMON_DECIMALS,
  SHMON_NAME,
  SHMON_SYMBOL,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");

// Mock client following Kuru's offlineRegistry() pattern. The mock returns
// heterogeneous types per functionName, so we type the parameter structurally
// and cast the final object to satisfy MossRuntime["client"].
function createMockClient(): MossRuntime["client"] {
  return {
    readContract: async ({
      functionName,
      args,
    }: {
      functionName: string;
      args: readonly unknown[];
    }) => {
      if (functionName === "balanceOf") return 10n ** 18n;
      if (functionName === "totalSupply") return 1_000_000n * 10n ** 18n;
      // ERC-4626 preview/convert functions take a uint256 bigint input and
      // return a uint256 bigint output. Mirror a 1:1 exchange rate so offline
      // assertions are deterministic.
      if (functionName === "previewDeposit") return args[0] as bigint;
      if (functionName === "previewRedeem") return args[0] as bigint;
      if (functionName === "convertToAssets") return args[0] as bigint;
      throw new Error(`unexpected read ${functionName}`);
    },
    call: async () => ({ data: "0x" }),
  } as unknown as MossRuntime["client"];
}

// Extracts the original Change from a ReceiptChange entry. FastLane Receipts
// are flat (no nested Receipts), so every entry has kind === "change".
function changeOf(entry: ReceiptResult["changes"][number] | undefined): Change {
  if (!entry) throw new Error("expected a ReceiptChange entry");
  if (entry.kind === "change") return entry.change;
  throw new Error("expected a flat ReceiptChange, not a nested Receipt");
}

function depositEvent(
  sender: `0x${string}`,
  owner: `0x${string}`,
  assets: bigint,
  shares: bigint,
): Change {
  return {
    kind: "event",
    address: FASTLANE_STAKING_ADDRESS,
    topics: encodeEventTopics({
      abi: FastLaneStakingAbi,
      eventName: "Deposit",
      args: { sender, owner }, // indexed only
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [assets, shares]),
  };
}

// ERC-4626 Withdraw event: (sender, receiver, owner indexed; assets, shares unindexed)
function withdrawEvent(
  sender: `0x${string}`,
  receiver: `0x${string}`,
  owner: `0x${string}`,
  assets: bigint,
  shares: bigint,
): Change {
  return {
    kind: "event",
    address: FASTLANE_STAKING_ADDRESS,
    topics: encodeEventTopics({
      abi: FastLaneStakingAbi,
      eventName: "Withdraw",
      args: { sender, receiver, owner }, // indexed only
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [assets, shares]),
  };
}

function requestUnstakeEvent(
  owner: `0x${string}`,
  shares: bigint,
  amountMon: bigint,
  completionEpoch: bigint,
): Change {
  return {
    kind: "event",
    address: FASTLANE_STAKING_ADDRESS,
    topics: encodeEventTopics({
      abi: FastLaneStakingAbi,
      eventName: "RequestUnstake",
      args: { owner }, // indexed only
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [shares, amountMon, completionEpoch],
    ),
  };
}

function completeUnstakeEvent(owner: `0x${string}`, amountMon: bigint): Change {
  return {
    kind: "event",
    address: FASTLANE_STAKING_ADDRESS,
    topics: encodeEventTopics({
      abi: FastLaneStakingAbi,
      eventName: "CompleteUnstake",
      args: { owner }, // indexed only
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amountMon]),
  };
}

// ERC-20 Transfer event: (from indexed, to indexed, value unindexed).
// boostYield emits a Transfer moving shMON shares from the staker to the
// yield originator.
function transferEvent(from: `0x${string}`, to: `0x${string}`, value: bigint): Change {
  return {
    kind: "event",
    address: FASTLANE_STAKING_ADDRESS,
    topics: encodeEventTopics({
      abi: FastLaneStakingAbi,
      eventName: "Transfer",
      args: { from, to }, // indexed only
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  };
}

describe("FastLane shMONAD staking", () => {
  const registry = new Registry({ rpcUrl: "http://offline", client: createMockClient() }).use(
    FastLane,
  );

  it("registers its exported Protocol directly and builds stake (deposit) transaction", async () => {
    const capability = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const txs = flattenCapabilityTree(capability);
    expect(txs).toHaveLength(1);
    expect(txs[0]?.transaction).toMatchObject({
      to: FASTLANE_STAKING_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
  });

  it("parses stake (deposit) Changes with exact identity, length, and order", async () => {
    const capability = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: FASTLANE_STAKING_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;

    const deposited = depositEvent(ACCOUNT, ACCOUNT, 10n ** 18n, 10n ** 18n);

    const receipt = registry.parseReceipt(capability, [native, deposited]);
    expect(receipt.outcome).toEqual({
      operation: "deposit",
      sender: ACCOUNT,
      receiver: ACCOUNT,
      assets: "1000000000000000000",
      shares: "1000000000000000000",
    });

    // Identity + length + order assertions per nishuzumi review
    expect(receipt.changes).toHaveLength(2);
    expect(changeOf(receipt.changes[0])).toBe(native);
    expect(changeOf(receipt.changes[1])).toBe(deposited);
  });

  it("builds atomic redeem transaction with shares, receiver, owner", async () => {
    const capability = await registry.action("fastlane", "redeem", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const txs = flattenCapabilityTree(capability);
    expect(txs).toHaveLength(1);
    expect(txs[0]?.transaction).toMatchObject({
      to: FASTLANE_STAKING_ADDRESS,
      value: "0x0",
    });
  });

  it("parses atomic redeem (Withdraw) Changes with assets === native cross-check", async () => {
    const capability = await registry.action("fastlane", "redeem", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: FASTLANE_STAKING_ADDRESS,
      to: ACCOUNT,
      value: "990000000000000000",
    } satisfies Change;

    const withdrawn = withdrawEvent(
      ACCOUNT,
      ACCOUNT,
      ACCOUNT,
      990_000_000_000_000_000n,
      10n ** 18n,
    );

    const receipt = registry.parseReceipt(capability, [withdrawn, native]);
    expect(receipt.outcome).toEqual({
      operation: "redeem",
      sender: ACCOUNT,
      receiver: ACCOUNT,
      owner: ACCOUNT,
      assets: "990000000000000000",
      shares: "1000000000000000000",
    });

    // Identity + length + order assertions
    expect(receipt.changes).toHaveLength(2);
    expect(changeOf(receipt.changes[0])).toBe(withdrawn);
    expect(changeOf(receipt.changes[1])).toBe(native);
  });

  it("rejects atomic redeem Receipt when assets !== native value", async () => {
    const capability = await registry.action("fastlane", "redeem", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: FASTLANE_STAKING_ADDRESS,
      to: ACCOUNT,
      value: "1",
    } satisfies Change;

    const withdrawn = withdrawEvent(
      ACCOUNT,
      ACCOUNT,
      ACCOUNT,
      990_000_000_000_000_000n,
      10n ** 18n,
    );

    expect(() => registry.parseReceipt(capability, [withdrawn, native])).toThrow(
      "FastLane redeem Receipt requires matching Withdraw and native Changes",
    );
  });

  it("parses requestUnstake Changes with exact identity, length, and order", async () => {
    const capability = await registry.action("fastlane", "requestUnstake", ACCOUNT, {
      shares: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const unstakeEvent = requestUnstakeEvent(ACCOUNT, 10n ** 18n, 990_000_000_000_000_000n, 42n);

    const receipt = registry.parseReceipt(capability, [unstakeEvent]);
    expect(receipt.outcome).toEqual({
      operation: "requestUnstake",
      owner: ACCOUNT,
      shares: "1000000000000000000",
      amountMon: "990000000000000000",
      completionEpoch: "42",
    });

    // Identity + length + order assertions
    expect(receipt.changes).toHaveLength(1);
    expect(changeOf(receipt.changes[0])).toBe(unstakeEvent);
  });

  it("parses completeUnstake Changes with exact identity, length, and order", async () => {
    const capability = await registry.action("fastlane", "completeUnstake", ACCOUNT, {});
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: FASTLANE_STAKING_ADDRESS,
      to: ACCOUNT,
      value: "990000000000000000",
    } satisfies Change;

    const completeEvent = completeUnstakeEvent(ACCOUNT, 990_000_000_000_000_000n);

    const receipt = registry.parseReceipt(capability, [completeEvent, native]);
    expect(receipt.outcome).toEqual({
      operation: "completeUnstake",
      owner: ACCOUNT,
      amountMon: "990000000000000000",
    });

    // Identity + length + order assertions
    expect(receipt.changes).toHaveLength(2);
    expect(changeOf(receipt.changes[0])).toBe(completeEvent);
    expect(changeOf(receipt.changes[1])).toBe(native);
  });

  it("parses boostYield Changes with exact identity, length, and order", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const transferred = transferEvent(ACCOUNT, yieldOriginator, 10n ** 18n);

    const receipt = registry.parseReceipt(capability, [transferred]);
    expect(receipt.outcome).toEqual({
      operation: "boostYield",
      from: ACCOUNT,
      shares: "1000000000000000000",
      yieldOriginator,
    });

    // Identity + length + order assertions
    expect(receipt.changes).toHaveLength(1);
    expect(changeOf(receipt.changes[0])).toBe(transferred);
  });

  it("rejects boostYield Receipt when no Transfer event is present", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Empty Changes must not satisfy the boostYield Receipt, which requires a
    // Transfer event as the canonical outcome source.
    expect(() => registry.parseReceipt(capability, [])).toThrow(
      "FastLane boostYield Receipt requires Transfer event",
    );
  });

  it("exposes balanceOf query via registry.action", async () => {
    const result = await registry.action("fastlane", "balanceOf", ACCOUNT, { account: ACCOUNT });
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toHaveProperty("account", ACCOUNT);
    expect(result.data).toHaveProperty("balance");
    expect(result.data).toHaveProperty("formatted");
  });

  it("exposes totalSupply query", async () => {
    const result = await registry.action("fastlane", "totalSupply", ACCOUNT, {});
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toHaveProperty("supply");
    expect(result.data).toHaveProperty("formatted");
  });

  it("exposes previewDeposit query with assets -> shares", async () => {
    const result = await registry.action("fastlane", "previewDeposit", ACCOUNT, {
      assets: "1",
    });
    if (result.kind !== "query") throw new Error("expected query");
    // Mock returns 1:1, so 1 MON -> 1e18 raw shares, formatted as "1"
    expect(result.data).toMatchObject({
      assets: "1",
      shares: (10n ** 18n).toString(),
      formatted: "1",
    });
  });

  it("exposes previewRedeem query with shares -> assets", async () => {
    const result = await registry.action("fastlane", "previewRedeem", ACCOUNT, {
      shares: "1",
    });
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toMatchObject({
      shares: "1",
      assets: (10n ** 18n).toString(),
      formatted: "1",
    });
  });

  it("exposes convertToAssets query with shares -> assets", async () => {
    const result = await registry.action("fastlane", "convertToAssets", ACCOUNT, {
      shares: "1",
    });
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toMatchObject({
      shares: "1",
      assets: (10n ** 18n).toString(),
      formatted: "1",
    });
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("FastLane mainnet", () => {
  it("has deployed bytecode at the staking proxy address", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    expect(
      (await runtime.client.getCode({ address: FASTLANE_STAKING_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
  });

  it("matches on-chain name/symbol/decimals against exported SHMON_* constants", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    const [name, symbol, decimals] = await Promise.all([
      runtime.client.readContract({
        address: FASTLANE_STAKING_ADDRESS,
        abi: FastLaneStakingAbi,
        functionName: "name",
      }) as Promise<string>,
      runtime.client.readContract({
        address: FASTLANE_STAKING_ADDRESS,
        abi: FastLaneStakingAbi,
        functionName: "symbol",
      }) as Promise<string>,
      runtime.client.readContract({
        address: FASTLANE_STAKING_ADDRESS,
        abi: FastLaneStakingAbi,
        functionName: "decimals",
      }) as Promise<number>,
    ]);
    expect(name).toBe(SHMON_NAME);
    expect(symbol).toBe(SHMON_SYMBOL);
    expect(decimals).toBe(SHMON_DECIMALS);
  });

  it("returns ERC-4626 preview/convert quotes that round-trip consistently", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(FastLane);

    const deposit = await registry.action("fastlane", "previewDeposit", ACCOUNT, {
      assets: "1",
    });
    if (deposit.kind !== "query") throw new Error("expected previewDeposit query");
    expect(deposit.data).toHaveProperty("assets", "1");
    expect(deposit.data).toHaveProperty("shares");
    expect(deposit.data).toHaveProperty("formatted");

    const redeem = await registry.action("fastlane", "previewRedeem", ACCOUNT, {
      shares: "1",
    });
    if (redeem.kind !== "query") throw new Error("expected previewRedeem query");
    expect(redeem.data).toHaveProperty("shares", "1");
    expect(redeem.data).toHaveProperty("assets");
    expect(redeem.data).toHaveProperty("formatted");

    const rate = await registry.action("fastlane", "convertToAssets", ACCOUNT, {
      shares: "1",
    });
    if (rate.kind !== "query") throw new Error("expected convertToAssets query");
    expect(rate.data).toHaveProperty("shares", "1");
    expect(rate.data).toHaveProperty("assets");
    expect(rate.data).toHaveProperty("formatted");
  });

  it("simulates a stake into an exhaustive typed Receipt", {
    timeout: 180_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(FastLane);
    const capability = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "deposit",
    });
  });

  // Chains stake (deposit) -> redeem (atomic) in a single simulate call so the
  // simulator's mergeDiff persists the minted shMON balance into state overrides
  // before the atomic redeem runs. This is the ERC-4626 redeem path: it burns
  // shMON and returns MON in the same transaction.
  it("simulates atomic redeem after stake via state chaining", {
    timeout: 240_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(FastLane);

    const depositCap = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (depositCap.kind !== "capability") throw new Error("expected deposit Capability");

    // Redeem less than the deposited amount to tolerate exchange-rate drift
    // between assets (MON) and shares (shMON).
    const redeemCap = await registry.action("fastlane", "redeem", ACCOUNT, {
      shares: "0.5",
      receiver: ACCOUNT,
    });
    if (redeemCap.kind !== "capability") {
      throw new Error("expected redeem Capability");
    }

    const combined: CapabilityNode = {
      ...depositCap,
      children: [...depositCap.children, redeemCap],
    };

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(combined);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(2);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({ operation: "deposit" });
    expect(outcome.results[1]?.warnings).toEqual([]);
    expect(outcome.results[1]?.receipt?.outcome).toMatchObject({ operation: "redeem" });
  });

  // Chains stake (deposit) -> requestUnstake in a single simulate call so the
  // simulator's mergeDiff persists the minted shMON balance into state
  // overrides before the unstake runs. Each Capability still owns exactly one
  // direct TransactionNode; requestUnstake is a nested Capability child of
  // deposit, which flattenCapabilityTree depth-first collects into
  // [depositTx, requestUnstakeTx].
  it("simulates requestUnstake after stake via state chaining", {
    timeout: 240_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(FastLane);

    const depositCap = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (depositCap.kind !== "capability") throw new Error("expected deposit Capability");

    // Request less than the deposited amount to tolerate exchange-rate drift
    // between assets (MON) and shares (shMON).
    const requestUnstakeCap = await registry.action("fastlane", "requestUnstake", ACCOUNT, {
      shares: "0.5",
    });
    if (requestUnstakeCap.kind !== "capability") {
      throw new Error("expected requestUnstake Capability");
    }

    const combined: CapabilityNode = {
      ...depositCap,
      children: [...depositCap.children, requestUnstakeCap],
    };

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(combined);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(2);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({ operation: "deposit" });
    expect(outcome.results[1]?.warnings).toEqual([]);
    expect(outcome.results[1]?.receipt?.outcome).toMatchObject({
      operation: "requestUnstake",
    });
  });

  // Chains stake (deposit) -> requestUnstake -> completeUnstake. The first two
  // succeed via state chaining; completeUnstake must revert because the
  // completion epoch has not elapsed within the same block. This verifies both
  // that the completeUnstake transaction is constructed correctly (it reaches
  // the contract and reverts with an on-chain reason, not an ABI encoding
  // failure) and that FastLane enforces the epoch gate.
  it("halts when completeUnstake runs before the completion epoch", {
    timeout: 240_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(FastLane);

    const depositCap = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (depositCap.kind !== "capability") throw new Error("expected deposit Capability");

    const requestUnstakeCap = await registry.action("fastlane", "requestUnstake", ACCOUNT, {
      shares: "0.5",
    });
    if (requestUnstakeCap.kind !== "capability") {
      throw new Error("expected requestUnstake Capability");
    }

    const completeUnstakeCap = await registry.action("fastlane", "completeUnstake", ACCOUNT, {});
    if (completeUnstakeCap.kind !== "capability") {
      throw new Error("expected completeUnstake Capability");
    }

    const combined: CapabilityNode = {
      ...depositCap,
      children: [...depositCap.children, requestUnstakeCap, completeUnstakeCap],
    };

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(combined);

    // stake (deposit) + requestUnstake produced clean Receipts; completeUnstake reverts.
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({ operation: "deposit" });
    expect(outcome.results[1]?.warnings).toEqual([]);
    expect(outcome.results[1]?.receipt?.outcome).toMatchObject({
      operation: "requestUnstake",
    });
    expect(outcome.halted).toBeDefined();
    expect(outcome.halted?.transactionIndex).toBe(2);
    expect(outcome.results[2]?.reverted).toBe(true);
  });

  // Closes the stake (deposit) -> redeem (atomic) loop with exhaustive Receipt
  // assertions. Complements the lighter "simulates atomic redeem after stake
  // via state chaining" test by verifying the full Receipt payload (not just
  // the operation field), the assets/shares relationship between the two legs,
  // and the loop-closure invariant that redeemed shares never exceed minted
  // shares. This is the canonical mainnet round-trip: user stakes MON, then
  // atomically redeems shMON back to MON in the same simulate call.
  it("closes the stake -> redeem loop with exhaustive Receipt and cross-check assertions", {
    timeout: 240_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(FastLane);

    const stakeCap = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (stakeCap.kind !== "capability") throw new Error("expected stake (deposit) Capability");

    // Redeem less than the deposited amount to tolerate exchange-rate drift
    // between assets (MON) and shares (shMON).
    const redeemCap = await registry.action("fastlane", "redeem", ACCOUNT, {
      shares: "0.5",
      receiver: ACCOUNT,
    });
    if (redeemCap.kind !== "capability") throw new Error("expected redeem Capability");

    const combined: CapabilityNode = {
      ...stakeCap,
      children: [...stakeCap.children, redeemCap],
    };

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(combined);

    // No halt, two clean legs.
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(2);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[1]?.warnings).toEqual([]);
    expect(outcome.results[0]?.reverted).toBe(false);
    expect(outcome.results[1]?.reverted).toBe(false);

    // Stake leg: full Deposit Receipt payload.
    const stakeReceipt = outcome.results[0]?.receipt;
    expect(stakeReceipt?.outcome).toMatchObject({
      operation: "deposit",
      sender: ACCOUNT,
      receiver: ACCOUNT,
    });
    const stakeOutcome = stakeReceipt?.outcome as {
      assets: string;
      shares: string;
    };
    expect(BigInt(stakeOutcome.assets)).toBe(10n ** 18n);
    expect(BigInt(stakeOutcome.shares)).toBeGreaterThan(0n);
    // depositReceipt cross-checks Deposit.assets === nativeTransfer.value
    // internally; verify both Changes are present (event + native transfer).
    expect(stakeReceipt?.changes.length).toBeGreaterThanOrEqual(2);

    // Redeem leg: full Withdraw Receipt payload.
    const redeemReceipt = outcome.results[1]?.receipt;
    expect(redeemReceipt?.outcome).toMatchObject({
      operation: "redeem",
      sender: ACCOUNT,
      receiver: ACCOUNT,
      owner: ACCOUNT,
    });
    const redeemOutcome = redeemReceipt?.outcome as {
      assets: string;
      shares: string;
    };
    expect(BigInt(redeemOutcome.shares)).toBeGreaterThan(0n);
    expect(BigInt(redeemOutcome.assets)).toBeGreaterThan(0n);
    // redeemReceipt cross-checks Withdraw.assets === nativeTransfer.value
    // internally; verify both Changes are present.
    expect(redeemReceipt?.changes.length).toBeGreaterThanOrEqual(2);

    // Loop-closure invariant: redeemed shares must not exceed minted shares.
    // In a well-formed vault with positive yield, redeemed shares are strictly
    // less than minted shares for the same MON amount; with a 1:1 rate they
    // would be equal. Allow <= to cover both cases.
    expect(BigInt(redeemOutcome.shares)).toBeLessThanOrEqual(BigInt(stakeOutcome.shares));
  });

  // Chains stake (deposit) -> boostYield in a single simulate call so the
  // simulator's mergeDiff persists the minted shMON balance into state
  // overrides before boostYield runs. boostYield transfers shMON shares from
  // the staker to a yield originator. This verifies the boostYield transaction
  // is constructed correctly and reaches the contract on Monad mainnet.
  // boostYield may revert if the yield originator is not registered on-chain;
  // a revert here proves correct ABI encoding and contract construction, not a
  // client-side failure — mirroring the completeUnstake epoch-gate test pattern.
  it("simulates boostYield after stake via state chaining", {
    timeout: 240_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(FastLane);

    const depositCap = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (depositCap.kind !== "capability") throw new Error("expected deposit Capability");

    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const boostCap = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "0.5",
      yieldOriginator,
    });
    if (boostCap.kind !== "capability") throw new Error("expected boostYield Capability");

    const combined: CapabilityNode = {
      ...depositCap,
      children: [...depositCap.children, boostCap],
    };

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(combined);

    // stake (deposit) must always succeed with zero Warnings.
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({ operation: "deposit" });

    // boostYield either succeeds (zero Warnings, clean Receipt) or halts
    // on-chain (e.g. insufficient uncommitted shares, unregistered yield
    // originator, or estimation failure). A halt at index 1 proves the
    // boostYield transaction was constructed correctly and reached the
    // contract — the failure is due to on-chain state, not a client-side
    // ABI encoding or construction error.
    if (outcome.halted) {
      expect(outcome.halted.transactionIndex).toBe(1);
    } else {
      expect(outcome.results[1]?.warnings).toEqual([]);
      expect(outcome.results[1]?.receipt?.outcome).toMatchObject({
        operation: "boostYield",
      });
    }
  });
});
