import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime } from "@themoss/system";
import { encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { AprMonAbi, APRMON_ADDRESS } from "../src/abis/apriori.js";
import { AprioriProtocol } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

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
    address: APRMON_ADDRESS,
    topics: encodeEventTopics({
      abi: AprMonAbi,
      eventName: "Deposit",
      args: { sender, owner },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [assets, shares],
    ),
  };
}

function requestRedeemEvent(
  sender: `0x${string}`,
  owner: `0x${string}`,
  shares: bigint,
  requestId: bigint,
): Change {
  return {
    kind: "event",
    address: APRMON_ADDRESS,
    topics: encodeEventTopics({
      abi: AprMonAbi,
      eventName: "RequestRedeem",
      args: { sender, owner },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [shares, requestId],
    ),
  };
}

function redeemEvent(
  sender: `0x${string}`,
  owner: `0x${string}`,
  assets: bigint,
  requestIds: bigint[],
): Change {
  return {
    kind: "event",
    address: APRMON_ADDRESS,
    topics: encodeEventTopics({
      abi: AprMonAbi,
      eventName: "Redeem",
      args: { sender, owner },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256[]" }, { type: "uint256" }],
      [requestIds, assets],
    ),
  };
}

function transferEvent(from: `0x${string}`, to: `0x${string}`, value: bigint): Change {
  return {
    kind: "event",
    address: APRMON_ADDRESS,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  };
}

describe("AprioriProtocol", () => {
  it("registers and builds one stake transaction", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "stake", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      to: APRMON_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
  });

  it("parses Deposit event into a stake Receipt", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "stake", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: APRMON_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;
    const deposited = depositEvent(ACCOUNT, ACCOUNT, 10n ** 18n, 995000000000000000n);
    const receipt = registry.parseReceipt(capability, [native, deposited]);
    expect(receipt.outcome).toEqual({
      operation: "stake",
      account: ACCOUNT,
      assets: "1000000000000000000",
      shares: "995000000000000000",
    });

    expect(receipt.changes).toHaveLength(2);
    expect(changeOf(receipt.changes[0])).toBe(native);
    expect(changeOf(receipt.changes[1])).toBe(deposited);
  });

  it("delegates an unrelated mint Transfer alongside Deposit to erc20", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "stake", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: APRMON_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;
    const deposited = depositEvent(ACCOUNT, ACCOUNT, 10n ** 18n, 995000000000000000n);
    const mint = transferEvent(
      getAddress("0x0000000000000000000000000000000000000000"),
      ACCOUNT,
      995000000000000000n,
    );
    const receipt = registry.parseReceipt(capability, [native, deposited, mint]);
    expect(receipt.outcome).toEqual({
      operation: "stake",
      account: ACCOUNT,
      assets: "1000000000000000000",
      shares: "995000000000000000",
    });
    expect(receipt.changes).toHaveLength(3);
    expect(changeOf(receipt.changes[0])).toBe(native);
    expect(changeOf(receipt.changes[1])).toBe(deposited);
    expect(changeOf(receipt.changes[2])).toBe(mint);
  });

  it("builds a requestRedeem (unstake) transaction", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "unstake", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      to: APRMON_ADDRESS,
    });
  });

  it("parses RequestRedeem event into an unstake Receipt", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "unstake", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const requested = requestRedeemEvent(ACCOUNT, ACCOUNT, 10n ** 18n, 7n);
    const receipt = registry.parseReceipt(capability, [requested]);
    expect(receipt.outcome).toEqual({
      operation: "unstake",
      account: ACCOUNT,
      shares: "1000000000000000000",
      requestId: "7",
    });

    expect(receipt.changes).toHaveLength(1);
    expect(changeOf(receipt.changes[0])).toBe(requested);
  });

  it("builds a redeem (claim) transaction", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "claim", ACCOUNT, {
      requestId: "7",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      to: APRMON_ADDRESS,
    });
  });

  it("parses Redeem event into a claim Receipt", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "claim", ACCOUNT, {
      requestId: "7",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const claimed = redeemEvent(ACCOUNT, ACCOUNT, 990000000000000000n, [7n]);
    const receipt = registry.parseReceipt(capability, [claimed]);
    expect(receipt.outcome).toEqual({
      operation: "claim",
      account: ACCOUNT,
      requestIds: ["7"],
      assets: "990000000000000000",
    });

    expect(receipt.changes).toHaveLength(1);
    expect(changeOf(receipt.changes[0])).toBe(claimed);
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("aPriori mainnet", () => {
  it("has deployed bytecode at the aprMON proxy address", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();
    expect(
      (await runtime.client.getCode({ address: APRMON_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
  });

  it("verifies the recorded implementation address on mainnet", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();
    const code = await runtime.client.getCode({
      address: "0x29fcb43b46531bca003ddc8fcb67ffe91900c762",
    });
    expect(code?.length).toBeGreaterThan(2);
  });

  it("simulates a stake with zero Warnings", { timeout: 180_000 }, async () => {
    const runtime = await monadRuntime();
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
      account: ACCOUNT,
    });
  });
});
