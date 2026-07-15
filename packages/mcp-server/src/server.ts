import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type Address,
  CATEGORIES,
  type Plan,
  Registry,
  RISK_LABELS,
  VERBS,
  validateExpects,
} from "@themoss/core";
import { erc20MetadataSource, ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator, type Simulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { z } from "zod";

export interface MossServerOptions {
  rpcUrl?: string;
  chainId?: number;
}

const MAX_PLANS = 16;
const MAX_TXS_PER_PLAN = 32;
const MAX_EXPECTATION_ENTRIES = 256;
const MAX_CALLDATA_HEX_CHARS = 2 + 256 * 1024 * 2;

const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "expected a 20-byte 0x address");

const calldataSchema = z
  .string()
  .max(MAX_CALLDATA_HEX_CHARS, "calldata exceeds 256 KiB")
  .regex(/^0x(?:[0-9a-fA-F]{2})*$/, "expected byte-aligned 0x hex data");

const valueSchema = z
  .string()
  .max(66, "transaction value exceeds uint256")
  .regex(/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/, "expected a canonical 0x quantity");

const uintStringSchema = z
  .string()
  .max(78, "uint256 decimal strings are at most 78 digits")
  .regex(/^(0|[1-9][0-9]*)$/, "expected a uint decimal string");

const tokenRefSchema = z.union([z.literal("native"), addressSchema]);

const nftExpectationSchema = z
  .object({
    collection: addressSchema,
    count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    direction: z.enum(["in", "out"]),
    items: z
      .array(
        z
          .object({
            tokenId: uintStringSchema,
            amountMax: uintStringSchema.optional(),
          })
          .strict(),
      )
      .max(MAX_EXPECTATION_ENTRIES)
      .optional(),
  })
  .strict();

const nftTransferSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("erc721"),
      collection: addressSchema,
      from: addressSchema,
      to: addressSchema,
      tokenId: uintStringSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("erc1155-single"),
      collection: addressSchema,
      operator: addressSchema,
      from: addressSchema,
      to: addressSchema,
      tokenId: uintStringSchema,
      amount: uintStringSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("erc1155-batch"),
      collection: addressSchema,
      operator: addressSchema,
      from: addressSchema,
      to: addressSchema,
      items: z
        .array(z.object({ tokenId: uintStringSchema, amount: uintStringSchema }).strict())
        .max(MAX_EXPECTATION_ENTRIES),
    })
    .strict(),
]);

// The Plan travels agent-side between action and simulate (the server is
// stateless), so simulate revalidates its whole shape here and its integrity
// via planHash inside the simulator.
const planSchema = z
  .object({
    kind: z.literal("plan"),
    protocol: z.string(),
    method: z.string(),
    verb: z.enum(VERBS),
    chainId: z.number().int().positive().safe(),
    account: addressSchema,
    intent: z.string(),
    declaredRisk: z.array(z.enum(RISK_LABELS)).max(RISK_LABELS.length),
    expects: z
      .object({
        out: z
          .array(z.object({ token: tokenRefSchema, amountMax: uintStringSchema }).strict())
          .max(MAX_EXPECTATION_ENTRIES)
          .optional(),
        in: z
          .array(z.object({ token: tokenRefSchema, amountMin: uintStringSchema }).strict())
          .max(MAX_EXPECTATION_ENTRIES)
          .optional(),
        approvals: z
          .array(
            z
              .object({
                token: addressSchema,
                spender: addressSchema,
                amountMax: uintStringSchema,
              })
              .strict(),
          )
          .max(MAX_EXPECTATION_ENTRIES)
          .optional(),
        nfts: z.array(nftExpectationSchema).max(MAX_EXPECTATION_ENTRIES).optional(),
        nftTransfers: z.array(nftTransferSchema).max(MAX_EXPECTATION_ENTRIES).optional(),
      })
      .strict(),
    confirms: z.array(z.string()).max(64),
    txs: z
      .array(
        z
          .object({
            from: addressSchema,
            to: addressSchema,
            data: calldataSchema,
            value: valueSchema,
          })
          .strict(),
      )
      .min(1)
      .max(MAX_TXS_PER_PLAN),
    planHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  })
  .strict();

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function jsonError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

/**
 * The Moss MCP server: four stateless tools over one protocol Registry.
 * discover → load → action → (for writes) simulate. Nothing here signs or
 * sends a transaction — ever.
 */
