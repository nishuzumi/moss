import {
  type CapabilityNode,
  type Change,
  createRuntime,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  APRMON_ADDRESS,
  APRMON_DECIMALS,
  APRMON_NAME,
  APRMON_SYMBOL,
  AprioriProtocol,
  AprMonAbi,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const OTHER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

// Extracts the original Change from a Receipt entry. Changes delegated to the
// erc20 dependency come back as nested Receipts (ADR 0011) whose single leaf
// wraps the original Change object.
function leafChangeOf(entry: ReceiptResult["changes"][number] | undefined): Change {
  if (!entry) throw new Error("expected a Receipt entry");
  if (entry.kind === "change") return entry.change;
  return leafChangeOf(entry.changes[0]);
}

function nativeChange(from: `0x${string}`, to: `0x${string}`, value: bigint): Change {
  return { kind: "nativeTransfer", from, to, value: value.toString() };
}

// Live log shape: tx 0x0e949bd6… — Transfer(zero → owner) mint, then Deposit.
function depositEvent(
  sender: `0x${string}`,
  owner: `0x${string}`,
  assets: bigint,
  shares: bigint,
  emitter: `0x${string}` = APRMON_ADDRESS,
): Change {
  return {
    kind: "event",
    address: emitter,
    topics: encodeEventTopics({
      abi: AprMonAbi,
      eventName: "Deposit",
      args: { sender, owner },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [assets, shares]),
  };
}

// Live log shape: tx 0x68316b21… — RedeemRequest(controller, owner, requestId
// indexed; sender, shares, assets in data).
function redeemRequestEvent(
  controller: `0x${string}`,
  owner: `0x${string}`,
  requestId: bigint,
  sender: `0x${string}`,
  shares: bigint,
  assets: bigint,
): Change {
  return {
    kind: "event",
    address: APRMON_ADDRESS,
    topics: encodeEventTopics({
      abi: AprMonAbi,
      eventName: "RedeemRequest",
      args: { controller, owner, requestId },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }, { type: "uint256" }],
      [sender, shares, assets],
    ),
  };
}

// Live log shape: tx 0x7413c820… — Redeem(controller, receiver, requestId
// indexed; shares, assets, fee in data); assets is net of fee.
function redeemEvent(
  controller: `0x${string}`,
  receiver: `0x${string}`,
  requestId: bigint,
  shares: bigint,
  assets: bigint,
  fee: bigint,
): Change {
  return {
    kind: "event",
    address: APRMON_ADDRESS,
    topics: encodeEventTopics({
      abi: AprMonAbi,
      eventName: "Redeem",
      args: { controller, receiver, requestId },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [shares, assets, fee],
    ),
  };
}

function transferEvent(
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
  emitter: `0x${string}` = APRMON_ADDRESS,
): Change {
  return {
    kind: "event",
    address: emitter,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  };
}

const offlineRegistry = new Registry(runtime).use(AprioriProtocol);

async function capabilityFor(
  method: "stake" | "unstake" | "claim",
  params: Record<string, string>,
): Promise<CapabilityNode> {
  const capability = await offlineRegistry.action("apriori", method, ACCOUNT, params);
  if (capability.kind !== "capability") throw new Error("expected capability");
  return capability;
}

function parseWith(capability: CapabilityNode, changes: readonly Change[]): ReceiptResult {
  return offlineRegistry.parseReceipt(capability, changes);
}

const ONE = 10n ** 18n;
// A representative claim pair: gross 1.001 MON, 0.1% fee on gross, net assets.
const CLAIM_SHARES = 950_000_000_000_000_000n;
const CLAIM_FEE = 1_001_000_000_000_000n;
const CLAIM_ASSETS = 1_000_000_000_000_000_000n;

describe("AprioriProtocol transactions", () => {
  it("builds the stake (deposit) transaction with msg.value == assets", async () => {
    const capability = await capabilityFor("stake", { amount: "1", receiver: ACCOUNT });
    const transaction = flattenCapabilityTree(capability)[0]?.transaction;
    expect(transaction?.value).toBe("0xde0b6b3a7640000");
    expect(getAddress(transaction?.to ?? ZERO)).toBe(APRMON_ADDRESS);
    expect(transaction?.data).toBe(
      encodeFunctionData({ abi: AprMonAbi, functionName: "deposit", args: [ONE, ACCOUNT] }),
    );
  });

  it("builds the unstake (requestRedeem) transaction with (shares, controller, account)", async () => {
    const capability = await capabilityFor("unstake", { shares: "1", controller: OTHER });
    const transaction = flattenCapabilityTree(capability)[0]?.transaction;
    expect(getAddress(transaction?.to ?? ZERO)).toBe(APRMON_ADDRESS);
    expect(transaction?.data).toBe(
      encodeFunctionData({
        abi: AprMonAbi,
        functionName: "requestRedeem",
        args: [ONE, OTHER, ACCOUNT],
      }),
    );
  });

  it("builds the claim (redeem) transaction with ([requestId], receiver)", async () => {
    const capability = await capabilityFor("claim", { requestId: "7", receiver: ACCOUNT });
    const transaction = flattenCapabilityTree(capability)[0]?.transaction;
    expect(getAddress(transaction?.to ?? ZERO)).toBe(APRMON_ADDRESS);
    expect(transaction?.data).toBe(
      encodeFunctionData({ abi: AprMonAbi, functionName: "redeem", args: [[7n], ACCOUNT] }),
    );
  });

  it("rejects amounts with more than 18 decimal places instead of rounding", async () => {
    await expect(
      capabilityFor("stake", { amount: "0.0000000000000000009", receiver: ACCOUNT }),
    ).rejects.toThrow(/18 decimal places/);
    await expect(
      capabilityFor("unstake", { shares: "1.0000000000000000001", controller: ACCOUNT }),
    ).rejects.toThrow(/18 decimal places/);
  });
});

describe("stakeReceipt", () => {
  const native = () => nativeChange(ACCOUNT, APRMON_ADDRESS, ONE);
  const mint = () => transferEvent(ZERO, ACCOUNT, 950_000_000_000_000_000n);
  const deposited = () => depositEvent(ACCOUNT, ACCOUNT, ONE, 950_000_000_000_000_000n);

  it("parses the live evidence shape with exact identity, length, and order", async () => {
    const capability = await capabilityFor("stake", { amount: "1", receiver: ACCOUNT });
    const changes = [native(), mint(), deposited()];
    const receipt = parseWith(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "stake",
      sender: ACCOUNT,
      owner: ACCOUNT,
      assets: ONE.toString(),
      shares: "950000000000000000",
    });
    expect(receipt.changes).toHaveLength(3);
    changes.forEach((change, index) => {
      expect(leafChangeOf(receipt.changes[index])).toBe(change);
    });
  });

  it("parses a reordered evidence set while preserving the given order", async () => {
    const capability = await capabilityFor("stake", { amount: "1", receiver: ACCOUNT });
    const changes = [deposited(), native(), mint()];
    const receipt = parseWith(capability, changes);
    expect(receipt.outcome).toMatchObject({ operation: "stake" });
    changes.forEach((change, index) => {
      expect(leafChangeOf(receipt.changes[index])).toBe(change);
    });
  });

  it("keeps unrelated ERC-20 transfers as delegated erc20 evidence", async () => {
    const capability = await capabilityFor("stake", { amount: "1", receiver: ACCOUNT });
    const unrelated = transferEvent(OTHER, ACCOUNT, 5n, OTHER);
    const receipt = parseWith(capability, [native(), mint(), deposited(), unrelated]);
    expect(receipt.outcome).toMatchObject({ operation: "stake" });
    expect(receipt.changes).toHaveLength(4);
    expect(leafChangeOf(receipt.changes[3])).toBe(unrelated);
  });

  it("rejects incomplete evidence: missing native, mint, or Deposit", async () => {
    const capability = await capabilityFor("stake", { amount: "1", receiver: ACCOUNT });
    expect(() => parseWith(capability, [mint(), deposited()])).toThrow(/native/);
    expect(() => parseWith(capability, [native(), deposited()])).toThrow(/mint/);
    expect(() => parseWith(capability, [native(), mint()])).toThrow(/Deposit/);
  });

  it("rejects mismatched amounts, actors, and endpoints", async () => {
    const capability = await capabilityFor("stake", { amount: "1", receiver: ACCOUNT });
    // native value != Deposit.assets
    expect(() =>
      parseWith(capability, [nativeChange(ACCOUNT, APRMON_ADDRESS, ONE + 1n), mint(), deposited()]),
    ).toThrow(/native transfer to match Deposit/);
    // native goes to the wrong endpoint
    expect(() =>
      parseWith(capability, [nativeChange(ACCOUNT, OTHER, ONE), mint(), deposited()]),
    ).toThrow(/native transfer to match Deposit/);
    // native from the wrong actor
    expect(() =>
      parseWith(capability, [nativeChange(OTHER, APRMON_ADDRESS, ONE), mint(), deposited()]),
    ).toThrow(/native transfer to match Deposit/);
    // mint to the wrong receiver
    expect(() =>
      parseWith(capability, [
        native(),
        transferEvent(ZERO, OTHER, 950_000_000_000_000_000n),
        deposited(),
      ]),
    ).toThrow(/mint to match Deposit/);
    // mint amount != Deposit.shares
    expect(() =>
      parseWith(capability, [native(), transferEvent(ZERO, ACCOUNT, 1n), deposited()]),
    ).toThrow(/mint to match Deposit/);
  });

  it("rejects forged-emitter, duplicate, and malformed Deposit events", async () => {
    const capability = await capabilityFor("stake", { amount: "1", receiver: ACCOUNT });
    // Deposit topics emitted by a different contract are not aPriori evidence
    const forged = depositEvent(ACCOUNT, ACCOUNT, ONE, 950_000_000_000_000_000n, OTHER);
    expect(() => parseWith(capability, [native(), mint(), forged])).toThrow();
    // a second Deposit cannot be silently absorbed
    expect(() => parseWith(capability, [native(), mint(), deposited(), deposited()])).toThrow();
    // malformed (truncated) Deposit data fails decoding and is rejected
    const malformed: Change = { ...deposited(), data: "0x01" } as Change;
    expect(() => parseWith(capability, [native(), mint(), malformed])).toThrow();
  });

  it("does not count a foreign token's mint-shaped Transfer as the aprMON mint", async () => {
    const capability = await capabilityFor("stake", { amount: "1", receiver: ACCOUNT });
    const foreignMint = transferEvent(ZERO, ACCOUNT, 950_000_000_000_000_000n, OTHER);
    expect(() => parseWith(capability, [native(), foreignMint, deposited()])).toThrow(/mint/);
  });
});

describe("unstakeReceipt", () => {
  const escrow = () => transferEvent(ACCOUNT, APRMON_ADDRESS, ONE);
  const requested = () =>
    redeemRequestEvent(OTHER, ACCOUNT, 7n, ACCOUNT, ONE, 1_070_000_000_000_000_000n);

  it("parses the live evidence shape with exact identity, length, and order", async () => {
    const capability = await capabilityFor("unstake", { shares: "1", controller: OTHER });
    const changes = [escrow(), requested()];
    const receipt = parseWith(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "unstake",
      controller: OTHER,
      owner: ACCOUNT,
      sender: ACCOUNT,
      requestId: "7",
      shares: ONE.toString(),
      assets: "1070000000000000000",
    });
    expect(receipt.changes).toHaveLength(2);
    changes.forEach((change, index) => {
      expect(leafChangeOf(receipt.changes[index])).toBe(change);
    });
  });

  it("rejects a RedeemRequest without the matching aprMON escrow transfer", async () => {
    const capability = await capabilityFor("unstake", { shares: "1", controller: OTHER });
    expect(() => parseWith(capability, [requested()])).toThrow(/escrow/);
    // escrow amount != RedeemRequest.shares
    expect(() =>
      parseWith(capability, [transferEvent(ACCOUNT, APRMON_ADDRESS, 1n), requested()]),
    ).toThrow(/escrow/);
    // escrow from the wrong owner
    expect(() =>
      parseWith(capability, [transferEvent(OTHER, APRMON_ADDRESS, ONE), requested()]),
    ).toThrow(/escrow/);
    // duplicate escrow transfers cannot be silently absorbed
    expect(() => parseWith(capability, [escrow(), escrow(), requested()])).toThrow(
      /multiple aprMON escrow/,
    );
  });
});

