import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createMossServer } from "../src/server.js";

const ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const FIXTURE_COLLECTION = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const LIVE_ERC1155_COLLECTION = "0x8f28E18039c37cdB4389E6dcb8703966fb9480A8";
const LIVE_ERC1155_TOKEN_ID = "91801109843487528103748472202153632723215093328";
const LIVE_ERC1155_HOLDER = "0xEf8BB725e1056317dBafD9B356E63c160e63dCdd";

type NftPlan = {
  kind: string;
  expects: {
    nfts?: { collection: string; count: number; direction: string; amountMax?: string }[];
  };
  [key: string]: unknown;
};

type SimulateOutcome = {
  ok: boolean;
  results: {
    effects: { nftsOut: { collection: string; count: number; amount?: string }[] };
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

  it("keeps a uint256 ERC-1155 amount exact across the action JSON boundary", async () => {
    const client = await connectedClient();
    const amount = (2n ** 255n + 17n).toString();
    const result = await client.callTool({
      name: "action",
      arguments: {
        protocol: "erc1155",
        method: "transfer",
        account: ACCOUNT,
        params: {
          collection: FIXTURE_COLLECTION,
          tokenId: "42",
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
      amountMax: amount,
    });
    expect(plan.expects.nfts?.[0]?.collection.toLowerCase()).toBe(FIXTURE_COLLECTION);
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

  it("preserves ERC-1155 amountMax through simulate and detects tampering", {
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

    const balanceResult = parseText(
      await client.callTool({
        name: "action",
        arguments: {
          protocol: "erc1155",
          method: "balanceOf",
          account: LIVE_ERC1155_HOLDER,
          params: {
            collection: LIVE_ERC1155_COLLECTION,
            tokenId: LIVE_ERC1155_TOKEN_ID,
            owner: LIVE_ERC1155_HOLDER,
          },
        },
      }),
    ) as { data: { balance: string } };
    expect(BigInt(balanceResult.data.balance)).toBeGreaterThan(0n);

    const plan = parseText(
      await client.callTool({
        name: "action",
        arguments: {
          protocol: "erc1155",
          method: "transfer",
          account: LIVE_ERC1155_HOLDER,
          params: {
            collection: LIVE_ERC1155_COLLECTION,
            tokenId: LIVE_ERC1155_TOKEN_ID,
            amount: "1",
            to: RECIPIENT,
          },
        },
      }),
    ) as NftPlan;
    expect(plan.expects.nfts?.[0]?.amountMax).toBe("1");

    const outcome = parseText(
      await client.callTool({ name: "simulate", arguments: { plans: [plan] } }),
    ) as SimulateOutcome;
    expect(outcome.ok).toBe(true);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.effects.nftsOut).toHaveLength(1);
    expect(outcome.results[0]?.effects.nftsOut[0]).toMatchObject({ count: 1, amount: "1" });
    expect(outcome.results[0]?.effects.nftsOut[0]?.collection.toLowerCase()).toBe(
      LIVE_ERC1155_COLLECTION.toLowerCase(),
    );

    const tampered = structuredClone(plan);
    const declaredNft = tampered.expects.nfts?.[0];
    if (!declaredNft) throw new Error("missing ERC-1155 expectation");
    declaredNft.amountMax = "2";
    const tamperedOutcome = parseText(
      await client.callTool({ name: "simulate", arguments: { plans: [tampered] } }),
    ) as SimulateOutcome;
    expect(tamperedOutcome.ok).toBe(false);
    expect(tamperedOutcome.results[0]?.warnings.map((warning) => warning.code)).toContain(
      "PLAN_TAMPERED",
    );
  });
});
