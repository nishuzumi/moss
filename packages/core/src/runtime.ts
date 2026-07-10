import { createPublicClient, http, type PublicClient } from "viem";

export interface MossRuntime {
  chainId: number;
  rpcUrl: string;
  client: PublicClient;
}

/**
 * Chain identity is explicit — core ships no defaults, no chain data
 * (ADR 0006). The Monad defaults live in @themoss/system's monadRuntime().
 */
export function createRuntime(opts: { rpcUrl: string; chainId: number }): MossRuntime {
  return {
    chainId: opts.chainId,
    rpcUrl: opts.rpcUrl,
    client: createPublicClient({ transport: http(opts.rpcUrl) }),
  };
}
