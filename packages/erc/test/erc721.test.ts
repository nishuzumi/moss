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
const INTERFACE_IDS = [
  "0x01ffc9a7",
  "0x80ac58cd",
  "0x5b5e139f",
  "0x780e9d63",
  "0x2a55205a",
] as const;

const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

type InterfaceId = (typeof INTERFACE_IDS)[number];
type InspectionCall = {
  address: string;
  functionName: string;
  args?: readonly unknown[];
};

function inspectionRegistry(
  responses: Partial<Record<InterfaceId, boolean>>,
  errors: Partial<Record<InterfaceId, Error>> = {},
) {
  const calls: InspectionCall[] = [];
  const inspectionRuntime: MossRuntime = {
    rpcUrl: "http://offline",
    client: {
      readContract: async (call: InspectionCall) => {
        calls.push(call);
        if (call.functionName !== "supportsInterface") {
          throw new Error(`unexpected read ${call.functionName}`);
        }
        const interfaceId = call.args?.[0];
        if (!INTERFACE_IDS.includes(interfaceId as InterfaceId)) {
          throw new Error(`unexpected interface ID ${String(interfaceId)}`);
        }
        const typedInterfaceId = interfaceId as InterfaceId;
        const error = errors[typedInterfaceId];
        if (error) throw error;
        const response = responses[typedInterfaceId];
        if (response === undefined) {
          throw new Error(`missing response for ${typedInterfaceId}`);
        }
        return response;
      },
    } as unknown as MossRuntime["client"],
  };
  return { registry: new Registry(inspectionRuntime).use(ERC721), calls };
}

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

  it("inspects all five declared interfaces at the exact collection address", async () => {
    const responses = Object.fromEntries(INTERFACE_IDS.map((interfaceId) => [interfaceId, true]));
    const { registry, calls } = inspectionRegistry(responses);

    await expect(
      registry.action("erc721", "inspectCollection", ACCOUNT, { collection: COLLECTION }),
    ).resolves.toEqual({
      kind: "query",
      protocol: "erc721",
      method: "inspectCollection",
      data: {
        collection: COLLECTION,
        supports: {
          erc165: true,
          erc721: true,
          erc721Metadata: true,
          erc721Enumerable: true,
          erc2981Royalties: true,
        },
      },
    });

    expect(calls).toHaveLength(INTERFACE_IDS.length);
    expect(calls.every(({ address }) => address === COLLECTION)).toBe(true);
    expect(calls.every(({ functionName }) => functionName === "supportsInterface")).toBe(true);
    expect(calls.map(({ args }) => args?.[0])).toEqual(INTERFACE_IDS);
    for (const interfaceId of INTERFACE_IDS) {
      expect(calls.filter(({ args }) => args?.[0] === interfaceId)).toHaveLength(1);
    }
  });

  it("returns the collection's direct mixed declarations without inferring consistency", async () => {
    const { registry } = inspectionRegistry({
      "0x01ffc9a7": true,
      "0x80ac58cd": false,
      "0x5b5e139f": true,
      "0x780e9d63": false,
      "0x2a55205a": true,
    });

    await expect(
      registry.action("erc721", "inspectCollection", ACCOUNT, { collection: COLLECTION }),
    ).resolves.toMatchObject({
      data: {
        collection: COLLECTION,
        supports: {
          erc165: true,
          erc721: false,
          erc721Metadata: true,
          erc721Enumerable: false,
          erc2981Royalties: true,
        },
      },
    });
  });

  it("stops after one read and returns all false when ERC-165 is not declared", async () => {
    const { registry, calls } = inspectionRegistry({ "0x01ffc9a7": false });

    await expect(
      registry.action("erc721", "inspectCollection", ACCOUNT, { collection: COLLECTION }),
    ).resolves.toMatchObject({
      data: {
        collection: COLLECTION,
        supports: {
          erc165: false,
          erc721: false,
          erc721Metadata: false,
          erc721Enumerable: false,
          erc2981Royalties: false,
        },
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      address: COLLECTION,
      functionName: "supportsInterface",
      args: ["0x01ffc9a7"],
    });
  });

  it("propagates a revert from the first ERC-165 read", async () => {
    const revert = new Error("supportsInterface reverted");
    const { registry, calls } = inspectionRegistry({}, { "0x01ffc9a7": revert });

    await expect(
      registry.action("erc721", "inspectCollection", ACCOUNT, { collection: COLLECTION }),
    ).rejects.toBe(revert);
    expect(calls).toHaveLength(1);
  });

  it("propagates a later interface read failure after starting all four checks", async () => {
    const revert = new Error("ERC-721 Metadata check reverted");
    const { registry, calls } = inspectionRegistry(
      {
        "0x01ffc9a7": true,
        "0x80ac58cd": true,
        "0x780e9d63": false,
        "0x2a55205a": true,
      },
      { "0x5b5e139f": revert },
    );

    await expect(
      registry.action("erc721", "inspectCollection", ACCOUNT, { collection: COLLECTION }),
    ).rejects.toBe(revert);
    expect(calls.map(({ args }) => args?.[0])).toEqual(INTERFACE_IDS);
  });

  it("rejects a malformed collection before reading the contract", async () => {
    const { registry, calls } = inspectionRegistry({ "0x01ffc9a7": true });

    await expect(
      registry.action("erc721", "inspectCollection", ACCOUNT, {
        collection: "not-an-address",
      }),
    ).rejects.toThrow("invalid parameters");
    expect(calls).toHaveLength(0);
  });

  it("propagates a valid-address decoding failure instead of returning false", async () => {
    const decodingFailure = new Error("contract returned no data");
    const { registry } = inspectionRegistry({}, { "0x01ffc9a7": decodingFailure });

    await expect(
      registry.action("erc721", "inspectCollection", ACCOUNT, { collection: COLLECTION }),
    ).rejects.toBe(decodingFailure);
  });

  it("loads separate Address type and inspectCollection field descriptions", () => {
    const { registry } = inspectionRegistry({ "0x01ffc9a7": false });
    const [loaded] = registry.load([{ protocol: "erc721", method: "inspectCollection" }]);

    expect(loaded?.params.collection).toMatchObject({
      description: "Collection whose ERC-165 interface declarations are inspected.",
      type: {
        description: "A 20-byte EVM address encoded as a 0x-prefixed hexadecimal string.",
      },
    });
  });
});
