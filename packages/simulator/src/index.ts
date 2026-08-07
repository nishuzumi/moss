import {
  type CapabilityNode,
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type Receipt,
  ReceiptCoverageError,
  type UnsignedTx,
  verifyReceiptCoverage,
} from "@themoss/core";
import { ChangeOrderError, extractChanges } from "./changes.js";
import { mergeDiff } from "./overrides.js";
import {
  type CallFrame,
  DEFAULT_SIMULATION_GAS,
  estimateGasWithOverrides,
  resolveSimulationBlock,
  SimulatorUnavailableError,
  type StateOverrides,
  type TraceCall,
  traceWithCalls,
  traceWithDiff,
} from "./trace.js";

export { ChangeOrderError, extractChanges } from "./changes.js";
export { SimulatorUnavailableError };

export type WarningCode =
  | "REVERTED"
  | "TRACE_FAILED"
  | "CHANGE_ORDER_UNAVAILABLE"
  | "RECEIPT_FAILED"
  | "CHANGE_COVERAGE_MISMATCH"
  | "STATE_CHAIN_FAILED";

export interface Warning {
  code: WarningCode;
  message: string;
}

export interface TransactionSimulation {
  protocol: string;
  method: string;
  transaction: UnsignedTx;
  reverted: boolean;
  revertReason?: string;
  receipt?: Receipt;
  changes?: readonly Change[];
  warnings: Warning[];
  gas: string | null;
}

export interface SimulateOutcome {
  results: TransactionSimulation[];
  halted?: { transactionIndex: number; reason: string };
}

export interface Simulator {
  simulate(root: CapabilityNode): Promise<SimulateOutcome>;
  /**
   * The base block pinned by the most recent simulate() invocation, or
   * undefined when no invocation has successfully pinned one yet.
   *
   * Semantics:
   * - Exact identity: the returned block is the one the run resolved once and
   *   reused for every trace, gas estimate, and state diff (ADR 0002). It is
   *   never re-queried and never falls back to `latest`.
   * - Per-run freshness: the exposed state resets at the start of each
   *   simulate() invocation, so after a failed base-block resolution the
   *   previous run's block is never reported.
   * - Post-pin halts: once a run has resolved its base block, the block stays
   *   available even when the run later halts (trace failure, revert, receipt
   *   failure, or state-chain failure).
   * - Availability: the value reflects the most recent invocation that
   *   completed block pinning. Overlapping concurrent simulate() calls on the
   *   same instance are not concurrency-safe.
   */
  getPinnedBlockNumber?(): Promise<Hex | undefined>;
}

export interface SimulatorOptions {
  gasPerTx?: bigint;
  prefundWei?: bigint;
  receipt: (capability: CapabilityNode, changes: readonly Change[]) => Receipt;
}

const DEFAULT_PREFUND_WEI = 10n ** 24n;

export function createTraceSimulator(runtime: MossRuntime, options: SimulatorOptions): Simulator {
  const gasBudget = options.gasPerTx ?? DEFAULT_SIMULATION_GAS;
  const prefund: `0x${string}` = `0x${(options.prefundWei ?? DEFAULT_PREFUND_WEI).toString(16)}`;

  // Base block pinned by the most recent simulate() run. Fail-closed:
  // undefined until a run resolves and pins its block (ADR 0002).
  let pinnedBlock: Hex | undefined;

  return {
    async getPinnedBlockNumber(): Promise<Hex | undefined> {
      return pinnedBlock;
    },

    async simulate(root): Promise<SimulateOutcome> {
      // Reset the exposed pinned block before resolving the new base block so
      // a resolution failure can never leak the previous run's block.
      pinnedBlock = undefined;
      const executable = flattenCapabilityTree(root);
      const overrides: StateOverrides = {};
      const results: TransactionSimulation[] = [];

      // Pin one base block for the whole run so per-transaction evidence and
      // state chaining cannot straddle a block boundary (ADR 0002).
      let block: Hex;
      try {
        block = await resolveSimulationBlock(runtime.client);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const first = executable[0];
        if (first) {
          results.push({
            protocol: first.capability.protocol,
            method: first.capability.method,
            transaction: first.transaction,
            reverted: false,
            warnings: [{ code: "TRACE_FAILED", message: reason }],
            gas: null,
          });
        }
        return { results, halted: { transactionIndex: 0, reason } };
      }

      // This is the exact block every trace, gas estimate, and state diff in
      // the run is pinned to; keep it exposed even if the run halts later.
      pinnedBlock = block;

      for (const [transactionIndex, { capability, transaction }] of executable.entries()) {
        const sender = transaction.from.toLowerCase() as keyof StateOverrides;
        overrides[sender] = { balance: prefund, ...overrides[sender] };
        const call: TraceCall = transaction;
        let frame: CallFrame;
        try {
          frame = await traceWithCalls(
            runtime.client,
            runtime.rpcUrl,
            call,
            block,
            overrides,
            gasBudget,
          );
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          results.push({
            protocol: capability.protocol,
            method: capability.method,
            transaction,
            reverted: false,
            warnings: [{ code: "TRACE_FAILED", message: reason }],
            gas: null,
          });
          return { results, halted: { transactionIndex, reason } };
        }

        if (frame.error) {
          const reason = frame.revertReason ?? frame.error;
          results.push({
            protocol: capability.protocol,
            method: capability.method,
            transaction,
            reverted: true,
            revertReason: reason,
            warnings: [{ code: "REVERTED", message: `transaction reverted: ${reason}` }],
            gas: null,
          });
          return { results, halted: { transactionIndex, reason } };
        }

        let changes: readonly Change[];
        try {
          changes = extractChanges(frame);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          const warning: Warning = {
            code: error instanceof ChangeOrderError ? "CHANGE_ORDER_UNAVAILABLE" : "RECEIPT_FAILED",
            message: reason,
          };
          results.push({
            protocol: capability.protocol,
            method: capability.method,
            transaction,
            reverted: false,
            warnings: [warning],
            gas: null,
          });
          return { results, halted: { transactionIndex, reason } };
        }

        let receipt: Receipt;
        try {
          receipt = options.receipt(capability, changes);
          verifyReceiptCoverage(changes, receipt);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          results.push({
            protocol: capability.protocol,
            method: capability.method,
            transaction,
            reverted: false,
            changes,
            warnings: [
              {
                code:
                  error instanceof ReceiptCoverageError
                    ? "CHANGE_COVERAGE_MISMATCH"
                    : "RECEIPT_FAILED",
                message: reason,
              },
            ],
            gas: null,
          });
          return { results, halted: { transactionIndex, reason } };
        }

        const gas = await estimateGasWithOverrides(runtime.client, call, block, overrides);
        if (transactionIndex < executable.length - 1) {
          try {
            const diff = await traceWithDiff(
              runtime.client,
              runtime.rpcUrl,
              call,
              block,
              overrides,
              gasBudget,
            );
            mergeDiff(overrides, diff);
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            results.push({
              protocol: capability.protocol,
              method: capability.method,
              transaction,
              reverted: false,
              receipt,
              changes,
              warnings: [{ code: "STATE_CHAIN_FAILED", message: reason }],
              gas: gas?.toString() ?? null,
            });
            return { results, halted: { transactionIndex, reason } };
          }
        }
        results.push({
          protocol: capability.protocol,
          method: capability.method,
          transaction,
          reverted: false,
          receipt,
          changes,
          warnings: [],
          gas: gas?.toString() ?? null,
        });
      }
      return { results };
    },
  };
}
