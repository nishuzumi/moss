import { ERC1967_IMPLEMENTATION_SLOT, erc1967ImplementationAddress } from "@themoss/abi-tools";
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
import { ShMonadAbi } from "../src/abis/shmonad.js";
import { SHMONAD_ADDRESS, SHMONAD_IMPLEMENTATION_ADDRESS, ShMonad } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECEIVER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const runtime = {
  rpcUrl: "http://offline",
  client: {} as MossRuntime["client"],
};

describe("shMONAD adapter", () => {
  it("registers its exported Protocol directly and builds one stake transaction", async () => {
    const registry = new Registry(runtime).use(ShMonad);
    const capability = await registry.action("shmonad", "stake", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const nodes = flattenCapabilityTree(capability);
    expect(nodes[0]?.transaction).toMatchObject({
      to: SHMONAD_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
  });

  it("registers and builds one unstake transaction", async () => {
    const registry = new Registry(runtime).use(ShMonad);
    const capability = await registry.action("shmonad", "unstake", ACCOUNT, {
      shares: "1",
      receiver: RECEIVER,
      owner: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const nodes = flattenCapabilityTree(capability);
    expect(nodes[0]?.transaction).toMatchObject({
      to: SHMONAD_ADDRESS,
    });
  });

  it("parses all stake Changes without replacing their objects", async () => {
    const registry = new Registry(runtime).use(ShMonad);
    const capability = await registry.action("shmonad", "stake", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: SHMONAD_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;

    const transferMint = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Transfer",
        args: {
          from: "0x0000000000000000000000000000000000000000",
          to: RECEIVER,
        },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }], [10n ** 18n]),
    } satisfies Change;

    const depositEvent = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Deposit",
        args: { sender: ACCOUNT, owner: RECEIVER },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        [10n ** 18n, 10n ** 18n],
      ),
    } satisfies Change;

    const receipt = registry.parseReceipt(capability, [native, transferMint, depositEvent]);
    expect(receipt.outcome).toEqual({
      operation: "stake",
      depositor: ACCOUNT,
      receiver: RECEIVER,
      assets: "1000000000000000000",
      shares: "1000000000000000000",
    });
  });

  it("parses all unstake Changes without replacing their objects", async () => {
    const registry = new Registry(runtime).use(ShMonad);
    const capability = await registry.action("shmonad", "unstake", ACCOUNT, {
      shares: "1",
      receiver: RECEIVER,
      owner: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const transferBurn = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Transfer",
        args: {
          from: ACCOUNT,
          to: "0x0000000000000000000000000000000000000000",
        },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }], [10n ** 18n]),
    } satisfies Change;

    const withdrawEvent = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Withdraw",
        args: { sender: ACCOUNT, receiver: RECEIVER, owner: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        [10n ** 18n, 10n ** 18n],
      ),
    } satisfies Change;

    const native = {
      kind: "nativeTransfer",
      from: SHMONAD_ADDRESS,
      to: RECEIVER,
      value: "1000000000000000000",
    } satisfies Change;

    const receipt = registry.parseReceipt(capability, [transferBurn, withdrawEvent, native]);
    expect(receipt.outcome).toEqual({
      operation: "unstake",
      owner: ACCOUNT,
      receiver: RECEIVER,
      assets: "1000000000000000000",
      shares: "1000000000000000000",
    });
  });

  it("rejects stake receipt with missing Deposit event", async () => {
    const registry = new Registry(runtime).use(ShMonad);
    const capability = await registry.action("shmonad", "stake", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: SHMONAD_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;

    expect(() => registry.parseReceipt(capability, [native])).toThrow(
      "requires both a Deposit event and a native transfer",
    );
  });

  it("rejects unstake receipt with mismatched amounts", async () => {
    const registry = new Registry(runtime).use(ShMonad);
    const capability = await registry.action("shmonad", "unstake", ACCOUNT, {
      shares: "1",
      receiver: RECEIVER,
      owner: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const withdrawEvent = {
      kind: "event",
      address: SHMONAD_ADDRESS,
      topics: encodeEventTopics({
        abi: ShMonadAbi,
        eventName: "Withdraw",
        args: { sender: ACCOUNT, receiver: RECEIVER, owner: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        [10n ** 18n, 10n ** 18n],
      ),
    } satisfies Change;

    const native = {
      kind: "nativeTransfer",
      from: SHMONAD_ADDRESS,
      to: RECEIVER,
      value: "999999999999999999",
    } satisfies Change;

    expect(() => registry.parseReceipt(capability, [withdrawEvent, native])).toThrow(
      "assets differ between Withdraw event and native transfer",
    );
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("shMONAD live mainnet", () => {
  it("has deployed bytecode and expected token metadata", { timeout: 60_000 }, async () => {
    const { client } = await monadRuntime();
    const [bytecode, symbol, decimals] = await Promise.all([
      client.getCode({ address: SHMONAD_ADDRESS }),
      client.readContract({ address: SHMONAD_ADDRESS, abi: ERC20Abi, functionName: "symbol" }),
      client.readContract({ address: SHMONAD_ADDRESS, abi: ERC20Abi, functionName: "decimals" }),
    ]);
    expect(bytecode?.length).toBeGreaterThan(2);
    expect(symbol).toBe("shMON");
    expect(Number(decimals)).toBe(18);
  });

  it("proxy still points at the recorded implementation (ERC-1967 slot)", {
    timeout: 60_000,
  }, async () => {
    const { client } = await monadRuntime();
    const slot = await client.getStorageAt({
      address: SHMONAD_ADDRESS,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(erc1967ImplementationAddress(slot).toLowerCase()).toBe(
      SHMONAD_IMPLEMENTATION_ADDRESS.toLowerCase(),
    );
  });

  it("simulates a stake with exhaustive ordered Receipt coverage", {
    timeout: 120_000,
  }, async () => {
    const rt = await monadRuntime();
    const registry = new Registry(rt).use(ShMonad);
    const capability = await registry.action("shmonad", "stake", ACCOUNT, {
      amount: "0.25",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(rt, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "stake",
      receiver: ACCOUNT,
    });
  });
});
