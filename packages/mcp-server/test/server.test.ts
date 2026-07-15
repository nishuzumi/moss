import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createMossServer } from "../src/server.js";

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

  it("serves the Morpho position query", () => {
    const { registry } = createMossServer();

    expect(registry.discover({ protocol: "morpho" })).toEqual([
      expect.objectContaining({ protocol: "morpho", method: "position", kind: "query" }),
    ]);
  });

  it("action rejects unknown coordinates with a helpful error", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "action",
      arguments: {
        protocol: "nope",
        method: "x",
        account: "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC",
        params: {},
      },
    });
    expect(result.isError).toBe(true);
    const content = result.content as { text: string }[];
    expect(content[0]?.text).toContain("unknown protocol");
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
          account: "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC",
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
});
