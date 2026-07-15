import type { Hex, MossRuntime, ObserverHook, Plan, PlanObservation } from "@themoss/core";
import { computePlanHash, validateExpects } from "@themoss/core";
import { collectLogs, EffectsAccumulator, type EffectsSummary } from "./effects.js";
import { mergeDiff } from "./overrides.js";
import { reconcile, type Warning } from "./reconcile.js";
import type { TraceLog } from "./trace.js";
import {
  DEFAULT_SIMULATION_GAS,
  estimateGasWithOverrides,
  SimulatorUnavailableError,
  type StateOverrides,
  type TraceCall,
  traceWithCalls,
  traceWithDiff,
} from "./trace.js";

export type { EffectsSummary } from "./effects.js";
export type { Warning, WarningCode } from "./reconcile.js";
export { SimulatorUnavailableError };

export interface PlanSimResult {
  protocol: string;
  method: string;
  intent: string;
  planHash: Hex;
  /** False when the received txs/expects no longer match the planHash. */
  planHashValid: boolean;
  reverted: boolean;
  revertReason?: string;
  effects: EffectsSummary;
  /** Protocol-authored narration from @Event pipelines (ADR 0008). */
  observations: PlanObservation[];
  warnings: Warning[];
  /** Per-tx gas estimates; null where the endpoint rejects override-based estimation. */
  gasPerTx: (string | null)[];
}

export interface SimulateOutcome {
  results: PlanSimResult[];
  /** Set when a revert stopped the chain; later plans were not simulated. */
  halted?: { planIndex: number; txIndex: number; reason: string };
}

/**
 * The gate that turns `declared` into `verified` (ADR 0002). An interface,
 * not a class: roughly half of third-party free tiers block debug_traceCall,
 * so alternative backends (anvil fork) must be addable without touching
 * callers.
 */
export interface Simulator {
  /**
   * Simulate an ordered list of Plans as one chain: each transaction runs on
   * top of the accumulated state of everything before it (cross-protocol
   * composition). Each Plan's expects are reconciled independently.
   */
  simulate(plans: Plan[]): Promise<SimulateOutcome>;
}

export interface SimulatorOptions {
  /** Gas budget per simulated transaction (default 10M — see ADR 0002). */
  gasPerTx?: bigint;
  /** Virtual balance granted to the plan's account (default 1M MON). */
  prefundWei?: bigint;
  /**
   * Observation hook (wire `registry.observer()`): renders protocol-authored
   * @Event narration per plan, and enables `confirms` receipt checking.
   */
  observer?: ObserverHook;
}

/** 1,000,000 MON — ample for any plan's value transfers plus gas. */
const DEFAULT_PREFUND_WEI = 10n ** 24n;

export function createTraceSimulator(
  runtime: MossRuntime,
  options: SimulatorOptions = {},
): Simulator {
  const gasBudget = options.gasPerTx ?? DEFAULT_SIMULATION_GAS;
  const prefund: `0x${string}` = `0x${(options.prefundWei ?? DEFAULT_PREFUND_WEI).toString(16)}`;
  return {
    async simulate(plans: Plan[]): Promise<SimulateOutcome> {
      // Validate the complete batch before the first RPC so a malformed later
      // Plan cannot consume trace work for earlier Plans.
      for (const plan of plans) validateExpects(plan.expects);
      const overrides: StateOverrides = {};
      const results: PlanSimResult[] = [];
      let halted: SimulateOutcome["halted"];

      for (const [planIndex, plan] of plans.entries()) {
        if (plan.chainId !== runtime.chainId) {
          throw new Error(
            `plan ${planIndex} targets chain ${plan.chainId}, simulator runs on ${runtime.chainId}`,
          );
        }
        // Monad's debug_traceCall enforces sender balance. Pre-fund the account
        // (like eth_simulateV1 with validation off): simulate answers "what
        // would this plan do", not "can the account afford it" — affordability
        // is the wallet's question at signing time. Real state, once merged
        // from diffs, takes precedence on later transactions.
        const account = plan.account.toLowerCase() as keyof StateOverrides;
        overrides[account] = { balance: prefund, ...overrides[account] };
        const expectedHash = computePlanHash(plan);
        const planHashValid = expectedHash === plan.planHash;
        const acc = new EffectsAccumulator(plan.account);
        const planLogs: TraceLog[] = [];
        const gasPerTx: (string | null)[] = [];
        let reverted = false;
        let revertReason: string | undefined;

        for (const [txIndex, tx] of plan.txs.entries()) {
          const call: TraceCall = { from: tx.from, to: tx.to, data: tx.data, value: tx.value };
          const frame = await traceWithCalls(
            runtime.client,
            runtime.rpcUrl,
            call,
            overrides,
            gasBudget,
          );
          if (frame.error) {
            reverted = true;
            revertReason = frame.revertReason ?? frame.error;
            halted = { planIndex, txIndex, reason: revertReason };
            break;
          }
          acc.addFrame(frame);
          planLogs.push(...collectLogs(frame));
          const gas = await estimateGasWithOverrides(runtime.client, call, overrides);
          gasPerTx.push(gas === null ? null : gas.toString());
          const diff = await traceWithDiff(
            runtime.client,
            runtime.rpcUrl,
            call,
            overrides,
            gasBudget,
          );
          mergeDiff(overrides, diff);
        }

        const effects = acc.summary();
        const warnings: Warning[] = [];
        if (!planHashValid) {
          warnings.push({
            code: "PLAN_TAMPERED",
            message:
              "the plan's transactions or expects were modified after it was built; do not sign",
          });
        }
        if (reverted) {
          warnings.push({
            code: "REVERTED",
            message: `transaction reverted during simulation: ${revertReason}`,
          });
        }
        warnings.push(...reconcile(plan.expects, effects));

        // Observation plane: protocol-authored narration, never audit input
        // (ADR 0008) — except one-directional tightening via `confirms`.
        const observations = options.observer ? await options.observer(plan, planLogs) : [];
        for (const expected of plan.confirms ?? []) {
          if (!observations.some((o) => o.protocol === plan.protocol && o.name === expected)) {
            warnings.push({
              code: "CONFIRMATION_MISSING",
              message: options.observer
                ? `the capability's declared receipt "${expected}" did not appear in simulation`
                : `plan declares confirmation "${expected}" but no observer is wired into the simulator`,
            });
          }
        }

        results.push({
          protocol: plan.protocol,
          method: plan.method,
          intent: plan.intent,
          planHash: plan.planHash,
          planHashValid,
          reverted,
          ...(revertReason === undefined ? {} : { revertReason }),
          effects,
          observations,
          warnings,
          gasPerTx,
        });

        if (halted) break;
      }

      return halted === undefined ? { results } : { results, halted };
    },
  };
}
