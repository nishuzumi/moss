import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  type CapabilityNode,
  type Change,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import type { SimulateOutcome } from "@themoss/simulator";
import * as system from "@themoss/system";
import { encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { createMossServer, toAgentSimulation } from "../src/server.js";

const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

async function connectedClient(simulateOutcome?: SimulateOutcome) {
  const { server, simulator } = createMossServer({ runtime, protocols: [system, erc, kuru] });
  if (simulateOutcome) {
    simulator.simulate = async () => simulateOutcome;
  }
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
      type: { default: 50, description: expect.stringContaining("1 bps equals 0.01%") },
      description: expect.stringContaining("adverse movement"),
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

  it("projects full SDK Receipts into ordered Agent text only", () => {
    const first = eventChange("0x1111111111111111111111111111111111111111");
    const second = eventChange("0x2222222222222222222222222222222222222222");
    const nested: ReceiptResult = {
      kind: "receipt",
      outcome: { operation: "transfer" },
      text: "nested summary",
      changes: [{ kind: "change", change: second, data: { amount: "2" }, text: "second" }],
    };
    const receipt: ReceiptResult = {
      kind: "receipt",
      outcome: { operation: "swap" },
      text: "root summary",
      changes: [{ kind: "change", change: first, data: { amount: "1" }, text: "first" }, nested],
    };
    const outcome: SimulateOutcome = {
      results: [
        {
          protocol: "kuru",
          method: "swap",
          transaction: {
            from: "0xcccccccccccccccccccccccccccccccccccccccc",
            to: "0xdddddddddddddddddddddddddddddddddddddddd",
            data: "0x",
            value: "0x0",
          },
          reverted: false,
          receipt,
          changes: [first, second],
          warnings: [],
          gas: "1",
        },
      ],
    };

    const projected = toAgentSimulation(outcome);
    expect(projected).toEqual({
      ok: true,
      guidance:
        "Compare every ordered Receipt text with the user's intent before handing transactions to a signer.",
      results: [{ protocol: "kuru", method: "swap", texts: ["first", "second"], warnings: [] }],
    });
    expect(JSON.stringify(projected)).not.toMatch(/"(?:outcome|change|data|transaction|gas)":/);
  });

  it("shows the exact Kuru simulation response an Agent receives", async () => {
    const user = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
    const router = kuru.KURU_ROUTER_ADDRESS;
    const usdc = system.USDC_ADDRESS;
    const ausd = system.AUSD_ADDRESS;
    const firstMarket = getAddress("0x1111111111111111111111111111111111111111");
    const secondMarket = getAddress("0x2222222222222222222222222222222222222222");
    const receiptRegistry = new Registry(runtime).use(erc, kuru);
    const approval = erc20Change(usdc, "Approval", user, router, 1_000_000n);
    const swapChanges = [
      erc20Change(usdc, "Transfer", user, router, 1_000_000n),
      kuruEventChange(firstMarket, kuru.KuruOrderbookAbi, "Trade", [
        1n,
        getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
        false,
        123n,
        0n,
        router,
        user,
        500_000_000_000_000_000n,
      ]),
      kuruEventChange(secondMarket, kuru.KuruOrderbookAbi, "Trade", [
        2n,
        getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
        false,
        456n,
        0n,
        router,
        user,
        600_000n,
      ]),
      erc20Change(ausd, "Transfer", router, user, 1_200_000n),
      kuruEventChange(router, kuru.KuruRouterAbi, "KuruRouterSwap", [
        user,
        usdc,
        ausd,
        1_000_000n,
        1_200_000n,
      ]),
    ] as const;
    const outcome: SimulateOutcome = {
      results: [
        simulationResult(
          "erc20",
          "approve",
          receiptRegistry.parseReceipt(receiptCapability("erc20", "approve", "approveReceipt"), [
            approval,
          ]),
        ),
        simulationResult(
          "kuru",
          "swap",
          receiptRegistry.parseReceipt(
            receiptCapability("kuru", "swap", "swapReceipt"),
            swapChanges,
          ),
        ),
      ],
    };

    const client = await connectedClient(outcome);
    const response = parseText(
      await client.callTool({
        name: "simulate",
        arguments: {
          capability: {
            kind: "capability",
            protocol: "kuru",
            method: "swap",
            params: {},
            receipt: "swapReceipt",
            children: [],
          },
        },
      }),
    );

    expect(response).toEqual({
      ok: true,
      guidance:
        "Compare every ordered Receipt text with the user's intent before handing transactions to a signer.",
      results: [
        {
          protocol: "erc20",
          method: "approve",
          texts: [`ERC20 Approval: ${user} approved ${router} for 1000000 ${usdc}`],
          warnings: [],
        },
        {
          protocol: "kuru",
          method: "swap",
          texts: [
            `ERC20 Transfer: 1000000 ${usdc} from ${user} to ${router}`,
            `Trade Event: 500000000000000000 at 123 emitted by ${firstMarket}`,
            `Trade Event: 600000 at 456 emitted by ${secondMarket}`,
            `ERC20 Transfer: 1200000 ${ausd} from ${router} to ${user}`,
            `Kuru Swap: 1000000 ${usdc} to 1200000 ${ausd} by ${user}`,
          ],
          warnings: [],
        },
      ],
    });
  });
});

function eventChange(address: `0x${string}`): Change {
  return { kind: "event", address, topics: ["0x01"], data: "0x02" };
}

function receiptCapability(protocol: string, method: string, receipt: string): CapabilityNode {
  return {
    kind: "capability",
    protocol,
    method,
    params: {},
    receipt,
    children: [
      {
        kind: "transaction",
        transaction: {
          from: "0xcccccccccccccccccccccccccccccccccccccccc",
          to: "0xdddddddddddddddddddddddddddddddddddddddd",
          data: "0x",
          value: "0x0",
        },
      },
    ],
  };
}

function erc20Change(
  token: `0x${string}`,
  eventName: "Approval" | "Transfer",
  from: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
): Change {
  const args = eventName === "Approval" ? { owner: from, spender: to } : { from, to };
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({ abi: erc.ERC20Abi, eventName, args } as never) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function kuruEventChange(
  address: `0x${string}`,
  abi: typeof kuru.KuruRouterAbi | typeof kuru.KuruOrderbookAbi,
  eventName: "Trade" | "KuruRouterSwap",
  values: readonly unknown[],
): Change {
  const types =
    eventName === "Trade"
      ? ["uint40", "address", "bool", "uint256", "uint96", "address", "address", "uint96"]
      : ["address", "address", "address", "uint256", "uint256"];
  return {
    kind: "event",
    address,
    topics: encodeEventTopics({ abi, eventName } as never) as readonly Hex[],
    data: encodeAbiParameters(types.map((type) => ({ type })) as never, values as never),
  };
}

function simulationResult(protocol: string, method: string, receipt: ReceiptResult) {
  return {
    protocol,
    method,
    transaction: {
      from: "0xcccccccccccccccccccccccccccccccccccccccc" as const,
      to: "0xdddddddddddddddddddddddddddddddddddddddd" as const,
      data: "0x" as const,
      value: "0x0" as const,
    },
    reverted: false,
    receipt,
    warnings: [],
    gas: "1",
  };
}
