import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createMossServer } from "../src/server.js";

const ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const FIXTURE_COLLECTION = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const LIVE_ERC1155_COLLECTION = "0xD2C7FD8e7Ab1527a2cb5A7177d1A29393F416A6d";
const LIVE_ERC1155_TOKEN_ID = "4";
const LIVE_ERC1155_HOLDER_CANDIDATES = [
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
] as const;

type NftPlan = {
  kind: string;
  expects: {
    nfts?: {
      collection: string;
      count: number;
      direction: string;
      items?: { tokenId: string; amountMax?: string }[];
    }[];
    nftTransfers?: {
      kind: "erc1155-single";
      collection: string;
      operator: string;
      from: string;
      to: string;
      tokenId: string;
      amount: string;
    }[];
  };
  [key: string]: unknown;
};

type SimulateOutcome = {
  ok: boolean;
  results: {
    effects: {
      nftTransfers: {
        kind: string;
        collection: string;
        operator?: string;
        from: string;
        to: string;
        tokenId?: string;
        amount?: string;
      }[];
      nftsOut: {
        collection: string;
        count: number;
        items: { tokenId: string; amount?: string }[];
      }[];
    };
    warnings: { code: string }[];
  }[];
};

async function connectedClient() {
  const { server } = createMossServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function parseText(result: Awaited<ReturnType<Client["callTool"]>>): unknown {
  const content = result.content as { type: string; text: string }[];
  return JSON.parse(content[0]?.text ?? "null");
}

async function findLiveErc1155Holder(client: Client): Promise<string> {
  for (const candidate of LIVE_ERC1155_HOLDER_CANDIDATES) {
    const result = parseText(
      await client.callTool({
        name: "action",
        arguments: {
          protocol: "erc1155",
          method: "balanceOf",
          account: candidate,
          params: {
            collection: LIVE_ERC1155_COLLECTION,
            tokenId: LIVE_ERC1155_TOKEN_ID,
            owner: candidate,
          },
        },
      }),
    ) as { data: { balance: string } };
    if (BigInt(result.data.balance) > 0n) return candidate;
  }
  throw new Error("no live ERC-1155 fixture holder has a positive balance");
}

describe("moss mcp server", () => {
  it("exposes exactly the four tools", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["action", "discover", "load", "simulate"]);
  });

  it("discover filters by verb and returns coordinates", async () => {
    const client = await connectedClient();
    const result = parseText(
      await client.callTool({ name: "discover", arguments: { verb: "wrap" } }),
    ) as { protocol: string; method: string }[];
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ protocol: "wmon", method: "wrap", kind: "capability" });
  });

  it("load returns the calling contract for coordinates", async () => {
    const client = await connectedClient();
    const result = parseText(
      await client.callTool({
        name: "load",
        arguments: { items: [{ protocol: "kuru", method: "swap" }] },
      }),
    ) as { risk: string[]; params: Record<string, string> }[];
    expect(result[0]?.risk).toContain("priceImpact");
    expect(result[0]?.params.amount).toContain("human-decimal");
  });

  it("action rejects unknown coordinates with a helpful error", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "action",
      arguments: {
        protocol: "nope",
        method: "x",
        account: ACCOUNT,
        params: {},
      },
    });
    expect(result.isError).toBe(true);
    const content = result.content as { text: string }[];
    expect(content[0]?.text).toContain("unknown protocol");
  });

  it("keeps uint256 ERC-1155 ids and amounts exact across the action JSON boundary", async () => {
    const client = await connectedClient();
    const tokenId = (2n ** 256n - 1n).toString();
    const amount = (2n ** 255n + 17n).toString();
    const result = await client.callTool({
      name: "action",
      arguments: {
        protocol: "erc1155",
        method: "transfer",
        account: ACCOUNT,
        params: {
          collection: FIXTURE_COLLECTION,
          tokenId,
          amount,
          to: RECIPIENT,
        },
      },
    });
    expect(result.isError, JSON.stringify(result.content)).not.toBe(true);
    const plan = parseText(result) as NftPlan;

    expect(plan.kind).toBe("plan");
    expect(plan.expects.nfts).toHaveLength(1);
    expect(plan.expects.nfts?.[0]).toMatchObject({
      count: 1,
      direction: "out",
      items: [{ tokenId, amountMax: amount }],
    });
    expect(plan.expects.nfts?.[0]?.collection.toLowerCase()).toBe(FIXTURE_COLLECTION);
    expect(plan.expects.nftTransfers?.[0]).toMatchObject({
      kind: "erc1155-single",
      operator: ACCOUNT,
      from: ACCOUNT,
      to: RECIPIENT,
      tokenId,
      amount,
    });
    expect(plan.expects.nftTransfers?.[0]?.collection.toLowerCase()).toBe(FIXTURE_COLLECTION);
  });

  it("rejects malformed NFT expectations at the simulate boundary", async () => {
    const client = await connectedClient();
    const plan = parseText(
      await client.callTool({
        name: "action",
        arguments: {
          protocol: "erc1155",
          method: "transfer",
          account: ACCOUNT,
          params: {
            collection: FIXTURE_COLLECTION,
            tokenId: "42",
            amount: "3",
            to: RECIPIENT,
          },
        },
      }),
    ) as NftPlan;

    const missingItems = structuredClone(plan);
    delete missingItems.expects.nfts?.[0]?.items;

    const duplicateIds = structuredClone(plan);
    const duplicateNft = duplicateIds.expects.nfts?.[0];
    if (!duplicateNft) throw new Error("missing NFT expectation");
    duplicateNft.count = 2;
    duplicateNft.items = [
      { tokenId: "42", amountMax: "1" },
      { tokenId: "42", amountMax: "2" },
    ];

    const mismatchedCount = structuredClone(plan);
    const mismatchedNft = mismatchedCount.expects.nfts?.[0];
    if (!mismatchedNft) throw new Error("missing NFT expectation");
    mismatchedNft.count = 2;

    const unsafeCount = structuredClone(plan);
    const unsafeNft = unsafeCount.expects.nfts?.[0];
    if (!unsafeNft) throw new Error("missing NFT expectation");
    unsafeNft.direction = "in";
    unsafeNft.count = Number.MAX_SAFE_INTEGER + 1;
    delete unsafeNft.items;

    const cappedInflow = structuredClone(plan);
    const cappedInflowNft = cappedInflow.expects.nfts?.[0];
    if (!cappedInflowNft) throw new Error("missing NFT expectation");
    cappedInflowNft.direction = "in";

    const tooManyKnownInflows = structuredClone(plan);
    const tooManyKnownInflowsNft = tooManyKnownInflows.expects.nfts?.[0];
    if (!tooManyKnownInflowsNft) throw new Error("missing NFT expectation");
    tooManyKnownInflowsNft.direction = "in";
    tooManyKnownInflowsNft.items = [{ tokenId: "42" }, { tokenId: "43" }];

    const invalidCollection = structuredClone(plan);
    const invalidCollectionNft = invalidCollection.expects.nfts?.[0];
    if (!invalidCollectionNft) throw new Error("missing NFT expectation");
    invalidCollectionNft.collection = "not-an-address";

    const oversizedUint = structuredClone(plan);
    const oversizedUintNft = oversizedUint.expects.nfts?.[0];
    if (!oversizedUintNft?.items?.[0]) throw new Error("missing NFT expectation item");
    oversizedUintNft.items[0].tokenId = (2n ** 256n).toString();

    const invalidReceiptAddress = structuredClone(plan);
    const invalidReceipt = invalidReceiptAddress.expects.nftTransfers?.[0];
    if (!invalidReceipt) throw new Error("missing NFT transfer receipt");
    invalidReceipt.to = "not-an-address";

    const oversizedReceiptAmount = structuredClone(plan);
    const oversizedReceipt = oversizedReceiptAmount.expects.nftTransfers?.[0];
    if (!oversizedReceipt) throw new Error("missing NFT transfer receipt");
    oversizedReceipt.amount = (2n ** 256n).toString();

    for (const malformed of [
      missingItems,
      duplicateIds,
      mismatchedCount,
      unsafeCount,
      cappedInflow,
      tooManyKnownInflows,
      invalidCollection,
      oversizedUint,
      invalidReceiptAddress,
      oversizedReceiptAmount,
    ]) {
      const result = await client.callTool({ name: "simulate", arguments: { plans: [malformed] } });
      expect(result.isError).toBe(true);
    }
  });
});

