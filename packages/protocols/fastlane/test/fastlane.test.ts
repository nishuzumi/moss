import {
  type CapabilityNode,
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { createTraceSimulator, type SimulateOutcome } from "@themoss/simulator";
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
// boostYield burns the shMON it spends, so the settling Transfer lands here.
const BURN = getAddress("0x0000000000000000000000000000000000000000");

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

// Extracts the original Change from a ReceiptChange entry. FastLane describes
// its own events inline and delegates the rest, so an entry is either a flat
// ReceiptChange or a single-Change ERC-20 dependency Receipt.
function changeOf(entry: ReceiptResult["changes"][number] | undefined): Change {
  if (!entry) throw new Error("expected a ReceiptChange entry");
  if (entry.kind === "change") return entry.change;
  const [nested] = entry.changes;
  if (entry.changes.length === 1 && nested?.kind === "change") return nested.change;
  throw new Error("expected a flat ReceiptChange or a single-Change nested Receipt");
}

// Pulls the native MON Changes back out of a Receipt. A live test can then name
// the endpoints the parser bound instead of trusting that it bound anything.
function nativeTransfersOf(
  changes: readonly ReceiptResult["changes"][number][] | undefined,
): Extract<Change, { kind: "nativeTransfer" }>[] {
  if (!changes) throw new Error("expected Receipt changes");
  return changes
    .map((entry) => changeOf(entry))
    .filter(
      (change): change is Extract<Change, { kind: "nativeTransfer" }> =>
        change.kind === "nativeTransfer",
    );
}

function depositEvent(
  sender: `0x${string}`,
  owner: `0x${string}`,
  assets: bigint,
  shares: bigint,
  emitter: `0x${string}` = FASTLANE_STAKING_ADDRESS,
): Change {
  return {
    kind: "event",
    address: emitter,
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
// boostYield settles with one of these, burning the staker's shMON.
function transferEvent(
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
  emitter: `0x${string}` = FASTLANE_STAKING_ADDRESS,
): Change {
  return {
    kind: "event",
    address: emitter,
    topics: encodeEventTopics({
      abi: FastLaneStakingAbi,
      eventName: "Transfer",
      args: { from, to }, // indexed only
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  };
}

// FastLane BoostYield event: (sender, yieldOriginator, validatorId indexed;
// amount, sharesBurned unindexed). This is the canonical boostYield evidence:
// it names the credited originator, which the burn Transfer cannot.
function boostYieldEvent(
  sender: `0x${string}`,
  yieldOriginator: `0x${string}`,
  amount: bigint,
  options: {
    validatorId?: bigint;
    sharesBurned?: boolean;
    emitter?: `0x${string}`;
  } = {},
): Change {
  return {
    kind: "event",
    address: options.emitter ?? FASTLANE_STAKING_ADDRESS,
    topics: encodeEventTopics({
      abi: FastLaneStakingAbi,
      eventName: "BoostYield",
      args: { sender, yieldOriginator, validatorId: options.validatorId ?? 0n }, // indexed only
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "bool" }],
      [amount, options.sharesBurned ?? true],
    ),
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

  // The simulator hands Receipt parsers the addresses the trace reported, which
  // are lowercase, while decodeEventLog checksums the addresses it decodes. Both
  // spellings name the same account, so endpoint binding compares them
  // case-insensitively.
  it("parses stake (deposit) Changes whose native endpoints are lowercase", async () => {
    const capability = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT.toLowerCase() as `0x${string}`,
      to: FASTLANE_STAKING_ADDRESS.toLowerCase() as `0x${string}`,
      value: "1000000000000000000",
    } satisfies Change;

    const deposited = depositEvent(ACCOUNT, ACCOUNT, 10n ** 18n, 10n ** 18n);

    const receipt = registry.parseReceipt(capability, [native, deposited]);
    expect(receipt.outcome).toMatchObject({ operation: "deposit", sender: ACCOUNT });
  });

  it("rejects stake (deposit) Receipt when the Deposit event comes from another emitter", async () => {
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

    // A validly encoded Deposit from any other contract is not FastLane
    // evidence. Once the emitter check rejects it, the Change falls through to
    // the ERC-20 dependency, which does not recognise a Deposit topic either.
    const forged = depositEvent(
      ACCOUNT,
      ACCOUNT,
      10n ** 18n,
      10n ** 18n,
      getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
    );

    expect(() => registry.parseReceipt(capability, [native, forged])).toThrow(
      "emitted an unsupported ERC-20 event",
    );
  });

  it("rejects stake (deposit) Receipt when the staked MON does not reach FastLane", async () => {
    const capability = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Right amount, wrong destination: the MON never reaches the vault.
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
      value: "1000000000000000000",
    } satisfies Change;

    const deposited = depositEvent(ACCOUNT, ACCOUNT, 10n ** 18n, 10n ** 18n);

    expect(() => registry.parseReceipt(capability, [native, deposited])).toThrow(
      "FastLane deposit Receipt requires the staked MON to move from the Deposit sender to FastLane",
    );
  });

  it("rejects stake (deposit) Receipt when someone else paid the staked MON", async () => {
    const capability = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Right amount, right destination, wrong payer. Checking the destination
    // alone accepts another account's MON as proof that this one staked, so the
    // Receipt binds both ends of the transfer.
    const native = {
      kind: "nativeTransfer",
      from: getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
      to: FASTLANE_STAKING_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;

    const deposited = depositEvent(ACCOUNT, ACCOUNT, 10n ** 18n, 10n ** 18n);

    expect(() => registry.parseReceipt(capability, [native, deposited])).toThrow(
      "FastLane deposit Receipt requires the staked MON to move from the Deposit sender to FastLane",
    );
  });

  it("rejects stake (deposit) Receipt when assets !== native value", async () => {
    const capability = await registry.action("fastlane", "deposit", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Right endpoints, wrong amount: the Deposit event claims 1 MON and 1 wei
    // moved.
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: FASTLANE_STAKING_ADDRESS,
      value: "1",
    } satisfies Change;

    const deposited = depositEvent(ACCOUNT, ACCOUNT, 10n ** 18n, 10n ** 18n);

    expect(() => registry.parseReceipt(capability, [native, deposited])).toThrow(
      "FastLane deposit Receipt requires matching Deposit and native Changes",
    );
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

  it("rejects atomic redeem Receipt when the MON payout goes to another recipient", async () => {
    const capability = await registry.action("fastlane", "redeem", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Right amount, wrong recipient. Matching on the amount alone lets this
    // through and the Receipt then names the Withdraw receiver, not the account
    // that actually got the MON.
    const native = {
      kind: "nativeTransfer",
      from: FASTLANE_STAKING_ADDRESS,
      to: getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
      value: "990000000000000000",
    } satisfies Change;

    const withdrawn = withdrawEvent(
      ACCOUNT,
      ACCOUNT,
      ACCOUNT,
      990_000_000_000_000_000n,
      10n ** 18n,
    );

    expect(() => registry.parseReceipt(capability, [withdrawn, native])).toThrow(
      "FastLane redeem Receipt requires the MON payout to move from FastLane to the Withdraw receiver",
    );
  });

  it("rejects atomic redeem Receipt when the MON payout does not come from the vault", async () => {
    const capability = await registry.action("fastlane", "redeem", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // The right MON reaching the right receiver from somewhere other than the
    // vault does not prove the vault paid it out.
    const native = {
      kind: "nativeTransfer",
      from: getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
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

    expect(() => registry.parseReceipt(capability, [withdrawn, native])).toThrow(
      "FastLane redeem Receipt requires the MON payout to move from FastLane to the Withdraw receiver",
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

  it("rejects completeUnstake Receipt when the MON payout goes to another recipient", async () => {
    const capability = await registry.action("fastlane", "completeUnstake", ACCOUNT, {});
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Right amount, wrong recipient. The owner named in the Receipt never
    // receives the MON.
    const native = {
      kind: "nativeTransfer",
      from: FASTLANE_STAKING_ADDRESS,
      to: getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
      value: "990000000000000000",
    } satisfies Change;

    const completeEvent = completeUnstakeEvent(ACCOUNT, 990_000_000_000_000_000n);

    expect(() => registry.parseReceipt(capability, [completeEvent, native])).toThrow(
      "FastLane completeUnstake Receipt requires the MON payout to move from FastLane to the CompleteUnstake owner",
    );
  });

  it("rejects completeUnstake Receipt when the MON payout does not come from the vault", async () => {
    const capability = await registry.action("fastlane", "completeUnstake", ACCOUNT, {});
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Same amount, same owner, wrong source. A completion is the vault paying
    // out, so MON arriving from anywhere else is not evidence of one.
    const native = {
      kind: "nativeTransfer",
      from: getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
      to: ACCOUNT,
      value: "990000000000000000",
    } satisfies Change;

    const completeEvent = completeUnstakeEvent(ACCOUNT, 990_000_000_000_000_000n);

    expect(() => registry.parseReceipt(capability, [completeEvent, native])).toThrow(
      "FastLane completeUnstake Receipt requires the MON payout to move from FastLane to the CompleteUnstake owner",
    );
  });

  it("rejects completeUnstake Receipt when amountMon !== native value", async () => {
    const capability = await registry.action("fastlane", "completeUnstake", ACCOUNT, {});
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: FASTLANE_STAKING_ADDRESS,
      to: ACCOUNT,
      value: "1",
    } satisfies Change;

    const completeEvent = completeUnstakeEvent(ACCOUNT, 990_000_000_000_000_000n);

    expect(() => registry.parseReceipt(capability, [completeEvent, native])).toThrow(
      "FastLane completeUnstake Receipt requires matching CompleteUnstake and native Changes",
    );
  });

  // Change order, addresses and amounts here are the ones a mainnet
  // deposit -> boostYield run reported: the burn settles first, then the vault
  // says whose yield it credited and what that was worth in MON. The MON figure
  // follows the live exchange rate, so a fresh run reports a nearby number.
  it("parses boostYield Changes with exact identity, length, and order", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const burned = transferEvent(ACCOUNT, BURN, 5n * 10n ** 17n);
    const boosted = boostYieldEvent(ACCOUNT, yieldOriginator, 798_909_778_210_594_794n);

    const receipt = registry.parseReceipt(capability, [burned, boosted]);
    expect(receipt.outcome).toEqual({
      operation: "boostYield",
      sender: ACCOUNT,
      yieldOriginator,
      validatorId: "0",
      amount: "798909778210594794",
      shares: "500000000000000000",
    });

    // Identity + length + order assertions
    expect(receipt.changes).toHaveLength(2);
    expect(changeOf(receipt.changes[0])).toBe(burned);
    expect(changeOf(receipt.changes[1])).toBe(boosted);
  });

  it("preserves another token's Transfer through the ERC-20 dependency Receipt", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const burned = transferEvent(ACCOUNT, BURN, 5n * 10n ** 17n);
    // Another token moving in the same transaction is not a boostYield
    // candidate, so it neither competes with the burn nor gets dropped.
    const unrelated = transferEvent(
      ACCOUNT,
      yieldOriginator,
      42n,
      getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
    );
    const boosted = boostYieldEvent(ACCOUNT, yieldOriginator, 798_909_778_210_594_794n);

    const receipt = registry.parseReceipt(capability, [burned, unrelated, boosted]);
    expect(receipt.outcome).toMatchObject({
      operation: "boostYield",
      shares: "500000000000000000",
    });
    expect(receipt.changes).toHaveLength(3);
    expect(changeOf(receipt.changes[1])).toBe(unrelated);
  });

  it("rejects boostYield Receipt when the BoostYield event comes from another emitter", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const burned = transferEvent(ACCOUNT, BURN, 5n * 10n ** 17n);
    // A validly encoded BoostYield from any other contract is not FastLane
    // evidence. Once the emitter check rejects it, the Change falls through to
    // the ERC-20 dependency, which does not recognise a BoostYield topic.
    const forged = boostYieldEvent(ACCOUNT, yieldOriginator, 10n ** 18n, {
      emitter: getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
    });

    expect(() => registry.parseReceipt(capability, [burned, forged])).toThrow(
      "emitted an unsupported ERC-20 event",
    );
  });

  it("rejects boostYield Receipt when a second FastLane Transfer competes with the burn", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Two valid shMON Transfers with different recipients and amounts. Nothing
    // in a single-outcome Receipt distinguishes them, so keeping the first would
    // name it canonical without evidence.
    const burned = transferEvent(ACCOUNT, BURN, 5n * 10n ** 17n);
    const second = transferEvent(ACCOUNT, yieldOriginator, 7n * 10n ** 17n);
    const boosted = boostYieldEvent(ACCOUNT, yieldOriginator, 798_909_778_210_594_794n);

    expect(() => registry.parseReceipt(capability, [burned, second, boosted])).toThrow(
      "FastLane boostYield Receipt requires exactly one FastLane shMON Transfer",
    );
  });

  it("rejects boostYield Receipt when a second BoostYield event competes", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const burned = transferEvent(ACCOUNT, BURN, 5n * 10n ** 17n);
    const boosted = boostYieldEvent(ACCOUNT, yieldOriginator, 798_909_778_210_594_794n);
    const other = boostYieldEvent(
      ACCOUNT,
      getAddress("0x2222222222222222222222222222222222222222"),
      1n,
    );

    expect(() => registry.parseReceipt(capability, [burned, boosted, other])).toThrow(
      "FastLane boostYield Receipt requires exactly one FastLane BoostYield event",
    );
  });

  it("rejects boostYield Receipt when no BoostYield event is present", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Empty Changes must not satisfy the boostYield Receipt. Neither may a
    // burn on its own: without the event nothing says whose yield it credited.
    expect(() => registry.parseReceipt(capability, [])).toThrow(
      "FastLane boostYield Receipt requires exactly one FastLane BoostYield event",
    );
    expect(() =>
      registry.parseReceipt(capability, [transferEvent(ACCOUNT, BURN, 5n * 10n ** 17n)]),
    ).toThrow("FastLane boostYield Receipt requires exactly one FastLane BoostYield event");
  });

  it("rejects boostYield Receipt when the burn is another token's Transfer", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // A burn of some other token, from the right account for the right amount,
    // is not the shMON the boost spent. It is preserved as an ERC-20 Change and
    // never counts as a boostYield candidate, so the Receipt fails closed for
    // want of the shMON Transfer.
    const foreign = transferEvent(
      ACCOUNT,
      BURN,
      5n * 10n ** 17n,
      getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
    );
    const boosted = boostYieldEvent(ACCOUNT, yieldOriginator, 798_909_778_210_594_794n);

    expect(() => registry.parseReceipt(capability, [foreign, boosted])).toThrow(
      "FastLane boostYield Receipt requires exactly one FastLane shMON Transfer",
    );
  });

  it("rejects boostYield Receipt when the burn does not come from the BoostYield sender", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // Right amount, wrong staker: someone else's shMON was burned, so the
    // Receipt would credit this account for shares it never spent.
    const burned = transferEvent(
      getAddress("0xdddddddddddddddddddddddddddddddddddddddd"),
      BURN,
      5n * 10n ** 17n,
    );
    const boosted = boostYieldEvent(ACCOUNT, yieldOriginator, 798_909_778_210_594_794n);

    expect(() => registry.parseReceipt(capability, [burned, boosted])).toThrow(
      "FastLane boostYield Receipt requires the boosted shMON to be burned from the BoostYield sender",
    );
  });

  it("rejects boostYield Receipt when the shMON moves somewhere instead of being burned", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // A plain shMON transfer to the originator is what an unbound Receipt used
    // to accept as the boostYield outcome. The shares path burns instead.
    const moved = transferEvent(ACCOUNT, yieldOriginator, 5n * 10n ** 17n);
    const boosted = boostYieldEvent(ACCOUNT, yieldOriginator, 798_909_778_210_594_794n);

    expect(() => registry.parseReceipt(capability, [moved, boosted])).toThrow(
      "FastLane boostYield Receipt requires the boosted shMON to be burned from the BoostYield sender",
    );
  });

  it("rejects boostYield Receipt when the event reports no shares were burned", async () => {
    const yieldOriginator = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("fastlane", "boostYield", ACCOUNT, {
      shares: "1",
      yieldOriginator,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // sharesBurned === false is the payable MON path, which this Capability
    // never builds. Its Changes cannot be evidence for the shares call.
    const burned = transferEvent(ACCOUNT, BURN, 5n * 10n ** 17n);
    const boosted = boostYieldEvent(ACCOUNT, yieldOriginator, 10n ** 18n, {
      sharesBurned: false,
    });

    expect(() => registry.parseReceipt(capability, [burned, boosted])).toThrow(
      "FastLane boostYield Receipt requires the shares-burning boostYield path",
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

// One runtime for the whole live block. `createRuntime` verifies the chain ID on
// every call, so building one per case spent nine `eth_chainId` requests on the
// public endpoint and bought no coverage.
let runtimeOnce: Promise<MossRuntime> | undefined;
function liveRuntime(): Promise<MossRuntime> {
  runtimeOnce ??= monadRuntime();
  return runtimeOnce;
}

// Two cases simulate the same stake -> redeem chain, the state chaining one and
// the loop closure one, from the same account for the same amounts. One simulate
// of that chain is six requests against the public endpoint: one
// `eth_blockNumber`, two `callTracer` traces, one `prestateTracer` diff and two
// `eth_estimateGas`. Tracing it twice proved nothing the first trace had not, so
// the two cases share one outcome and keep their own assertions over it.
let stakeRedeemOnce: Promise<SimulateOutcome> | undefined;
function stakeRedeemOutcome(): Promise<SimulateOutcome> {
  stakeRedeemOnce ??= (async () => {
    const runtime = await liveRuntime();
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

    return createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(combined);
  })();
  return stakeRedeemOnce;
}

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("FastLane mainnet", () => {
  it("has deployed bytecode at the staking proxy address", {
    timeout: 60_000,
  }, async () => {
    const runtime = await liveRuntime();
    expect(
      (await runtime.client.getCode({ address: FASTLANE_STAKING_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
  });

  it("matches on-chain name/symbol/decimals against exported SHMON_* constants", {
    timeout: 60_000,
  }, async () => {
    const runtime = await liveRuntime();
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
    const runtime = await liveRuntime();
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
    const runtime = await liveRuntime();
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
  // shMON and returns MON in the same transaction. The trace is shared with the
  // loop closure case below.
  it("simulates atomic redeem after stake via state chaining", {
    timeout: 240_000,
  }, async () => {
    const outcome = await stakeRedeemOutcome();

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
    const runtime = await liveRuntime();
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
    const runtime = await liveRuntime();
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
    // The halt has to be the chain rejecting the call, not our own Receipt
    // failing to parse. A RECEIPT_FAILED halt also lands at index 2, so pin the
    // warning code rather than accepting any halt here.
    expect(outcome.results[2]?.warnings.map((warning) => warning.code)).toEqual(["REVERTED"]);
  });

  // Closes the stake (deposit) -> redeem (atomic) loop with exhaustive Receipt
  // assertions over the shared stake -> redeem trace. Complements the lighter
  // "simulates atomic redeem after stake via state chaining" case by verifying
  // the full Receipt payload (not just the operation field), the assets/shares
  // relationship between the two legs, and the loop-closure invariant that
  // redeemed shares never exceed minted shares. This is the canonical mainnet
  // round-trip: user stakes MON, then atomically redeems shMON back to MON in the
  // same simulate call.
  it("closes the stake -> redeem loop with exhaustive Receipt and cross-check assertions", {
    timeout: 240_000,
  }, async () => {
    const outcome = await stakeRedeemOutcome();

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
    // Mainnet reports three Changes for a stake: the native MON in, the Deposit
    // event and the shMON mint Transfer. Pin the count instead of a lower bound,
    // and name the endpoints the parser bound so the live proof does not rest on
    // the parser agreeing with itself.
    expect(stakeReceipt?.changes).toHaveLength(3);
    const stakeNatives = nativeTransfersOf(stakeReceipt?.changes);
    expect(stakeNatives).toHaveLength(1);
    expect(stakeNatives[0]?.value).toBe(stakeOutcome.assets);
    expect(stakeNatives[0]?.from.toLowerCase()).toBe(ACCOUNT.toLowerCase());
    expect(stakeNatives[0]?.to.toLowerCase()).toBe(FASTLANE_STAKING_ADDRESS.toLowerCase());

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
    // Three Changes again: the Withdraw event, the shMON burn Transfer and the
    // native MON out. The payout has to leave the vault and land on the receiver
    // the Withdraw event names.
    expect(redeemReceipt?.changes).toHaveLength(3);
    const redeemNatives = nativeTransfersOf(redeemReceipt?.changes);
    expect(redeemNatives).toHaveLength(1);
    expect(redeemNatives[0]?.value).toBe(redeemOutcome.assets);
    expect(redeemNatives[0]?.from.toLowerCase()).toBe(FASTLANE_STAKING_ADDRESS.toLowerCase());
    expect(redeemNatives[0]?.to.toLowerCase()).toBe(ACCOUNT.toLowerCase());

    // Loop-closure invariant: redeemed shares must not exceed minted shares.
    // In a well-formed vault with positive yield, redeemed shares are strictly
    // less than minted shares for the same MON amount; with a 1:1 rate they
    // would be equal. Allow <= to cover both cases.
    expect(BigInt(redeemOutcome.shares)).toBeLessThanOrEqual(BigInt(stakeOutcome.shares));
  });

  // Chains stake (deposit) -> boostYield in a single simulate call so the
  // simulator's mergeDiff persists the minted shMON balance into state
  // overrides before boostYield runs. The shares path burns the staker's shMON
  // and credits the yield originator, so mainnet reports two Changes from the
  // vault: Transfer(staker -> zero address) then BoostYield naming the
  // originator, the validator and the MON the burn was worth. The Receipt has
  // to bind them, so this asserts a clean Receipt rather than tolerating a
  // halt: an unbound parser dropped the BoostYield Change into the ERC-20
  // dependency and halted the run with RECEIPT_FAILED, which a
  // halt-tolerant assertion would have reported as a pass.
  it("simulates boostYield after stake via state chaining", {
    timeout: 240_000,
  }, async () => {
    const runtime = await liveRuntime();
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

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(2);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({ operation: "deposit" });

    expect(outcome.results[1]?.reverted).toBe(false);
    expect(outcome.results[1]?.warnings).toEqual([]);
    // The burn is exactly the shares the Capability asked for; the MON it was
    // worth follows the live exchange rate, so assert it is positive, not fixed.
    expect(outcome.results[1]?.receipt?.outcome).toMatchObject({
      operation: "boostYield",
      sender: ACCOUNT,
      yieldOriginator,
      shares: "500000000000000000",
    });
    const boosted = outcome.results[1]?.receipt?.outcome as {
      amount: string;
      validatorId: string;
    };
    expect(BigInt(boosted.amount)).toBeGreaterThan(0n);
    // The originator in this test is not registered against a validator, so the
    // vault reports validator 0. A digit-shaped assertion could not fail:
    // validatorId is always a stringified bigint.
    expect(boosted.validatorId).toBe("0");
    expect(outcome.results[1]?.receipt?.changes).toHaveLength(2);
  });
});