describe("claimReceipt", () => {
  const burn = (shares: bigint = CLAIM_SHARES) => transferEvent(APRMON_ADDRESS, ZERO, shares);
  const redeemed = (requestId: bigint = 7n) =>
    redeemEvent(ACCOUNT, ACCOUNT, requestId, CLAIM_SHARES, CLAIM_ASSETS, CLAIM_FEE);
  const payout = (value: bigint = CLAIM_ASSETS) => nativeChange(APRMON_ADDRESS, ACCOUNT, value);

  it("parses the live evidence shape with exact identity, length, and order", async () => {
    const capability = await capabilityFor("claim", { requestId: "7", receiver: ACCOUNT });
    const changes = [burn(), redeemed(), payout()];
    const receipt = parseWith(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "claim",
      controller: ACCOUNT,
      receiver: ACCOUNT,
      requestIds: ["7"],
      shares: CLAIM_SHARES.toString(),
      assets: CLAIM_ASSETS.toString(),
      fee: CLAIM_FEE.toString(),
    });
    expect(receipt.changes).toHaveLength(3);
    changes.forEach((change, index) => {
      expect(leafChangeOf(receipt.changes[index])).toBe(change);
    });
  });

  it("aggregates a multi-ID claim: one burn/Redeem pair per request", async () => {
    const capability = await capabilityFor("claim", { requestId: "10470", receiver: ACCOUNT });
    const changes = [burn(), redeemed(10470n), burn(), redeemed(10471n), payout(CLAIM_ASSETS * 2n)];
    const receipt = parseWith(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "claim",
      controller: ACCOUNT,
      receiver: ACCOUNT,
      requestIds: ["10470", "10471"],
      shares: (CLAIM_SHARES * 2n).toString(),
      assets: (CLAIM_ASSETS * 2n).toString(),
      fee: (CLAIM_FEE * 2n).toString(),
    });
    changes.forEach((change, index) => {
      expect(leafChangeOf(receipt.changes[index])).toBe(change);
    });
  });

  it("rejects incomplete or mismatched payout evidence", async () => {
    const capability = await capabilityFor("claim", { requestId: "7", receiver: ACCOUNT });
    // no Redeem event at all
    expect(() => parseWith(capability, [burn(), payout()])).toThrow(/Redeem/);
    // missing native payout
    expect(() => parseWith(capability, [burn(), redeemed()])).toThrow(/payout/);
    // payout amount != sum of Redeem.assets
    expect(() => parseWith(capability, [burn(), redeemed(), payout(1n)])).toThrow(/payout/);
    // payout to the wrong receiver
    expect(() =>
      parseWith(capability, [
        burn(),
        redeemed(),
        nativeChange(APRMON_ADDRESS, OTHER, CLAIM_ASSETS),
      ]),
    ).toThrow(/payout/);
    // payout from the wrong endpoint
    expect(() =>
      parseWith(capability, [burn(), redeemed(), nativeChange(OTHER, ACCOUNT, CLAIM_ASSETS)]),
    ).toThrow(/payout/);
    // burn total != sum of Redeem.shares
    expect(() => parseWith(capability, [burn(1n), redeemed(), payout()])).toThrow(/burn/);
    expect(() => parseWith(capability, [redeemed(), payout()])).toThrow(/burn/);
    // duplicate native payouts cannot be silently absorbed
    expect(() => parseWith(capability, [burn(), redeemed(), payout(), payout()])).toThrow(
      /multiple native/,
    );
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("aPriori mainnet", () => {
  it("has deployed bytecode at the aprMON proxy address", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    expect((await runtime.client.getCode({ address: APRMON_ADDRESS }))?.length).toBeGreaterThan(2);
  });

  it("matches on-chain name/symbol/decimals against the exported APRMON_* constants", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const [name, symbol, decimals] = await Promise.all([
      runtime.client.readContract({
        address: APRMON_ADDRESS,
        abi: AprMonAbi,
        functionName: "name",
      }) as Promise<string>,
      runtime.client.readContract({
        address: APRMON_ADDRESS,
        abi: AprMonAbi,
        functionName: "symbol",
      }) as Promise<string>,
      runtime.client.readContract({
        address: APRMON_ADDRESS,
        abi: AprMonAbi,
        functionName: "decimals",
      }) as Promise<number>,
    ]);
    expect(name).toBe(APRMON_NAME);
    expect(symbol).toBe(APRMON_SYMBOL);
    expect(decimals).toBe(APRMON_DECIMALS);
  });

  it("simulates a stake with zero Warnings and full evidence correlation", {
    timeout: 180_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "stake", ACCOUNT, {
      amount: "0.01",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "stake",
      sender: ACCOUNT,
      owner: ACCOUNT,
    });
  });

  // Chains stake -> unstake in a single simulate call so the simulator's
  // state chaining persists the minted aprMON balance before requestRedeem
  // runs. This live-validates the three-argument requestRedeem construction
  // and the escrow-transfer correlation in unstakeReceipt.
  it("simulates unstake (requestRedeem) after stake via state chaining", {
    timeout: 240_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(AprioriProtocol);

    const stakeCap = await registry.action("apriori", "stake", ACCOUNT, {
      amount: "0.01",
      receiver: ACCOUNT,
    });
    if (stakeCap.kind !== "capability") throw new Error("expected stake Capability");

    // Request fewer shares than the deposit mints to tolerate exchange-rate
    // drift between assets (MON) and shares (aprMON).
    const unstakeCap = await registry.action("apriori", "unstake", ACCOUNT, {
      shares: "0.005",
      controller: ACCOUNT,
    });
    if (unstakeCap.kind !== "capability") throw new Error("expected unstake Capability");

    const combined: CapabilityNode = {
      ...stakeCap,
      children: [...stakeCap.children, unstakeCap],
    };

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(combined);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(2);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({ operation: "stake" });
    expect(outcome.results[1]?.warnings).toEqual([]);
    expect(outcome.results[1]?.receipt?.outcome).toMatchObject({
      operation: "unstake",
      controller: ACCOUNT,
      owner: ACCOUNT,
      shares: "5000000000000000",
    });
  });
});