// Full flow over the MCP boundary (JSON round-trip of the Plan blood-bag):
// action builds the wrap Plan, simulate verifies it — live against mainnet.
describe.skipIf(!!process.env.MOSS_SKIP_E2E)("moss mcp server (Monad mainnet e2e)", () => {
  it("action → simulate round trip stays warning-free", { timeout: 120_000 }, async () => {
    const client = await connectedClient();
    const plan = parseText(
      await client.callTool({
        name: "action",
        arguments: {
          protocol: "wmon",
          method: "wrap",
          account: ACCOUNT,
          params: { amount: "0.25" },
        },
      }),
    ) as Record<string, unknown>;
    expect(plan.kind).toBe("plan");

    const outcome = parseText(
      await client.callTool({ name: "simulate", arguments: { plans: [plan] } }),
    ) as { ok: boolean; results: { warnings: unknown[] }[] };
    expect(outcome.ok).toBe(true);
    expect(outcome.results[0]?.warnings).toEqual([]);
  });

  it("preserves ERC-1155 item bounds through simulate and detects tampering", {
    timeout: 120_000,
  }, async () => {
    const client = await connectedClient();

    // Keep the capability's mandatory happy path explicit across the MCP
    // boundary: discover → load → action → simulate, live on mainnet.
    const discovered = parseText(
      await client.callTool({
        name: "discover",
        arguments: { protocol: "erc1155", category: "nft" },
      }),
    ) as { protocol: string; method: string; kind: string }[];
    expect(discovered).toContainEqual(
      expect.objectContaining({ protocol: "erc1155", method: "transfer", kind: "capability" }),
    );

    const loaded = parseText(
      await client.callTool({
        name: "load",
        arguments: { items: [{ protocol: "erc1155", method: "transfer" }] },
      }),
    ) as { params: Record<string, string> }[];
    expect(Object.keys(loaded[0]?.params ?? {})).toEqual(["collection", "tokenId", "amount", "to"]);

    const holder = await findLiveErc1155Holder(client);

    const plan = parseText(
      await client.callTool({
        name: "action",
        arguments: {
          protocol: "erc1155",
          method: "transfer",
          account: holder,
          params: {
            collection: LIVE_ERC1155_COLLECTION,
            tokenId: LIVE_ERC1155_TOKEN_ID,
            amount: "1",
            to: RECIPIENT,
          },
        },
      }),
    ) as NftPlan;
    expect(plan.expects.nfts?.[0]?.items).toEqual([
      { tokenId: LIVE_ERC1155_TOKEN_ID, amountMax: "1" },
    ]);
    expect(plan.expects.nftTransfers?.[0]).toMatchObject({
      kind: "erc1155-single",
      tokenId: LIVE_ERC1155_TOKEN_ID,
      amount: "1",
      to: RECIPIENT,
    });

    const outcome = parseText(
      await client.callTool({ name: "simulate", arguments: { plans: [plan] } }),
    ) as SimulateOutcome;
    expect(outcome.ok).toBe(true);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.effects.nftsOut).toHaveLength(1);
    expect(outcome.results[0]?.effects.nftsOut[0]).toMatchObject({
      count: 1,
      items: [{ tokenId: LIVE_ERC1155_TOKEN_ID, amount: "1" }],
    });
    expect(outcome.results[0]?.effects.nftsOut[0]?.collection.toLowerCase()).toBe(
      LIVE_ERC1155_COLLECTION.toLowerCase(),
    );
    expect(outcome.results[0]?.effects.nftTransfers[0]).toMatchObject({
      kind: "erc1155-single",
      tokenId: LIVE_ERC1155_TOKEN_ID,
      amount: "1",
      to: RECIPIENT,
    });
    expect(outcome.results[0]?.effects.nftTransfers[0]?.collection.toLowerCase()).toBe(
      LIVE_ERC1155_COLLECTION.toLowerCase(),
    );

    const tampered = structuredClone(plan);
    const declaredTransfer = tampered.expects.nftTransfers?.[0];
    if (!declaredTransfer) throw new Error("missing ERC-1155 transfer receipt");
    declaredTransfer.amount = "2";
    const tamperedOutcome = parseText(
      await client.callTool({ name: "simulate", arguments: { plans: [tampered] } }),
    ) as SimulateOutcome;
    expect(tamperedOutcome.ok).toBe(false);
    expect(tamperedOutcome.results[0]?.warnings.map((warning) => warning.code)).toContain(
      "PLAN_TAMPERED",
    );
    expect(tamperedOutcome.results[0]?.warnings.map((warning) => warning.code)).toContain(
      "REQUIRED_NFT_TRANSFER_MISSING",
    );
  });
});
