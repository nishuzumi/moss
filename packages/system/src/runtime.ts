import { createRuntime, type MossRuntime } from "@themoss/core";

/** Monad mainnet. */
export const MONAD_CHAIN_ID = 143;
/** Default endpoint: full debug_traceCall + state override support (ADR 0002). */
export const DEFAULT_RPC_URL = "https://rpc.monad.xyz";

/**
 * A runtime with the Monad defaults filled in — core's createRuntime takes
 * chain identity explicitly and ships no defaults (ADR 0006).
 */
export function monadRuntime(opts: { rpcUrl?: string; chainId?: number } = {}): MossRuntime {
  return createRuntime({
    rpcUrl: opts.rpcUrl ?? DEFAULT_RPC_URL,
    chainId: opts.chainId ?? MONAD_CHAIN_ID,
  });
}