export function createMossServer(opts: MossServerOptions = {}): {
  server: McpServer;
  registry: Registry;
  simulator: Simulator;
} {
  const runtime = monadRuntime(opts);
  const registry = new Registry(runtime, {
    // Tokens outside the table resolve their metadata on-chain (addresses
    // only; unknown symbols still fail loudly — ADR 0005).
    tokenFallback: erc20MetadataSource(runtime.client),
  });
  // The served catalog, assembled right here (ADR 0006): listing a protocol
  // is one dependency plus one entry in this array.
  for (const manifest of [systemManifest, ercManifest, kuruManifest]) registry.use(manifest);
  // Observation plane: protocol-authored @Event narration + receipt checks.
  const simulator = createTraceSimulator(runtime, { observer: registry.observer() });

  // Version rides on package.json so changesets releases can't drift it.
  const { version } = createRequire(import.meta.url)("../package.json") as { version: string };
  const server = new McpServer({ name: "moss", version });

  server.registerTool(
    "discover",
    {
      title: "Discover protocol capabilities",
      description:
        "Find on-chain capabilities (writes) and queries (reads) across Monad protocols. " +
        "Filter by verb (the user-perspective fund action) and/or category. " +
        "Returns coordinates {protocol, method} to pass to load/action. " +
        `Verbs: ${VERBS.join(", ")}. Categories: ${CATEGORIES.join(", ")}.`,
      inputSchema: {
        verb: z.enum(VERBS).optional().describe("User-perspective fund action to filter by"),
        category: z.enum(CATEGORIES).optional().describe("Protocol domain to filter by"),
        protocol: z.string().optional().describe("Exact protocol slug to filter by"),
      },
    },
    async ({ verb, category, protocol }) => {
      try {
        return json(registry.discover({ verb, category, protocol }));
      } catch (err) {
        return jsonError(err);
      }
    },
  );

  server.registerTool(
    "load",
    {
      title: "Load capability stubs",
      description:
        "Fetch full calling contracts for specific coordinates: the intent template, " +
        "each parameter's semantics (pass human-readable values — never pre-scale " +
        "amounts to base units), and declared risk labels.",
      inputSchema: {
        items: z
          .array(z.object({ protocol: z.string(), method: z.string() }))
          .min(1)
          .describe("Coordinates from discover"),
      },
    },
    async ({ items }) => {
      try {
        return json(registry.load(items));
      } catch (err) {
        return jsonError(err);
      }
    },
  );

  server.registerTool(
    "action",
    {
      title: "Run a query or build a Plan",
      description:
        "Execute a query (returns data immediately) or build a capability's Plan: " +
        "UNSIGNED transactions plus the declared intent, risks, and quantified " +
        "expectations. Moss never signs or sends. " +
        "MANDATORY: before showing a Plan to the user or any signer, pass it to " +
        "simulate and check the warnings.",
      inputSchema: {
        protocol: z.string().describe("Protocol slug from discover"),
        method: z.string().describe("Method name from discover"),
        account: addressSchema.describe("The user's address (sender of any transactions)"),
        params: z
          .record(z.unknown())
          .default({})
          .describe("Parameters per the load stub, human-readable values"),
      },
    },
    async ({ protocol, method, account, params }) => {
      try {
        // account passed the 0x-address regex above; narrow for the registry.
        return json(await registry.action(protocol, method, account as Address, params));
      } catch (err) {
        return jsonError(err);
      }
    },
  );

  server.registerTool(
    "simulate",
    {
      title: "Simulate Plans and reconcile effects",
      description:
        "Simulate one or more Plans in order against live Monad state (later plans " +
        "see earlier plans' effects — use this for multi-step flows). Returns, per " +
        "plan: the effects summary (assets out/in, approvals, recipients), gas, and " +
        "warnings from reconciling declared expectations against actual effects. " +
        "RULES: if any warning is present, STOP — do not hand the transactions to a " +
        "signer; report the warnings instead. If warnings are empty, still compare " +
        "the effects summary against what the user actually asked for (intent " +
        "alignment) before proceeding.",
      inputSchema: {
        plans: z
          .array(planSchema)
          .min(1)
          .max(MAX_PLANS)
          .describe("Plans exactly as returned by action"),
      },
    },
    async ({ plans }) => {
      try {
        // Zod has checked the JSON shape; core owns the Plan-domain semantics
        // and narrows the address-bearing expectation contract from here.
        for (const plan of plans) validateExpects(plan.expects as Plan["expects"]);
        const outcome = await simulator.simulate(plans as Plan[]);
        const ok = outcome.results.every((r) => r.warnings.length === 0);
        return json({
          ok,
          guidance: ok
            ? "No warnings. Verify the effects match the user's intent, then the unsigned transactions may be handed to the signer."
            : "WARNINGS PRESENT — do not sign. Report the warnings to the user.",
          ...outcome,
        });
      } catch (err) {
        return jsonError(err);
      }
    },
  );

  return { server, registry, simulator };
}
