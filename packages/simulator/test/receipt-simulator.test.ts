import type { Address, CapabilityNode, Change, MossRuntime, Receipt } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { createTraceSimulator } from "../src/index.js";
import type { CallFrame, PrestateDiff, StateOverrides } from "../src/trace.js";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;
const C = "0x3333333333333333333333333333333333333333" as Address;
const PINNED_BLOCK = "0x100";

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

function coveringReceipt(
  protocol: string,
  changes: readonly Change[],
): Receipt<{ operation: "run" }> {
  return {
    kind: "receipt",
    protocol,
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
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === "eth_blockNumber") {
          requests?.push({ method });
          return PINNED_BLOCK;
        }
        const tracer = (params?.[2] as { tracer?: string } | undefined)?.tracer;
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
      { receipt: (node, changes) => coveringReceipt(node.protocol, changes) },
    );

    const outcome = await simulator.simulate(root);
    expect(outcome.results.map(({ protocol }) => protocol)).toEqual(["child", "parent"]);
    expect(outcome.results.every(({ receipt }) => receipt?.kind === "receipt")).toBe(true);
    expect(outcome.results.every(({ warnings }) => warnings.length === 0)).toBe(true);
  });

  it("passes the first transaction state diff into the second transaction trace", async () => {
    const requests: { method: string; params: unknown[] }[] = [];
    const slot = `0x${"01".repeat(32)}` as `0x${string}`;
    const value = `0x${"02".repeat(32)}` as `0x${string}`;
    const cleared = `0x${"03".repeat(32)}` as `0x${string}`;
    const zeroWord = `0x${"00".repeat(32)}` as `0x${string}`;
    const diff: PrestateDiff = {
      pre: { [B]: { storage: { [slot]: "0x00", [cleared]: "0x01" } } },
      post: {
        [B]: { balance: "0x10", nonce: 2, code: "0x6000", storage: { [slot]: value } },
      },
    };
    let callIndex = 0;
    const runtime: MossRuntime = {
      rpcUrl: "http://offline",
      client: {
        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          requests.push({ method, params: params ?? [] });
          if (method === "eth_blockNumber") return PINNED_BLOCK;
          if (method === "eth_estimateGas") return "0x5208";
          const tracer = (params?.[2] as { tracer?: string } | undefined)?.tracer;
          if (tracer === "prestateTracer") return diff;
          if (tracer === "callTracer") {
            const to = callIndex++ === 0 ? B : C;
            return { type: "CALL", from: A, to, logs: [] } satisfies CallFrame;
          }
          throw new Error(`unexpected RPC method ${method}`);
        },
        // biome-ignore lint/suspicious/noExplicitAny: minimal debug RPC fixture
      } as any,
    };

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => coveringReceipt(node.protocol, changes),
    }).simulate(capability("parent", C, [capability("child", B)]));

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(2);
    expect(outcome.results.every(({ warnings }) => warnings.length === 0)).toBe(true);
    expect(
      requests.map(({ method, params }) => ({
        method,
        tracer: (params[2] as { tracer?: string } | undefined)?.tracer,
      })),
    ).toEqual([
      { method: "eth_blockNumber", tracer: undefined },
      { method: "debug_traceCall", tracer: "callTracer" },
      { method: "eth_estimateGas", tracer: undefined },
      { method: "debug_traceCall", tracer: "prestateTracer" },
      { method: "debug_traceCall", tracer: "callTracer" },
      { method: "eth_estimateGas", tracer: undefined },
    ]);
    // Every trace, diff, and gas estimate in the run pins the same base block.
    for (const { method, params } of requests) {
      if (method === "debug_traceCall" || method === "eth_estimateGas") {
        expect(params[1]).toBe(PINNED_BLOCK);
      }
    }
    const secondCall = requests[4]?.params[2] as { stateOverrides?: StateOverrides } | undefined;
    expect(secondCall?.stateOverrides?.[B]).toEqual({
      balance: "0x10",
      nonce: "0x2",
      code: "0x6000",
      stateDiff: { [slot]: value, [cleared]: zeroWord },
    });
  });

  it("keeps the first Receipt and halts when state chaining fails", async () => {
    const requests: string[] = [];
    const runtime: MossRuntime = {
      rpcUrl: "http://offline",
      client: {
        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          const tracer = (params?.[2] as { tracer?: string } | undefined)?.tracer;
          requests.push(tracer ?? method);
          if (method === "eth_blockNumber") return PINNED_BLOCK;
          if (method === "eth_estimateGas") return "0x5208";
          if (tracer === "callTracer") {
            return { type: "CALL", from: A, to: B, logs: [] } satisfies CallFrame;
          }
          if (tracer === "prestateTracer") throw new Error("prestate unavailable");
          throw new Error(`unexpected RPC method ${method}`);
        },
        // biome-ignore lint/suspicious/noExplicitAny: minimal debug RPC fixture
      } as any,
    };

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => coveringReceipt(node.protocol, changes),
    }).simulate(capability("parent", C, [capability("child", B)]));

    expect(requests).toEqual([
      "eth_blockNumber",
      "callTracer",
      "eth_estimateGas",
      "prestateTracer",
    ]);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.receipt?.protocol).toBe("child");
    expect(outcome.results[0]?.warnings).toEqual([
      { code: "STATE_CHAIN_FAILED", message: "prestate unavailable" },
    ]);
    expect(outcome.halted).toEqual({ transactionIndex: 0, reason: "prestate unavailable" });
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
        request: async ({ method }: { method: string }) => {
          if (method === "eth_blockNumber") return PINNED_BLOCK;
          throw new Error("debug_traceCall unavailable");
        },
        // biome-ignore lint/suspicious/noExplicitAny: minimal failing RPC fixture
      } as any,
    };
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => coveringReceipt(node.protocol, changes),
    }).simulate(capability("fixture", B));
    expect(outcome.results[0]?.warnings).toEqual([
      { code: "TRACE_FAILED", message: "debug_traceCall unavailable" },
    ]);
    expect(outcome.halted?.transactionIndex).toBe(0);
  });

  it("halts before any trace when the base block cannot be resolved", async () => {
    const requests: string[] = [];
    const runtime: MossRuntime = {
      rpcUrl: "http://offline",
      client: {
        request: async ({ method }: { method: string }) => {
          requests.push(method);
          throw new Error("rpc unreachable");
        },
        // biome-ignore lint/suspicious/noExplicitAny: minimal failing RPC fixture
      } as any,
    };
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => coveringReceipt(node.protocol, changes),
    }).simulate(capability("fixture", B));
    expect(requests).toEqual(["eth_blockNumber"]);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.warnings).toEqual([
      { code: "TRACE_FAILED", message: "rpc unreachable" },
    ]);
    expect(outcome.halted).toEqual({ transactionIndex: 0, reason: "rpc unreachable" });
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
        receipt: (node, changes) =>
          coveringReceipt(
            node.protocol,
            changes.map((change) => ({ ...change })),
          ),
      },
    ).simulate(root);

    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.warnings[0]?.code).toBe("CHANGE_COVERAGE_MISMATCH");
    expect(outcome.halted).toEqual({
      transactionIndex: 0,
      reason: "Receipt Change 0 does not retain the original object in order",
    });
    expect(requests).toEqual([
      { method: "eth_blockNumber" },
      { method: "debug_traceCall", tracer: "callTracer" },
    ]);
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
