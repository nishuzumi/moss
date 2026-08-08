import {
  type AddressValue,
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
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import { StakedMonadAbi } from "../src/abis/staked-monad.js";
import { KINTSU_STAKED_MONAD_ADDRESS, Kintsu } from "../src/index.js";

const RAW_ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc" as const;
const ACCOUNT = getAddress(RAW_ACCOUNT);
const RECEIVER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const OTHER = getAddress("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");

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

  it("parses the complete ordered deposit evidence without replacing Changes", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("kintsu", "deposit", ACCOUNT, {
      amount: "1",
      receiver: RECEIVER,
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: KINTSU_STAKED_MONAD_ADDRESS,
      value: "1000",
    } satisfies Change;
    const snapshot = kintsuVirtualSharesSnapshot(0n);
    const minted = erc20Transfer(ZERO, RECEIVER, 950n);
    const deposited = kintsuDeposit(RECEIVER, 950n, 1000n);
    const changes = [native, snapshot, minted, deposited] as const;

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "deposit",
      sender: ACCOUNT,
      receiver: RECEIVER,
      assets: "1000",
      shares: "950",
    });
    expect(flattenReceiptChanges(receipt)).toEqual(changes);
    expect(flattenReceiptChanges(receipt)[0]).toBe(native);
    expect(flattenReceiptChanges(receipt)[1]).toBe(snapshot);
    expect(flattenReceiptChanges(receipt)[2]).toBe(minted);
    expect(flattenReceiptChanges(receipt)[3]).toBe(deposited);
  });

  it("preserves an additional fee mint while selecting the Deposit-matching mint", async () => {
    const { registry } = offlineRegistry();
    const capability = await depositCapability(registry);
    const native = nativeDeposit(ACCOUNT, 1000n);
    const snapshot = kintsuVirtualSharesSnapshot(50n);
    const feeMint = erc20Transfer(ZERO, OTHER, 50n);
    const receiverMint = erc20Transfer(ZERO, RECEIVER, 950n);
    const deposited = kintsuDeposit(RECEIVER, 950n, 1000n);
    const changes = [native, snapshot, feeMint, receiverMint, deposited] as const;

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "deposit",
      receiver: RECEIVER,
      shares: "950",
    });
    expect(flattenReceiptChanges(receipt)).toEqual(changes);
  });

  it("uses the observed native sender instead of capability parameters", async () => {
    const { registry } = offlineRegistry();
    const capability = await depositCapability(registry);
    const receipt = registry.parseReceipt(capability, [
      nativeDeposit(OTHER, 1000n),
      kintsuVirtualSharesSnapshot(0n),
      erc20Transfer(ZERO, RECEIVER, 950n),
      kintsuDeposit(RECEIVER, 950n, 1000n),
    ]);

    expect(receipt.outcome).toMatchObject({ sender: OTHER, receiver: RECEIVER });
  });

  it("normalizes trace and decoded Outcome addresses to the same checksum form", async () => {
    const { registry } = offlineRegistry();
    const capability = await depositCapability(registry);
    const receipt = registry.parseReceipt(capability, [
      nativeDeposit(RAW_ACCOUNT, 1000n),
      kintsuVirtualSharesSnapshot(0n),
      erc20Transfer(ZERO, RAW_ACCOUNT, 950n),
      kintsuDeposit(RAW_ACCOUNT, 950n, 1000n),
    ]);

    expect(receipt.outcome).toMatchObject({
      sender: ACCOUNT,
      receiver: ACCOUNT,
    });
  });

  it("rejects missing required deposit evidence", async () => {
    const { registry } = offlineRegistry();
    const capability = await depositCapability(registry);
    const native = nativeDeposit(ACCOUNT, 1000n);
    const snapshot = kintsuVirtualSharesSnapshot(0n);
    const minted = erc20Transfer(ZERO, RECEIVER, 950n);
    const deposited = kintsuDeposit(RECEIVER, 950n, 1000n);

    expect(() => registry.parseReceipt(capability, [snapshot, minted, deposited])).toThrow(
      "requires native transfer",
    );
    expect(() => registry.parseReceipt(capability, [native, snapshot, minted])).toThrow(
      "requires native transfer, minted sMON, and Deposit",
    );
    expect(() => registry.parseReceipt(capability, [native, snapshot, deposited])).toThrow(
      "requires one matching sMON mint",
    );
  });

  it("rejects duplicate or mismatched execution evidence", async () => {
    const { registry } = offlineRegistry();
    const capability = await depositCapability(registry);
    const snapshot = kintsuVirtualSharesSnapshot(0n);
    const minted = erc20Transfer(ZERO, RECEIVER, 950n);
    const deposited = kintsuDeposit(RECEIVER, 950n, 1000n);

    expect(() =>
      registry.parseReceipt(capability, [
        nativeDeposit(ACCOUNT, 1000n),
        snapshot,
        minted,
        deposited,
        deposited,
      ]),
    ).toThrow("multiple Deposit events");
    expect(() =>
      registry.parseReceipt(capability, [
        nativeDeposit(ACCOUNT, 999n),
        snapshot,
        minted,
        deposited,
      ]),
    ).toThrow("does not match Deposit value");
    expect(() =>
      registry.parseReceipt(capability, [
        nativeDeposit(ACCOUNT, 1000n),
        snapshot,
        erc20Transfer(ZERO, RECEIVER, 949n),
        deposited,
      ]),
    ).toThrow("requires one matching sMON mint");
  });

  it("rejects malformed, unsupported, and unrelated events", async () => {
    const { registry } = offlineRegistry();
    const capability = await depositCapability(registry);
    const deposited = kintsuDeposit(RECEIVER, 950n, 1000n);
    const malformed = { ...deposited, data: "0x" as Hex };
    const approval = erc20Approval(ACCOUNT, RECEIVER, 1n);
    const unrelated = { ...erc20Transfer(ZERO, RECEIVER, 950n), address: OTHER };

    expect(() => registry.parseReceipt(capability, [malformed])).toThrow("malformed Kintsu event");
    expect(() => registry.parseReceipt(capability, [approval])).toThrow("Kintsu emitted Approval");
    expect(() => registry.parseReceipt(capability, [unrelated])).toThrow(
      `unsupported emitter ${OTHER}`,
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

  it("rejects MON amounts that cannot be represented at 18 decimals", async () => {
    const { registry } = offlineRegistry();
    await expect(
      registry.action("kintsu", "quoteDeposit", ACCOUNT, {
        amount: "1.9999999999999999999",
        slippage: 50,
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

  it("rejects convertToAssets shares outside uint96", async () => {
    const { registry, readContract } = offlineRegistry();
    await expect(
      registry.action("kintsu", "convertToAssets", ACCOUNT, {
        shares: (1n << 96n).toString(),
      }),
    ).rejects.toThrow("invalid parameters");
    expect(readContract).not.toHaveBeenCalled();
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

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Kintsu Monad mainnet", () => {
  it("has deployed StakedMonad proxy bytecode and returns a protected quote", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    expect(
      (await runtime.client.getCode({ address: KINTSU_STAKED_MONAD_ADDRESS }))?.length,
    ).toBeGreaterThan(2);

    const quote = await new Registry(runtime)
      .use(Kintsu)
      .action("kintsu", "quoteDeposit", ACCOUNT, { amount: "1", slippage: 50 });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toMatchObject({
      amount: "1000000000000000000",
      slippage: 50,
    });
    const data = quote.data as {
      quotedShares: string;
      minimumShares: string;
    };
    const quotedShares = BigInt(data.quotedShares);
    expect(quotedShares).toBeGreaterThan(0n);
    expect(data.minimumShares).toBe(((quotedShares * 9_950n) / 10_000n).toString());
  });

  it("simulates a native deposit into an exhaustive typed Receipt", {
    timeout: 180_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Kintsu);
    const capability = await registry.action("kintsu", "deposit", ACCOUNT, {
      amount: "1",
      receiver: RAW_ACCOUNT,
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "deposit",
      sender: ACCOUNT,
      receiver: ACCOUNT,
      assets: "1000000000000000000",
    });
    const receiptOutcome = outcome.results[0]?.receipt?.outcome as { shares?: string } | undefined;
    expect(BigInt(receiptOutcome?.shares ?? "0")).toBeGreaterThan(0n);
  });
});

function offlineRegistry(
  overrides: Partial<
    Record<"convertToShares" | "convertToAssets" | "totalShares", bigint | Error>
  > = {},
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

async function depositCapability(registry: Registry) {
  const capability = await registry.action("kintsu", "deposit", ACCOUNT, {
    amount: "1",
    receiver: RECEIVER,
    slippage: 50,
  });
  if (capability.kind !== "capability") throw new Error("expected capability");
  return capability;
}

function nativeDeposit(from: AddressValue, amount: bigint): Change {
  return {
    kind: "nativeTransfer",
    from,
    to: KINTSU_STAKED_MONAD_ADDRESS,
    value: amount.toString(),
  };
}

function erc20Transfer(from: AddressValue, to: AddressValue, amount: bigint): Change {
  return {
    kind: "event",
    address: KINTSU_STAKED_MONAD_ADDRESS,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function erc20Approval(owner: AddressValue, spender: AddressValue, amount: bigint): Change {
  return {
    kind: "event",
    address: KINTSU_STAKED_MONAD_ADDRESS,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Approval",
      args: { owner, spender },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function kintsuVirtualSharesSnapshot(shares: bigint): Change {
  return {
    kind: "event",
    address: KINTSU_STAKED_MONAD_ADDRESS,
    topics: encodeEventTopics({
      abi: StakedMonadAbi,
      eventName: "VirtualSharesSnapshot",
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [shares]),
  };
}

function kintsuDeposit(staker: AddressValue, shares: bigint, value: bigint): Change {
  return {
    kind: "event",
    address: KINTSU_STAKED_MONAD_ADDRESS,
    topics: encodeEventTopics({
      abi: StakedMonadAbi,
      eventName: "Deposit",
      args: { staker },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [shares, value]),
  };
}

function flattenReceiptChanges(receipt: ReceiptResult): Change[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.change] : flattenReceiptChanges(entry),
  );
}
