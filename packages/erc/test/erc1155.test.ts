import {
  type Change,
  createRuntime,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
  verifyReceiptCoverage,
} from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ierc1155Abi } from "../src/abis/erc.js";
import { ERC1155, type ERC1155TransferOutcome } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const OPERATOR = getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
const RECIPIENT = getAddress("0x1111111111111111111111111111111111111111");
const COLLECTION = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
const MAX_UINT256 = ((1n << 256n) - 1n).toString();

function registry(readBalance = 9n) {
  const runtime: MossRuntime = {
    rpcUrl: "http://offline",
    client: {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "balanceOf") return readBalance;
        throw new Error(`unexpected read ${functionName}`);
      },
    } as unknown as MossRuntime["client"],
  };
  return new Registry(runtime).use(ERC1155);
}

function transferSingle(
  tokenId: bigint,
  amount: bigint,
  overrides: Partial<{
    operator: typeof OPERATOR;
    from: typeof ACCOUNT;
    to: typeof RECIPIENT;
  }> = {},
) {
  const operator = overrides.operator ?? OPERATOR;
  const from = overrides.from ?? ACCOUNT;
  const to = overrides.to ?? RECIPIENT;
  return {
    kind: "event",
    address: COLLECTION,
    topics: encodeEventTopics({
      abi: ierc1155Abi,
      eventName: "TransferSingle",
      args: { operator, from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [
        { type: "uint256", name: "id" },
        { type: "uint256", name: "value" },
      ],
      [tokenId, amount],
    ),
  } satisfies Change;
}

function transferBatch(ids: readonly bigint[], values: readonly bigint[]) {
  return {
    kind: "event",
    address: COLLECTION,
    topics: encodeEventTopics({
      abi: ierc1155Abi,
      eventName: "TransferBatch",
      args: { operator: OPERATOR, from: ACCOUNT, to: RECIPIENT },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [
        { type: "uint256[]", name: "ids" },
        { type: "uint256[]", name: "values" },
      ],
      [ids, values],
    ),
  } satisfies Change;
}

describe("ERC1155", () => {
  it("self-registers, describes typed methods, and builds one direct safeTransferFrom", async () => {
    const instance = registry();
    expect(instance.discover({ protocol: "erc1155" })).toEqual([
      expect.objectContaining({
        protocol: "erc1155",
        method: "transfer",
        kind: "capability",
        verb: "transfer",
      }),
      expect.objectContaining({ protocol: "erc1155", method: "balanceOf", kind: "query" }),
      expect.objectContaining({
        protocol: "erc1155",
        method: "approve",
        kind: "capability",
        verb: "approve",
      }),
      expect.objectContaining({ protocol: "erc1155", method: "isApprovedForAll", kind: "query" }),
    ]);
    expect(
      Object.keys(instance.load([{ protocol: "erc1155", method: "transfer" }])[0]?.params ?? {}),
    ).toEqual(["collection", "tokenId", "amount", "to"]);

    const capability = await instance.action("erc1155", "transfer", ACCOUNT, {
      collection: COLLECTION,
      tokenId: MAX_UINT256,
      amount: "0",
      to: RECIPIENT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const flattened = flattenCapabilityTree(capability);
    expect(flattened).toHaveLength(1);
    const [transfer] = flattened;
    if (!transfer) throw new Error("missing transfer transaction");
    expect(
      decodeFunctionData({
        abi: ierc1155Abi,
        data: transfer.transaction.data,
      }),
    ).toEqual({
      functionName: "safeTransferFrom",
      args: [ACCOUNT, RECIPIENT, (1n << 256n) - 1n, 0n, "0x"],
    });
  });

  it("runs the typed balance query and returns a JSON-safe decimal string", async () => {
    await expect(
      registry(17n).action("erc1155", "balanceOf", ACCOUNT, {
        collection: COLLECTION,
        tokenId: "42",
        owner: RECIPIENT,
      }),
    ).resolves.toEqual({
      kind: "query",
      protocol: "erc1155",
      method: "balanceOf",
      data: { collection: COLLECTION, tokenId: "42", owner: RECIPIENT, balance: "17" },
    });
  });

  it("rejects uint256 overflow and non-string parameters before calldata construction", async () => {
    const overflow = (1n << 256n).toString();
    await expect(
      registry().action("erc1155", "transfer", ACCOUNT, {
        collection: COLLECTION,
        tokenId: overflow,
        amount: "1",
        to: RECIPIENT,
      }),
    ).rejects.toThrow("uint256 max");
    await expect(
      registry().action("erc1155", "transfer", ACCOUNT, {
        collection: COLLECTION,
        tokenId: "1",
        amount: 1,
        to: RECIPIENT,
      }),
    ).rejects.toThrow("invalid parameters");
    await expect(
      registry().action("erc1155", "transfer", ACCOUNT, {
        collection: COLLECTION,
        tokenId: "not-a-token-id",
        amount: "1",
        to: RECIPIENT,
      }),
    ).rejects.toThrow("invalid parameters");
  });

  it("parses single, batch, and single Changes exhaustively in original order", () => {
    const first = transferSingle(7n, 0n, { operator: ACCOUNT, from: ACCOUNT, to: ACCOUNT });
    const batch = transferBatch([9n, 9n, 2n], [3n, 0n, 4n]);
    const last = transferSingle(11n, 5n);
    const changes = [first, batch, last] as const;
    const receipt = (Object.create(ERC1155.prototype) as ERC1155).changesReceipt(changes);

    expect(receipt.outcome).toEqual([
      {
        operation: "transfer",
        event: "TransferSingle",
        collection: COLLECTION,
        operator: ACCOUNT,
        from: ACCOUNT,
        to: ACCOUNT,
        tokenId: "7",
        amount: "0",
      },
      {
        operation: "transfer",
        event: "TransferBatch",
        collection: COLLECTION,
        operator: OPERATOR,
        from: ACCOUNT,
        to: RECIPIENT,
        items: [
          { tokenId: "9", amount: "3" },
          { tokenId: "9", amount: "0" },
          { tokenId: "2", amount: "4" },
        ],
      },
      {
        operation: "transfer",
        event: "TransferSingle",
        collection: COLLECTION,
        operator: OPERATOR,
        from: ACCOUNT,
        to: RECIPIENT,
        tokenId: "11",
        amount: "5",
      },
    ]);
    expect(receipt.changes).toHaveLength(changes.length);
    for (const [index, entry] of receipt.changes.entries()) {
      expect(entry.kind).toBe("change");
      if (entry.kind === "change") expect(entry.change).toBe(changes[index]);
    }
    expect(() => verifyReceiptCoverage(changes, receipt)).not.toThrow();
    expect(receipt.text).toContain("TransferSingle");
    expect(receipt.text).toContain("TransferBatch");
  });

  it("narrows a direct transfer Receipt to exactly one TransferSingle", () => {
    const single = transferSingle(42n, 3n);
    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    const receipt = protocol.transferReceipt([single]);
    expect(receipt.outcome).toMatchObject({
      event: "TransferSingle",
      tokenId: "42",
      amount: "3",
    });
    expect(receipt.changes[0]).toMatchObject({ kind: "change", change: single });
    expect(() => protocol.transferReceipt([])).toThrow("exactly one TransferSingle");
    expect(() => protocol.transferReceipt([single, transferSingle(43n, 1n)])).toThrow(
      "exactly one TransferSingle",
    );
    expect(() => protocol.transferReceipt([transferBatch([42n], [3n])])).toThrow(
      "exactly one TransferSingle",
    );
  });

  it("fails closed for native transfers, unsupported events, malformed data, and uneven batches", () => {
    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: RECIPIENT,
      value: "1",
    } satisfies Change;
    expect(() => protocol.changesReceipt([native])).toThrow("only accept contract events");

    const approval = {
      kind: "event",
      address: COLLECTION,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "ApprovalForAll",
        args: { account: ACCOUNT, operator: OPERATOR },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "bool", name: "approved" }], [true]),
    } satisfies Change;
    expect(() => protocol.changesReceipt([approval])).toThrow("unsupported ERC-1155 event");

    const malformed = { ...transferSingle(1n, 1n), data: "0x" as Hex } satisfies Change;
    expect(() => protocol.changesReceipt([malformed])).toThrow("unsupported ERC-1155 event");
    expect(() => protocol.changesReceipt([transferBatch([1n, 2n], [3n])])).toThrow(
      "ids and values lengths differ",
    );
  });

  it("lets the framework detect missing, copied, duplicated, and reordered coverage", () => {
    const first = transferSingle(1n, 1n);
    const second = transferSingle(2n, 2n);
    const receipt = (Object.create(ERC1155.prototype) as ERC1155).changesReceipt([first, second]);
    const [firstLeaf, secondLeaf] = receipt.changes;
    if (firstLeaf?.kind !== "change" || secondLeaf?.kind !== "change") {
      throw new Error("expected direct Receipt Change leaves");
    }
    expect(() =>
      verifyReceiptCoverage([first, second], { ...receipt, changes: [firstLeaf] }),
    ).toThrow("covered 1 Changes");
    expect(() =>
      verifyReceiptCoverage([first, second], {
        ...receipt,
        changes: [firstLeaf, firstLeaf],
      }),
    ).toThrow("original object");
    const copiedLeaf = { ...firstLeaf, change: { ...first } };
    expect(() =>
      verifyReceiptCoverage([first, second], { ...receipt, changes: [copiedLeaf, secondLeaf] }),
    ).toThrow("original object");
    expect(() =>
      verifyReceiptCoverage([first, second], {
        ...receipt,
        changes: [secondLeaf, firstLeaf],
      }),
    ).toThrow("original object");
  });

  // ── 新增：approve + isApprovedForAll + approvalReceipt（PR #81）─

  it("builds setApprovalForAll calldata for approve (1) and revoke (0)", async () => {
    const instance = registry();

    const approve = await instance.action("erc1155", "approve", ACCOUNT, {
      collection: COLLECTION,
      operator: OPERATOR,
      approved: "1",
    });
    if (approve.kind !== "capability") throw new Error("expected capability");
    const [approveTx] = flattenCapabilityTree(approve);
    if (!approveTx) throw new Error("missing approve transaction");
    expect(decodeFunctionData({ abi: ierc1155Abi, data: approveTx.transaction.data })).toEqual({
      functionName: "setApprovalForAll",
      args: [OPERATOR, true],
    });

    const revoke = await instance.action("erc1155", "approve", ACCOUNT, {
      collection: COLLECTION,
      operator: OPERATOR,
      approved: "0",
    });
    if (revoke.kind !== "capability") throw new Error("expected capability");
    const [revokeTx] = flattenCapabilityTree(revoke);
    if (!revokeTx) throw new Error("missing revoke transaction");
    expect(decodeFunctionData({ abi: ierc1155Abi, data: revokeTx.transaction.data })).toEqual({
      functionName: "setApprovalForAll",
      args: [OPERATOR, false],
    });
  });

  it("runs isApprovedForAll query", async () => {
    const runtime: MossRuntime = {
      rpcUrl: "http://offline",
      client: {
        readContract: async ({ functionName }: { functionName: string }) => {
          if (functionName === "isApprovedForAll") return true;
          throw new Error(`unexpected read ${functionName}`);
        },
      } as unknown as MossRuntime["client"],
    };
    const instance = new Registry(runtime).use(ERC1155);
    await expect(
      instance.action("erc1155", "isApprovedForAll", ACCOUNT, {
        collection: COLLECTION,
        owner: RECIPIENT,
        operator: OPERATOR,
      }),
    ).resolves.toEqual({
      kind: "query",
      protocol: "erc1155",
      method: "isApprovedForAll",
      data: { collection: COLLECTION, owner: RECIPIENT, operator: OPERATOR, approved: true },
    });
  });

  it("parses ApprovalForAll Change into typed Receipt", () => {
    const approval: Change = {
      kind: "event",
      address: COLLECTION,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "ApprovalForAll",
        args: { account: ACCOUNT, operator: OPERATOR },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "bool", name: "approved" }], [true]),
    };
    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    const receipt = protocol.approvalReceipt([approval]);
    expect(receipt.outcome).toEqual({
      operation: "approvalForAll",
      collection: COLLECTION,
      account: ACCOUNT,
      operator: OPERATOR,
      approved: true,
    });
    expect(receipt.text).toContain("approved");
  });

  it("approvalReceipt rejects non-ApprovalForAll events", () => {
    const transfer = transferSingle(1n, 1n);
    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    expect(() => protocol.approvalReceipt([transfer])).toThrow("expected ApprovalForAll");
    expect(() => protocol.approvalReceipt([])).toThrow("exactly one event");
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("ERC1155 on Monad mainnet", () => {
  // LootGO Looties Logs is listed in Monad's official protocol registry, and
  // MonadScan identifies item #4 as ERC-1155:
  // https://github.com/monad-developers/protocols/blob/main/mainnet/lootgo.jsonc
  // https://monadscan.com/nft/0xd2c7fd8e7ab1527a2cb5a7177d1a29393f416a6d/4
  const collection = getAddress("0xD2C7FD8e7Ab1527a2cb5A7177d1A29393F416A6d");
  const tokenId = "4";
  const holderCandidates = [
    "0x745098b2c028BA7490452b3A13049a7Fe10b6a87",
    "0xBB78A151673FaC1A0A2162Abc7BEE3a39b3767b5",
    "0xf26de9DD7D737243089648633d62641Ff238d51f",
    "0xd4bF7BF399c752F4fD97b6976035DcA3FD2E012B",
    "0xB350D7cb33dB07E00FF5074461Ab3ac9Aa989926",
    "0x3D8250Ac679dcfd1E90c29E7a64AB5013645E579",
    "0xc498067D0831e6Ae3Ea9f83c958f704521025CD2",
    "0x747c63e713843117Ef99CE689D9F029E3F10da96",
    "0x8b59Ba7533f0F451c58B6EAFfc1860C0B9034810",
    "0x36B55a8C16bEc8CBe1Ec58cB190A8a25F32d2682",
  ].map((address) => getAddress(address));

  it("simulates the happy path with zero Warnings and exhaustive Receipt coverage", {
    timeout: 120_000,
  }, async () => {
    const runtime = await createRuntime({ rpcUrl: "https://rpc.monad.xyz" });
    expect((await runtime.client.getCode({ address: collection }))?.length).toBeGreaterThan(2);
    const registry = new Registry(runtime).use(ERC1155);

    let holder: (typeof holderCandidates)[number] | undefined;
    for (const candidate of holderCandidates) {
      const result = await registry.action("erc1155", "balanceOf", candidate, {
        collection,
        tokenId,
        owner: candidate,
      });
      if (result.kind === "query" && BigInt((result.data as { balance: string }).balance) > 0n) {
        holder = candidate;
        break;
      }
    }
    if (!holder) throw new Error("no live ERC-1155 fixture holder has a positive balance");

    const capability = await registry.action("erc1155", "transfer", holder, {
      collection,
      tokenId,
      amount: "1",
      to: RECIPIENT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const simulation = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(simulation.halted).toBeUndefined();
    expect(simulation.results[0]?.warnings).toEqual([]);
    const receiptOutcome = simulation.results[0]?.receipt?.outcome as
      | ERC1155TransferOutcome
      | undefined;
    expect(receiptOutcome).toMatchObject({
      operation: "transfer",
      event: "TransferSingle",
      operator: holder,
      from: holder,
      to: RECIPIENT,
      tokenId,
      amount: "1",
    });
    expect(receiptOutcome?.collection?.toLowerCase()).toBe(collection.toLowerCase());
  });
});
