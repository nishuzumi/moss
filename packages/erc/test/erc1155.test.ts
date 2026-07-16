import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import {
  createPublicClient,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  http,
} from "viem";
import { describe, expect, it } from "vitest";
import { ierc1155Abi } from "../src/abis/erc.js";
import { ERC1155, type ERC1155TransferOutcome } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const COLLECTION = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";
const OPERATOR = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB";
const MONAD_RPC_URL = "https://rpc.monad.xyz";

// LootGO, Countdown Celebration, from monad-crypto/protocols mainnet CSV.
// Holder and token id come from MonadScan tx 0x00e4b236ede8541cb959b24a37c3cffdd69301fcd9d59bad47c3e8d795839b4e.
const LOOTGO_COUNTDOWN = getAddress("0x7415085DA3A7c3D9B41Bc339A91132d08f964c6c");
const LOOTGO_HOLDER = getAddress("0x3D8250Ac679dcfd1E90c29E7a64AB5013645E579");
const LOOTGO_TOKEN_ID = "1";

const runtime = {
  rpcUrl: "http://offline",
  client: {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === "balanceOf") return 12n;
      if (functionName === "isApprovedForAll") return true;
      if (functionName === "uri") return "ipfs://example/{id}.json";
      throw new Error(`unexpected read ${functionName}`);
    },
  } as unknown as MossRuntime["client"],
};

describe("ERC1155", () => {
  it("registers directly and builds safeTransferFrom", async () => {
    const registry = new Registry(runtime).use(ERC1155);
    const capability = await registry.action("erc1155", "transfer", ACCOUNT, {
      collection: COLLECTION,
      tokenId: "7",
      to: RECIPIENT,
      amount: "3",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [transaction] = flattenCapabilityTree(capability);
    if (!transaction) throw new Error("missing transfer transaction");
    const data = transaction.transaction.data;
    expect(decodeFunctionData({ abi: ierc1155Abi, data })).toEqual({
      functionName: "safeTransferFrom",
      args: [ACCOUNT, RECIPIENT, 7n, 3n, "0x"],
    });
  });

  it("reads balances, operator approvals, and token URIs", async () => {
    const registry = new Registry(runtime).use(ERC1155);
    await expect(
      registry.action("erc1155", "balanceOf", ACCOUNT, {
        collection: COLLECTION,
        tokenId: "7",
        owner: ACCOUNT,
      }),
    ).resolves.toMatchObject({
      kind: "query",
      data: { collection: COLLECTION, tokenId: "7", owner: ACCOUNT, balance: "12" },
    });
    await expect(
      registry.action("erc1155", "isApprovedForAll", ACCOUNT, {
        collection: COLLECTION,
        owner: ACCOUNT,
        operator: OPERATOR,
      }),
    ).resolves.toMatchObject({
      kind: "query",
      data: { collection: COLLECTION, owner: ACCOUNT, operator: OPERATOR, approved: true },
    });
    await expect(
      registry.action("erc1155", "uri", ACCOUNT, { collection: COLLECTION, tokenId: "7" }),
    ).resolves.toMatchObject({
      kind: "query",
      data: { collection: COLLECTION, tokenId: "7", uri: "ipfs://example/{id}.json" },
    });
  });

  it("parses the TransferSingle event into a typed Receipt", () => {
    const change = {
      kind: "event",
      address: COLLECTION,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "TransferSingle",
        args: { operator: OPERATOR, from: ACCOUNT, to: RECIPIENT },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [
          { type: "uint256", name: "id" },
          { type: "uint256", name: "value" },
        ],
        [7n, 3n],
      ),
    } satisfies Change;
    const receipt = (Object.create(ERC1155.prototype) as ERC1155).transferReceipt([change]);
    expect(receipt.outcome).toEqual({
      operation: "transfer",
      collection: COLLECTION,
      operator: OPERATOR,
      from: ACCOUNT,
      to: RECIPIENT,
      tokenId: "7",
      amount: "3",
    });
    expect(receipt.changes[0]).toMatchObject({ kind: "change", change });
    expect(receipt.text).toContain("ERC1155 Transfer:");
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("ERC1155 Monad mainnet", () => {
  it("simulates a LootGO transfer into an exhaustive typed Receipt", {
    timeout: 120_000,
  }, async () => {
    const liveRuntime = {
      rpcUrl: MONAD_RPC_URL,
      client: createPublicClient({ transport: http(MONAD_RPC_URL) }),
    } satisfies MossRuntime;
    const registry = new Registry(liveRuntime).use(ERC1155);

    const balance = await registry.action("erc1155", "balanceOf", LOOTGO_HOLDER, {
      collection: LOOTGO_COUNTDOWN,
      tokenId: LOOTGO_TOKEN_ID,
      owner: LOOTGO_HOLDER,
    });
    if (balance.kind !== "query") throw new Error("expected balance query");
    const balanceData = balance.data as { balance: string };
    expect(BigInt(balanceData.balance)).toBeGreaterThan(0n);

    const capability = await registry.action("erc1155", "transfer", LOOTGO_HOLDER, {
      collection: LOOTGO_COUNTDOWN,
      tokenId: LOOTGO_TOKEN_ID,
      to: ACCOUNT,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    const outcome = await createTraceSimulator(liveRuntime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    const result = outcome.results[0];
    expect(outcome.halted).toBeUndefined();
    expect(result?.warnings).toEqual([]);
    expect(result?.changes).toHaveLength(1);
    const receiptOutcome = result?.receipt?.outcome as ERC1155TransferOutcome;
    expect(receiptOutcome).toMatchObject({
      operation: "transfer",
      operator: LOOTGO_HOLDER,
      from: LOOTGO_HOLDER,
      to: ACCOUNT,
      tokenId: LOOTGO_TOKEN_ID,
      amount: "1",
    });
    expect(getAddress(receiptOutcome.collection)).toBe(LOOTGO_COUNTDOWN);

    const [leaf] = result?.receipt?.changes ?? [];
    if (leaf?.kind !== "change") throw new Error("expected one ReceiptChange");
    expect(leaf.change).toBe(result?.changes?.[0]);
  });
});
