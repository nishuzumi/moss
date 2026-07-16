import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ierc1155Abi } from "../src/abis/erc.js";
import { ERC1155 } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const COLLECTION = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";
const OPERATOR = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB";

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
