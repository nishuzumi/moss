import type { Address, CapabilityNode, Change, MossRuntime, Receipt } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { createTraceSimulator } from "../src/index.js";
import type { CallFrame } from "../src/trace.js";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;
const C = "0x3333333333333333333333333333333333333333" as Address;

function capability(
  protocol: string,
  to: Address,
  children: CapabilityNode[] = [],
): CapabilityNode {
  return {
    kind: "capability",
    protocol,
    method: "run",
    params: {},
    receipt: "runReceipt",
    children: [
      ...children,
      {
        kind: "transaction",
        transaction: { from: A, to, data: "0x", value: "0x0" },
      },
    ],
  };
}

function coveringReceipt(changes: readonly Change[]): Receipt<{ operation: "run" }> {
  return {
    kind: "receipt",
    outcome: { operation: "run" },
    text: "Ran fixture capability",
    changes: changes.map((change) => ({ kind: "change", change, data: {}, text: "change" })),
  };
}

function runtimeWithFrames(frames: CallFrame[]): MossRuntime {
  let frameIndex = 0;
  return {
    rpcUrl: "http://offline",
    client: {
      request: async ({ method, params }: { method: string; params: unknown[] }) => {
        if (method === "eth_estimateGas") return "0x5208";
        const tracer = (params[2] as { tracer: string }).tracer;
        if (tracer === "callTracer") return frames[frameIndex++];
        return { pre: {}, post: {} };
      },
      // biome-ignore lint/suspicious/noExplicitAny: minimal debug RPC fixture
    } as any,
  };
}

describe("Capability simulation", () => {
  it("executes nested Capabilities in order and returns one verified Receipt per transaction", async () => {
    const root = capability("parent", C, [capability("child", B)]);
    const simulator = createTraceSimulator(
      runtimeWithFrames([
        { type: "CALL", from: A, to: B, logs: [] },
        { type: "CALL", from: A, to: C, logs: [] },
      ]),
      { receipt: (_node, changes) => coveringReceipt(changes) },
    );

    const outcome = await simulator.simulate(root);
    expect(outcome.results.map(({ protocol }) => protocol)).toEqual(["child", "parent"]);
    expect(outcome.results.every(({ receipt }) => receipt?.kind === "receipt")).toBe(true);
    expect(outcome.results.every(({ warnings }) => warnings.length === 0)).toBe(true);
  });

  it("returns no Receipt for a revert and stops later transactions", async () => {
    const root = capability("parent", C, [capability("child", B)]);
    const simulator = createTraceSimulator(
      runtimeWithFrames([
        { type: "CALL", from: A, to: B, error: "execution reverted" },
        { type: "CALL", from: A, to: C },
      ]),
      { receipt: (_node, changes) => coveringReceipt(changes) },
    );

    const outcome = await simulator.simulate(root);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.receipt).toBeUndefined();
    expect(outcome.results[0]?.warnings[0]?.code).toBe("REVERTED");
    expect(outcome.halted).toEqual({ transactionIndex: 0, reason: "execution reverted" });
  });

  it("turns unavailable trace evidence into a terminal Warning", async () => {
    const runtime: MossRuntime = {
      rpcUrl: "http://offline",
      client: {
        request: async () => {
          throw new Error("debug_traceCall unavailable");
        },
        // biome-ignore lint/suspicious/noExplicitAny: minimal failing RPC fixture
      } as any,
    };
    const outcome = await createTraceSimulator(runtime, {
      receipt: (_node, changes) => coveringReceipt(changes),
    }).simulate(capability("fixture", B));
    expect(outcome.results[0]?.warnings).toEqual([
      { code: "TRACE_FAILED", message: "debug_traceCall unavailable" },
    ]);
    expect(outcome.halted?.transactionIndex).toBe(0);
  });
});
