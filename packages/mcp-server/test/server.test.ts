import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { MossRuntime } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import * as system from "@themoss/system";
import { describe, expect, it } from "vitest";
import { createMossServer } from "../src/server.js";

const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

async function connectedClient() {
  const { server } = createMossServer({ runtime, protocols: [system, erc, kuru] });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function parseText(result: Awaited<ReturnType<Client["callTool"]>>): unknown {
  const content = result.content as { type: string; text: string }[];
  return JSON.parse(content[0]?.text ?? "null");
}

describe("moss MCP server", () => {
  it("exposes exactly discover, load, action, and simulate", async () => {
    const { tools } = await (await connectedClient()).listTools();
    expect(tools.map(({ name }) => name).sort()).toEqual([
      "action",
      "discover",
      "load",
      "simulate",
    ]);
  });

  it("discovers direct Protocol exports and loads type plus field descriptions", async () => {
    const client = await connectedClient();
    const discovered = parseText(
      await client.callTool({ name: "discover", arguments: { verb: "wrap" } }),
    ) as { protocol: string; method: string }[];
    expect(discovered).toEqual([
      expect.objectContaining({ protocol: "wmon", method: "wrap", kind: "capability" }),
    ]);
    const loaded = parseText(
      await client.callTool({
        name: "load",
        arguments: { items: [{ protocol: "kuru", method: "swap" }] },
      }),
    ) as { params: Record<string, { type: unknown; description: string }> }[];
    expect(loaded[0]?.params.slippage).toMatchObject({
      type: { default: 50 },
      description: expect.stringContaining("0.5%"),
    });
  });

  it("round-trips a Capability tree through action JSON", async () => {
    const capability = parseText(
      await (await connectedClient()).callTool({
        name: "action",
        arguments: {
          protocol: "wmon",
          method: "wrap",
          account: "0xcccccccccccccccccccccccccccccccccccccccc",
          params: { amount: "0.25" },
        },
      }),
    ) as { kind: string; receipt: string; children: unknown[] };
    expect(capability).toMatchObject({
      kind: "capability",
      protocol: "wmon",
      method: "wrap",
      receipt: "wrapReceipt",
    });
    expect(capability.children).toHaveLength(1);
  });

  it("publishes simulate as one recursive Capability input", async () => {
    const { tools } = await (await connectedClient()).listTools();
    const simulate = tools.find(({ name }) => name === "simulate");
    expect(simulate?.inputSchema).toMatchObject({
      type: "object",
      required: ["capability"],
      properties: { capability: expect.any(Object) },
    });
    expect(JSON.stringify(simulate?.inputSchema)).not.toContain("plans");
  });
});
