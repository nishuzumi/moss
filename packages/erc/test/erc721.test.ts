import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { decodeFunctionData, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ierc721Abi } from "../src/abis/erc.js";
import { ERC721 } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const COLLECTION = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";

const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

describe("ERC721", () => {
  it("registers directly and builds safeTransferFrom", async () => {
    const registry = new Registry(runtime).use(ERC721);
    const capability = await registry.action("erc721", "transfer", ACCOUNT, {
      collection: COLLECTION,
      tokenId: "7",
      to: RECIPIENT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [transaction] = flattenCapabilityTree(capability);
    if (!transaction) throw new Error("missing transfer transaction");
    const data = transaction.transaction.data;
    expect(decodeFunctionData({ abi: ierc721Abi, data })).toEqual({
      functionName: "safeTransferFrom",
      args: [ACCOUNT, RECIPIENT, 7n],
    });
  });

  it("parses the Transfer event into a typed Receipt", () => {
    const change = {
      kind: "event",
      address: COLLECTION,
      topics: encodeEventTopics({
        abi: ierc721Abi,
        eventName: "Transfer",
        args: { from: ACCOUNT, to: RECIPIENT, tokenId: 7n },
      }) as readonly Hex[],
      data: "0x",
    } satisfies Change;
    const receipt = (Object.create(ERC721.prototype) as ERC721).transferReceipt([change]);
    expect(receipt.outcome).toEqual({
      operation: "transfer",
      collection: COLLECTION,
      from: ACCOUNT,
      to: RECIPIENT,
      tokenId: "7",
    });
    expect(receipt.changes[0]).toMatchObject({ kind: "change", change });
    expect(receipt.text).toContain("ERC721 Transfer:");
  });
});
