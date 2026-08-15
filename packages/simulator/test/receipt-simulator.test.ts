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
    // The run pinned its base block before state chaining failed, so the
    // halted outcome still carries that provenance.
    expect(outcome.simulatorPinnedBlock).toBe(PINNED_BLOCK);
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
    // The reverted run still used its resolved base block for the trace.
    expect(outcome.simulatorPinnedBlock).toBe(PINNED_BLOCK);
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
    // The base block resolved before the trace failed, so the halted outcome
    // retains the block the run actually pinned.
    expect(outcome.simulatorPinnedBlock).toBe(PINNED_BLOCK);
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
    // Base-block resolution failed: no fabricated pin and no stale block.
    expect(outcome.simulatorPinnedBlock).toBeUndefined();
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
    expect(outcome.simulatorPinnedBlock).toBe(PINNED_BLOCK);
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
    expect(outcome.simulatorPinnedBlock).toBe(PINNED_BLOCK);
  });
});

describe("Pinned base block on SimulateOutcome", () => {
  const BLOCK_A = "0xabc";
  const BLOCK_B = "0xdef";

  function deferredGate(): { promise: Promise<void>; open: () => void } {
    let open = () => {};
    const promise = new Promise<void>((resolve) => {
      open = resolve;
    });
    return { promise, open };
  }

  function pinnedBlockRuntime(
    blocks: string[],
    requests: { method: string; params: unknown[] }[],
    failTrace = false,
  ): MossRuntime {
    let blockIndex = 0;
    return {
      rpcUrl: "http://offline",
      client: {
        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          requests.push({ method, params: params ?? [] });
          if (method === "eth_blockNumber") {
            if (blockIndex >= blocks.length) throw new Error("rpc unreachable");
            return blocks[blockIndex++];
          }
          if (method === "eth_estimateGas") return "0x5208";
          const tracer = (params?.[2] as { tracer?: string } | undefined)?.tracer;
          if (tracer === "callTracer") {
            if (failTrace) throw new Error("debug_traceCall unavailable");
            return { type: "CALL", from: A, to: B, logs: [] } satisfies CallFrame;
          }
          if (tracer === "prestateTracer") return { pre: {}, post: {} } satisfies PrestateDiff;
          throw new Error(`unexpected RPC method ${method}`);
        },
        // biome-ignore lint/suspicious/noExplicitAny: minimal debug RPC fixture
      } as any,
    };
  }

  it("exposes the exact block every trace, gas estimate, and diff used, without extra RPC", async () => {
    const requests: { method: string; params: unknown[] }[] = [];
    const outcome = await createTraceSimulator(pinnedBlockRuntime([PINNED_BLOCK], requests), {
      receipt: (node, changes) => coveringReceipt(node.protocol, changes),
    }).simulate(capability("parent", C, [capability("child", B)]));

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(2);
    expect(outcome.simulatorPinnedBlock).toBe(PINNED_BLOCK);

    // Every trace, diff, and gas estimate pinned the outcome's block.
    const blockUsing = requests.filter(
      ({ method }) => method === "debug_traceCall" || method === "eth_estimateGas",
    );
    expect(blockUsing.length).toBeGreaterThan(0);
    for (const { params } of blockUsing) {
      expect(params[1]).toBe(PINNED_BLOCK);
    }

    // The provenance is the run's already-resolved block: no second
    // eth_blockNumber was issued for it.
    expect(requests.filter(({ method }) => method === "eth_blockNumber")).toHaveLength(1);
  });

  it("returns each run's own block across repeated simulations", async () => {
    const simulator = createTraceSimulator(pinnedBlockRuntime([BLOCK_A, BLOCK_B], []), {
      receipt: (node, changes) => coveringReceipt(node.protocol, changes),
    });

    const first = await simulator.simulate(capability("fixture", B));
    const second = await simulator.simulate(capability("fixture", B));

    expect(first.simulatorPinnedBlock).toBe(BLOCK_A);
    expect(second.simulatorPinnedBlock).toBe(BLOCK_B);
    // Reading the first outcome after the second run still reports run 1's block.
    expect(first.simulatorPinnedBlock).toBe(BLOCK_A);
  });

  it("leaves the field absent when base-block resolution fails, never leaking the previous run", async () => {
    const simulator = createTraceSimulator(
      // Only one block: the second simulate() resolution fails fail-closed.
      pinnedBlockRuntime([BLOCK_A], []),
      { receipt: (node, changes) => coveringReceipt(node.protocol, changes) },
    );

    const first = await simulator.simulate(capability("fixture", B));
    expect(first.simulatorPinnedBlock).toBe(BLOCK_A);

    const failed = await simulator.simulate(capability("fixture", B));
    expect(failed.halted).toBeDefined();
    expect(failed.simulatorPinnedBlock).toBeUndefined();
  });

  it("retains the pinned block on a post-pin halt", async () => {
    const outcome = await createTraceSimulator(pinnedBlockRuntime([BLOCK_A], [], true), {
      receipt: (node, changes) => coveringReceipt(node.protocol, changes),
    }).simulate(capability("fixture", B));

    expect(outcome.halted).toBeDefined();
    // The run pinned BLOCK_A before the trace failed, so its outcome keeps it.
    expect(outcome.simulatorPinnedBlock).toBe(BLOCK_A);
  });

  it("keeps independent pinned blocks for overlapping runs on one instance", async () => {
    const requests: { method: string; params: unknown[] }[] = [];
    // Gates park both simulate() calls mid-flight so they genuinely overlap on
    // the same simulator instance: run A resolves BLOCK_A and stalls on its
    // first trace while run B resolves BLOCK_B and completes.
    const resolutionGate = deferredGate();
    const traceGate = deferredGate();
    let blockIndex = 0;
    let callIndex = 0;
    const runtime: MossRuntime = {
      rpcUrl: "http://offline",
      client: {
        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          requests.push({ method, params: params ?? [] });
          if (method === "eth_blockNumber") {
            const which = blockIndex++;
            await resolutionGate.promise;
            return which === 0 ? BLOCK_A : BLOCK_B;
          }
          if (method === "eth_estimateGas") return "0x5208";
          const tracer = (params?.[2] as { tracer?: string } | undefined)?.tracer;
          if (tracer === "callTracer") {
            if (callIndex++ === 0) await traceGate.promise;
            return { type: "CALL", from: A, to: B, logs: [] } satisfies CallFrame;
          }
          if (tracer === "prestateTracer") return { pre: {}, post: {} } satisfies PrestateDiff;
          throw new Error(`unexpected RPC method ${method}`);
        },
        // biome-ignore lint/suspicious/noExplicitAny: minimal debug RPC fixture
      } as any,
    };
    const simulator = createTraceSimulator(runtime, {
      receipt: (node, changes) => coveringReceipt(node.protocol, changes),
    });

    const runA = simulator.simulate(capability("fixture", B));
    const runB = simulator.simulate(capability("fixture", B));

    // Both runs are parked on their block resolution: genuinely overlapping.
    resolutionGate.open();
    // Run B finishes entirely while run A is still parked on its first trace.
    const outcomeB = await runB;
    traceGate.open();
    const outcomeA = await runA;

    expect(outcomeA.simulatorPinnedBlock).toBe(BLOCK_A);
    expect(outcomeB.simulatorPinnedBlock).toBe(BLOCK_B);

    // Each run's trace and gas estimate used the block its own outcome reports.
    const blocksUsed = new Map<string, number>();
    for (const { method, params } of requests) {
      if (method === "debug_traceCall" || method === "eth_estimateGas") {
        const block = params[1] as string;
        blocksUsed.set(block, (blocksUsed.get(block) ?? 0) + 1);
      }
    }
    expect(blocksUsed.get(BLOCK_A)).toBe(2); // callTracer + estimateGas
    expect(blocksUsed.get(BLOCK_B)).toBe(2);
    expect(requests.filter(({ method }) => method === "eth_blockNumber")).toHaveLength(2);
  });
});
