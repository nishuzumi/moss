import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { encodeAbiParameters, encodeEventTopics, getAddress, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ShMonadAbi } from "../src/abis/fastlane.js";
import { FastLane, SHMONAD_ADDRESS } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECEIVER = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };
const ONE_MON = 1_000_000_000_000_000_000n;

describe("FastLane Protocol", () => {
  it("registers its exported Protocol directly and builds one transaction for stake", async () => {
    const registry = new Registry(runtime).use(FastLane);
    const capability = await registry.action("fastlane", "stake", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const flat = flattenCapabilityTree(capability);
    expect(flat[0]?.transaction).toMatchObject({
      to: SHMONAD_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
    // Exactly one direct transaction
    expect(flat).toHaveLength(1);
  });

  it("registers its exported Protocol directly and builds one transaction for unstake", async () => {
    const registry = new Registry(runtime).use(FastLane);
    const capability = await registry.action("fastlane", "unstake", ACCOUNT, {
      shares: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const flat = flattenCapabilityTree(capability);
    expect(flat[0]?.transaction).toMatchObject({
      to: SHMONAD_ADDRESS,
    });
    expect(flat).toHaveLength(1);
  });

  it("parses stake Changes without replacing their objects", async () => {
    const registry = new Registry(runtime).use(FastLane);
    const capability = await registry.action("fastlane", "stake", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native: Change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: SHMONAD_ADDRESS,
      value: ONE_MON.toString(),
    };
    // Deposit(sender indexed, owner indexed, assets, shares)
    const deposit: Change = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Deposit",
        args: { sender: ACCOUNT, owner: RECEIVER },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [ONE_MON, ONE_MON]),
    };
    // Transfer(from indexed, to indexed, value)
    const mint: Change = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Transfer",
        args: { from: zeroAddress, to: RECEIVER },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }], [ONE_MON]),
    };

    const receipt = registry.parseReceipt(capability, [native, deposit, mint]);
    expect(receipt.outcome).toEqual({
      operation: "stake",
      depositor: ACCOUNT,
      receiver: RECEIVER,
      assets: ONE_MON.toString(),
      shares: ONE_MON.toString(),
    });
  });

  it("parses unstake Changes without replacing their objects", async () => {
    const registry = new Registry(runtime).use(FastLane);
    const capability = await registry.action("fastlane", "unstake", ACCOUNT, {
      shares: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native: Change = {
      kind: "nativeTransfer",
      from: SHMONAD_ADDRESS,
      to: RECEIVER,
      value: ONE_MON.toString(),
    };
    // Withdraw(sender indexed, receiver indexed, owner indexed, assets, shares)
    const withdraw: Change = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Withdraw",
        args: { sender: ACCOUNT, receiver: RECEIVER, owner: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [ONE_MON, ONE_MON]),
    };
    // Transfer(from indexed, to indexed, value) - burn
    const burn: Change = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Transfer",
        args: { from: ACCOUNT, to: zeroAddress },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }], [ONE_MON]),
    };

    const receipt = registry.parseReceipt(capability, [native, withdraw, burn]);
    expect(receipt.outcome).toEqual({
      operation: "unstake",
      redeemer: ACCOUNT,
      receiver: RECEIVER,
      assets: ONE_MON.toString(),
      shares: ONE_MON.toString(),
    });
  });

  it("rejects a stake Receipt with mismatched native transfer and Deposit amounts", async () => {
    const registry = new Registry(runtime).use(FastLane);
    const capability = await registry.action("fastlane", "stake", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native: Change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: SHMONAD_ADDRESS,
      value: (ONE_MON / 2n).toString(), // half of expected
    };
    const deposit: Change = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Deposit",
        args: { sender: ACCOUNT, owner: RECEIVER },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [ONE_MON, ONE_MON]),
    };

    expect(() => registry.parseReceipt(capability, [native, deposit])).toThrow();
  });

  it("rejects an unstake Receipt with extra unexpected events", async () => {
    const registry = new Registry(runtime).use(FastLane);
    const capability = await registry.action("fastlane", "unstake", ACCOUNT, {
      shares: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native: Change = {
      kind: "nativeTransfer",
      from: SHMONAD_ADDRESS,
      to: RECEIVER,
      value: ONE_MON.toString(),
    };
    // Two Withdraw events — should be rejected
    const withdraw: Change = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Withdraw",
        args: { sender: ACCOUNT, receiver: RECEIVER, owner: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [ONE_MON, ONE_MON]),
    };

    expect(() => registry.parseReceipt(capability, [native, withdraw, withdraw])).toThrow(
      /multiple Withdraw/,
    );
  });
});
