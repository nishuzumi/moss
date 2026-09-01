import type { Address, Hex } from "@themoss/core";
import type { PublicClient } from "viem";

/** One frame of a callTracer result. Addresses arrive lowercase. */
export interface CallFrame {
  type: string;
  from: Address;
  to?: Address;
  value?: Hex;
  gas?: Hex;
  gasUsed?: Hex;
  input?: Hex;
  output?: Hex;
  error?: string;
  revertReason?: string;
  calls?: CallFrame[];
  logs?: TraceLog[];
}

export interface TraceLog {
  address: Address;
  topics: Hex[];
  data: Hex;
  /** Number of child calls completed before this log was emitted. */
  position?: number | Hex;
  /** Transaction-global log order supplied by Monad's callTracer. */
  index?: number | Hex;
}

export interface AccountDiff {
  balance?: Hex;
  nonce?: number;
  code?: Hex;
  storage?: Record<Hex, Hex>;
}

export interface PrestateDiff {
  pre: Record<Address, AccountDiff>;
  post: Record<Address, AccountDiff>;
}

export interface StateOverride {
  balance?: Hex;
  nonce?: Hex;
  code?: Hex;
  stateDiff?: Record<Hex, Hex>;
}

export type StateOverrides = Record<Address, StateOverride>;

export interface TraceCall {
  from: Address;
  to: Address;
  data: Hex;
  value: Hex;
}

/**
 * Providers reject calls that default to the block gas limit, so every
 * simulation request pins an explicit, modest gas budget (ADR 0002).
 * Overridable per simulator via SimulatorOptions.gasPerTx.
 */
export const DEFAULT_SIMULATION_GAS = 10_000_000n;

/**
 * Resolve the base block for one simulate() run. Every trace, diff, and gas
 * estimate in the run pins this block so evidence extraction and state
 * chaining share a single base state even when new blocks land mid-run
 * (ADR 0002). Monad's debug_traceCall accepts an explicit block number with
 * stateOverrides (verified live 2026-07-20).
 */
export async function resolveSimulationBlock(client: PublicClient): Promise<Hex> {
  return (await client.request({ method: "eth_blockNumber" })) as Hex;
}

export class SimulatorUnavailableError extends Error {
  constructor(rpcUrl: string) {
    super(
      `${rpcUrl} does not expose debug_traceCall, which Moss simulation requires. ` +
        `Use an endpoint with debug support — verified: https://rpc.monad.xyz, ` +
        `https://rpc-mainnet.monadinfra.com (see ADR 0002).`,
    );
    this.name = "SimulatorUnavailableError";
  }
}

function isMethodNotFound(err: unknown): boolean {
  const code = (err as { code?: number; cause?: { code?: number } })?.code;
  const causeCode = (err as { cause?: { code?: number } })?.cause?.code;
  return code === -32601 || causeCode === -32601;
}

async function traceCall<T>(
  client: PublicClient,
  rpcUrl: string,
  call: TraceCall,
  block: Hex,
  traceOpts: Record<string, unknown>,
  overrides: StateOverrides,
  gas: bigint,
): Promise<T> {
  const opts =
    Object.keys(overrides).length > 0 ? { ...traceOpts, stateOverrides: overrides } : traceOpts;
  try {
    return (await client.request({
      // biome-ignore lint/suspicious/noExplicitAny: non-standard namespace, untyped in viem
      method: "debug_traceCall" as any,
      // biome-ignore lint/suspicious/noExplicitAny: non-standard namespace, untyped in viem
      params: [{ ...call, gas: `0x${gas.toString(16)}` }, block, opts] as any,
    })) as T;
  } catch (err) {
    if (isMethodNotFound(err)) throw new SimulatorUnavailableError(rpcUrl);
    throw err;
  }
}

/** Call tree plus logs: the raw evidence used to extract ordered Changes. */
export function traceWithCalls(
  client: PublicClient,
  rpcUrl: string,
  call: TraceCall,
  block: Hex,
  overrides: StateOverrides,
  gas: bigint = DEFAULT_SIMULATION_GAS,
): Promise<CallFrame> {
  return traceCall<CallFrame>(
    client,
    rpcUrl,
    call,
    block,
    { tracer: "callTracer", tracerConfig: { withLog: true } },
    overrides,
    gas,
  );
}

/** State diff: how the next transaction's overrides get built. */
export function traceWithDiff(
  client: PublicClient,
  rpcUrl: string,
  call: TraceCall,
  block: Hex,
  overrides: StateOverrides,
  gas: bigint = DEFAULT_SIMULATION_GAS,
): Promise<PrestateDiff> {
  return traceCall<PrestateDiff>(
    client,
    rpcUrl,
    call,
    block,
    { tracer: "prestateTracer", tracerConfig: { diffMode: true } },
    overrides,
    gas,
  );
}

/**
 * Best-effort gas estimate. Monad's trace gasUsed reports the gas limit, not
 * consumption (ADR 0002), so estimates go through eth_estimateGas — passing
 * accumulated overrides as the (non-standard but widely accepted) third param.
 * Returns null when the endpoint rejects that.
 */
export async function estimateGasWithOverrides(
  client: PublicClient,
  call: TraceCall,
  block: Hex,
  overrides: StateOverrides,
): Promise<bigint | null> {
  try {
    const params: unknown[] = [call, block];
    if (Object.keys(overrides).length > 0) params.push(overrides);
    const result = (await client.request({
      // biome-ignore lint/suspicious/noExplicitAny: overrides param is non-standard
      method: "eth_estimateGas" as any,
      // biome-ignore lint/suspicious/noExplicitAny: overrides param is non-standard
      params: params as any,
    })) as Hex;
    return BigInt(result);
  } catch {
    return null;
  }
}
