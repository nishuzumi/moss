import {
  flattenCapabilityTree,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { decodeFunctionData, getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import { StakedMonadAbi } from "../src/abis/staked-monad.js";
import {
  KINTSU_STAKED_MONAD_ADDRESS,
  Kintsu,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECEIVER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");

describe("Kintsu", () => {
  it("quotes a protected sMON deposit", async () => {
    const { registry } = offlineRegistry();
    const quote = await registry.action("kintsu", "quoteDeposit", ACCOUNT, {
      amount: "1",
      slippage: 50,
    });

    expect(quote).toEqual({
      kind: "query",
      protocol: "kintsu",
      method: "quoteDeposit",
      data: {
        amount: "1000000000000000000",
        quotedShares: "950",
        minimumShares: "945",
        slippage: 50,
      },
    });
  });

  it("builds one payable deposit transaction from the same protected quote", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("kintsu", "deposit", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const executable = flattenCapabilityTree(capability);
    expect(executable).toHaveLength(1);
    expect(executable[0]?.transaction).toMatchObject({
      from: ACCOUNT,
      to: KINTSU_STAKED_MONAD_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
    expect(
      decodeFunctionData({
        abi: StakedMonadAbi,
        data: executable[0]?.transaction.data ?? "0x",
      }),
    ).toEqual({
      functionName: "deposit",
      args: [945n, RECEIVER],
    });
  });

  it("returns raw integer strings from share conversion and total share queries", async () => {
    const { registry } = offlineRegistry();
    const converted = await registry.action("kintsu", "convertToAssets", ACCOUNT, {
      shares: "1000",
    });
    const total = await registry.action("kintsu", "totalShares", ACCOUNT, {});

    expect(converted).toMatchObject({
      kind: "query",
      data: { shares: "1000", assets: "1050" },
    });
    expect(total).toMatchObject({
      kind: "query",
      data: { totalShares: "10000" },
    });
  });

  it("rejects a deposit Receipt without execution evidence", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("kintsu", "deposit", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    expect(() => registry.parseReceipt(capability, [])).toThrow(
      "Kintsu deposit Receipt requires native transfer, minted sMON, and Deposit",
    );
  });

  it("rejects slippage outside the protected range", async () => {
    const { registry } = offlineRegistry();
    await expect(
      registry.action("kintsu", "quoteDeposit", ACCOUNT, {
        amount: "1",
        slippage: 10_000,
      }),
    ).rejects.toThrow("invalid parameters");
  });

  it("rejects deposits whose wei amount exceeds uint96", async () => {
    const { registry } = offlineRegistry();
    await expect(
      registry.action("kintsu", "quoteDeposit", ACCOUNT, {
        amount: ((1n << 96n) + 1n).toString(),
        slippage: 0,
      }),
    ).rejects.toThrow("kintsu.deposit amount exceeds uint96");
  });

  it("propagates convertToShares RPC failures", async () => {
    const failure = new Error("RPC unavailable");
    const { registry } = offlineRegistry({ convertToShares: failure });
    await expect(
      registry.action("kintsu", "quoteDeposit", ACCOUNT, {
        amount: "1",
        slippage: 50,
      }),
    ).rejects.toThrow(failure);
  });

  it.each([
    [0n, 0, "zero quoted shares"],
    [1n, 1, "zero protected shares"],
  ])("rejects %s quoted shares with %s bps slippage (%s)", async (quoted, slippage) => {
    const { registry } = offlineRegistry({ convertToShares: quoted });
    await expect(
      registry.action("kintsu", "quoteDeposit", ACCOUNT, {
        amount: "1",
        slippage,
      }),
    ).rejects.toThrow("kintsu.deposit quote produced zero protected shares");
  });
});

function offlineRegistry(
  overrides: Partial<Record<"convertToShares" | "convertToAssets" | "totalShares", bigint | Error>> = {},
) {
  const values = {
    convertToShares: 950n,
    convertToAssets: 1_050n,
    totalShares: 10_000n,
    ...overrides,
  };
  const readContract = vi.fn(async ({ functionName }: { functionName: keyof typeof values }) => {
    const value = values[functionName];
    if (value instanceof Error) throw value;
    if (value === undefined) throw new Error(`unexpected read ${functionName}`);
    return value;
  });
  const client = { readContract } as unknown as MossRuntime["client"];
  return {
    registry: new Registry({ rpcUrl: "http://offline", client }).use(Kintsu),
    readContract,
  };
}
