import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type AddressValue,
  CATEGORIES,
  type CapabilityNode,
  type MossRuntime,
  type ProtocolSource,
  type ReceiptResult,
  Registry,
  VERBS,
} from "@themoss/core";
import { createTraceSimulator, type SimulateOutcome, type Simulator } from "@themoss/simulator";
import { z } from "zod";

export interface MossServerOptions {
  runtime: MossRuntime;
  protocols: readonly ProtocolSource[];
}

const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "expected a 20-byte 0x address");
const hexSchema = z.string().regex(/^0x[0-9a-fA-F]*$/, "expected 0x hex data");
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const transactionSchema = z.object({
  kind: z.literal("transaction"),
  transaction: z.object({
    from: addressSchema,
    to: addressSchema,
    data: hexSchema,
    value: hexSchema,
  }),
});

const capabilitySchema: z.ZodType<CapabilityNode> = z.lazy(() =>
  z.object({
    kind: z.literal("capability"),
    protocol: z.string().min(1),
    method: z.string().min(1),
    params: jsonValueSchema,
    receipt: z.string().min(1),
    children: z.array(z.union([capabilitySchema, transactionSchema])),
  }),
) as z.ZodType<CapabilityNode>;

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

function receiptTexts(receipt: ReceiptResult): string[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.text] : receiptTexts(entry),
  );
}

/** Projects the SDK simulation evidence into the small Agent-facing MCP response. */
export function toAgentSimulation(outcome: SimulateOutcome) {
  const ok = !outcome.halted && outcome.results.every((result) => result.warnings.length === 0);
  return {
    ok,
    guidance: ok
      ? "Compare every ordered Receipt text with the user's intent before handing transactions to a signer."
      : "Stop. Do not sign; report the warning and failed transaction.",
    ...(outcome.halted ? { halted: outcome.halted } : {}),
    results: outcome.results.map(({ protocol, method, receipt, warnings }) => ({
      protocol,
      method,
      texts: receipt ? receiptTexts(receipt) : [],
      warnings,
    })),
  };
}

/** Creates the four-tool Moss MCP server. It never signs or broadcasts transactions. */
export function createMossServer(opts: MossServerOptions): {
  server: McpServer;
  registry: Registry;
  simulator: Simulator;
} {
  const { runtime } = opts;
  const registry = new Registry(runtime).use(...opts.protocols);
  const simulator = createTraceSimulator(runtime, {
    receipt: (capability, changes) => registry.parseReceipt(capability, changes),
  });
  const { version } = createRequire(import.meta.url)("../package.json") as { version: string };
  const server = new McpServer({ name: "moss", version });

  server.registerTool(
    "discover",
    {
      title: "Discover Protocol operations",
      description:
        "Find Monad Protocol Capabilities and Queries. Return coordinates to pass to load and action. " +
        `Verbs: ${VERBS.join(", ")}. Categories: ${CATEGORIES.join(", ")}.`,
      inputSchema: {
        verb: z.enum(VERBS).optional().describe("User-perspective write operation"),
        category: z.enum(CATEGORIES).optional().describe("Protocol domain"),
        protocol: z.string().optional().describe("Exact Protocol slug"),
      },
    },
    async ({ verb, category, protocol }) => {
      try {
        return json(registry.discover({ verb, category, protocol }));
      } catch (error) {
        return jsonError(error);
      }
    },
  );

  server.registerTool(
    "load",
    {
      title: "Load operation contracts",
      description:
        "Load intent, risks, and every parameter's separate value-type schema and field description.",
      inputSchema: {
        items: z
          .array(z.object({ protocol: z.string(), method: z.string() }))
          .min(1)
          .describe("Coordinates returned by discover"),
      },
    },
    async ({ items }) => {
      try {
        return json(registry.load(items));
      } catch (error) {
        return jsonError(error);
      }
    },
  );

  server.registerTool(
    "action",
    {
      title: "Run a Query or build a Capability",
      description:
        "Run a Query immediately or build an unsigned Capability tree. A Capability must be simulated before signing.",
      inputSchema: {
        protocol: z.string().describe("Protocol slug returned by discover"),
        method: z.string().describe("Method returned by discover"),
        account: addressSchema.describe("Address that sends the transactions"),
        params: z.record(z.unknown()).default({}).describe("Parameters described by load"),
      },
    },
    async ({ protocol, method, account, params }) => {
      try {
        return json(await registry.action(protocol, method, account as AddressValue, params));
      } catch (error) {
        return jsonError(error);
      }
    },
  );

  server.registerTool(
    "simulate",
    {
      title: "Simulate and parse a Capability",
      description:
        "Execute the Capability tree in depth-first order with debug_traceCall. Return each transaction's exhaustive ordered Receipt texts and warnings; the SDK retains full Receipt evidence. Any warning halts execution and must prevent signing.",
      inputSchema: {
        capability: capabilitySchema.describe("Capability tree returned by action"),
      },
    },
    async ({ capability }) => {
      try {
        return json(toAgentSimulation(await simulator.simulate(capability)));
      } catch (error) {
        return jsonError(error);
      }
    },
  );

  return { server, registry, simulator };
}
