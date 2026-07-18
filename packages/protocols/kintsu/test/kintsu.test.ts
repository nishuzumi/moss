import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime } from "@themoss/system";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { StakedMonadAbi } from "../src/abis/staked-monad.js";
import { KINTSU_SMON_ADDRESS, Kintsu } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECEIVER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");

function offlineRegistry() {
  const client = {
    readContract: async ({
      functionName,
      args = [],
    }: {
      functionName: string;
      args?: readonly unknown[];
    }) => {
      const value = BigInt(String(args[0] ?? 0));
      if (functionName === "convertToShares") return (value * 9n) / 10n;
      if (functionName === "convertToAssets") return (value * 10n) / 9n;
      if (functionName === "balanceOf") return 42n;
      throw new Error(`unexpected read ${functionName}`);
    },
  } as unknown as MossRuntime["client"];
  return new Registry({ rpcUrl: "http://offline", client }).use(Kintsu);
}

function eventChange(
  eventName: "VirtualSharesSnapshot" | "Transfer" | "Deposit",
  args: Record<string, unknown>,
): Change {
  const topics = encodeEventTopics({
    abi: StakedMonadAbi,
    eventName,
    args,
  } as Parameters<typeof encodeEventTopics>[0]) as readonly Hex[];
  const data =
    eventName === "VirtualSharesSnapshot"
      ? encodeAbiParameters([{ type: "uint256" }], [BigInt(String(args.shares))])
      : eventName === "Transfer"
        ? encodeAbiParameters([{ type: "uint256" }], [BigInt(String(args.value))])
        : encodeAbiParameters(
            [{ type: "uint256" }, { type: "uint256" }],
            [BigInt(String(args.shares)), BigInt(String(args.value))],
          );
  return { kind: "event", address: KINTSU_SMON_ADDRESS, topics, data };
}

function successfulChanges(amount = 2n * 10n ** 18n, shares = 18n * 10n ** 17n) {
  const native = {
    kind: "nativeTransfer",
    from: ACCOUNT,
    to: KINTSU_SMON_ADDRESS,
    value: amount.toString(),
  } satisfies Change;
  const snapshot = eventChange("VirtualSharesSnapshot", { shares: 123n });
  const transfer = eventChange("Transfer", { from: ZERO, to: RECEIVER, value: shares });
  const deposit = eventChange("Deposit", { staker: RECEIVER, shares, value: amount });
  return { native, snapshot, transfer, deposit };
}

describe("Kintsu", () => {
  it("loads clear parameter schemas and builds one slippage-protected deposit", async () => {
    const registry = offlineRegistry();
    const [loaded] = registry.load([{ protocol: "kintsu", method: "stake" }]);
    expect(loaded?.params.amount).toMatchObject({
      description: expect.stringContaining("MON amount"),
    });
    expect(loaded?.params.slippageBps).toMatchObject({
      type: { default: 50, maximum: 5_000 },
      description: expect.stringContaining("minimum sMON"),
    });

    const capability = await registry.action("kintsu", "stake", ACCOUNT, {
      amount: "2",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [node] = flattenCapabilityTree(capability);
    if (!node) throw new Error("missing Kintsu transaction");
    expect(node.transaction).toMatchObject({
      to: KINTSU_SMON_ADDRESS,
      value: "0x1bc16d674ec80000",
    });
    expect(decodeFunctionData({ abi: StakedMonadAbi, data: node.transaction.data })).toEqual({
      functionName: "deposit",
      args: [1_791_000_000_000_000_000n, RECEIVER],
    });
  });

  it("exposes share, asset, and balance queries with JSON-safe results", async () => {
    const registry = offlineRegistry();
    await expect(
      registry.action("kintsu", "convertToShares", ACCOUNT, { amount: "2" }),
    ).resolves.toMatchObject({
      kind: "query",
      data: { amount: "2", shares: "1.8" },
    });
    await expect(
      registry.action("kintsu", "convertToAssets", ACCOUNT, { shares: "1.8" }),
    ).resolves.toMatchObject({
      kind: "query",
      data: { shares: "1.8", amount: "2" },
    });
    await expect(
      registry.action("kintsu", "balanceOf", ACCOUNT, { owner: RECEIVER }),
    ).resolves.toMatchObject({
      kind: "query",
      data: { token: KINTSU_SMON_ADDRESS, symbol: "sMON", decimals: 18, balance: "42" },
    });
  });

  it("preserves and exhaustively covers ordered stake Changes", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("kintsu", "stake", ACCOUNT, {
      amount: "2",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = successfulChanges();
    const ordered = [changes.native, changes.snapshot, changes.transfer, changes.deposit];
    const receipt = registry.parseReceipt(capability, ordered);
    expect(receipt.outcome).toEqual({
      operation: "stake",
      account: ACCOUNT,
      receiver: RECEIVER,
      monAmount: "2000000000000000000",
      sMonShares: "1800000000000000000",
    });
    expect(receipt.changes).toHaveLength(4);
  });

  it("rejects missing or inconsistent stake evidence", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("kintsu", "stake", ACCOUNT, {
      amount: "2",
      receiver: RECEIVER,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = successfulChanges();
    expect(() => registry.parseReceipt(capability, [changes.native, changes.deposit])).toThrow(
      "requires native transfer, sMON mint, and Deposit",
    );
    const wrongMint = eventChange("Transfer", { from: ZERO, to: RECEIVER, value: 1n });
    expect(() =>
      registry.parseReceipt(capability, [changes.native, wrongMint, changes.deposit]),
    ).toThrow("sMON mint differs from Deposit");
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Kintsu Monad mainnet", () => {
  it("has deployed bytecode and expected sMON metadata", { timeout: 60_000 }, async () => {
    const { client } = await monadRuntime();
    const [bytecode, symbol, decimals] = await Promise.all([
      client.getCode({ address: KINTSU_SMON_ADDRESS }),
      client.readContract({
        address: KINTSU_SMON_ADDRESS,
        abi: StakedMonadAbi,
        functionName: "symbol",
      }),
      client.readContract({
        address: KINTSU_SMON_ADDRESS,
        abi: StakedMonadAbi,
        functionName: "decimals",
      }),
    ]);
    expect(bytecode?.length).toBeGreaterThan(2);
    expect(symbol).toBe("sMON");
    expect(Number(decimals)).toBe(18);
  });

  it("simulates staking with zero Warnings and exact Receipt coverage", {
    timeout: 120_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Kintsu);
    const capability = await registry.action("kintsu", "stake", ACCOUNT, {
      amount: "0.01",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const result = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(result.halted).toBeUndefined();
    expect(result.results[0]?.warnings).toEqual([]);
    expect(result.results[0]?.receipt?.outcome).toMatchObject({
      operation: "stake",
      account: ACCOUNT,
      receiver: ACCOUNT,
      monAmount: "10000000000000000",
    });
  });
});
