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

function runtimeWithFrames(
  frames: CallFrame[],
  requests?: { method: string; tracer?: string }[],
): MossRuntime {
  let frameIndex = 0;
  return {
    rpcUrl: "http://offline",
    client: {
      request: async ({ method, params }: { method: string; params: unknown[] }) => {
        const tracer = (params[2] as { tracer?: string } | undefined)?.tracer;
        requests?.push({ method, ...(tracer ? { tracer } : {}) });
        if (method === "eth_estimateGas") return "0x5208";
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
    let receiptCalls = 0;
    const root = capability("parent", C, [capability("child", B)]);
    const simulator = createTraceSimulator(
      runtimeWithFrames([
        {
          type: "CALL",
          from: A,
          to: B,
          error: "execution reverted",
          logs: [{ address: B, topics: ["0x01"], data: "0x02" }],
        },
        { type: "CALL", from: A, to: C },
      ]),
      {
        receipt: () => {
          receiptCalls += 1;
          throw new Error("reverted transactions must not be parsed");
        },
      },
    );

    const outcome = await simulator.simulate(root);
    expect(receiptCalls).toBe(0);
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

  it("classifies forged Change coverage and halts before later work", async () => {
    const requests: { method: string; tracer?: string }[] = [];
    const root = capability("parent", C, [capability("child", B)]);
    const outcome = await createTraceSimulator(
      runtimeWithFrames(
        [
          {
            type: "CALL",
            from: A,
            to: B,
            logs: [{ address: B, topics: ["0x01"], data: "0x02" }],
          },
          { type: "CALL", from: A, to: C, logs: [] },
        ],
        requests,
      ),
      {
        receipt: (_node, changes) => coveringReceipt(changes.map((change) => ({ ...change }))),
      },
    ).simulate(root);

    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.warnings[0]?.code).toBe("CHANGE_COVERAGE_MISMATCH");
    expect(outcome.halted).toEqual({
      transactionIndex: 0,
      reason: "Receipt Change 0 does not retain the original object in order",
    });
    expect(requests).toEqual([{ method: "debug_traceCall", tracer: "callTracer" }]);
  });

  it("treats arbitrary Receipt parser failures as terminal warnings", async () => {
    const outcome = await createTraceSimulator(
      runtimeWithFrames([
        {
          type: "CALL",
          from: A,
          to: B,
          logs: [{ address: B, topics: ["0x01"], data: "0x02" }],
        },
      ]),
      {
        receipt: () => {
          throw new Error("parser rejected ambiguous evidence");
        },
      },
    ).simulate(capability("fixture", B));

    expect(outcome.results[0]?.warnings[0]).toEqual({
      code: "RECEIPT_FAILED",
      message: "parser rejected ambiguous evidence",
    });
    expect(outcome.halted).toEqual({
      transactionIndex: 0,
      reason: "parser rejected ambiguous evidence",
    });
  });
});
