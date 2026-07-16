import { createRuntime, type MossRuntime } from "@themoss/core";

export const MONAD_CHAIN_ID = 143;
export const DEFAULT_RPC_URL = "https://rpc.monad.xyz";

/** Creates a Monad mainnet runtime and rejects RPC endpoints for any other chain. */
export function monadRuntime(opts: { rpcUrl?: string } = {}): Promise<MossRuntime> {
  return createRuntime({ rpcUrl: opts.rpcUrl ?? DEFAULT_RPC_URL });
}
