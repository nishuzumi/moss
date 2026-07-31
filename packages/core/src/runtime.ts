import { createPublicClient, http, type PublicClient } from "viem";

/** Monad mainnet. Moss v1 targets no other chain, so this is not configurable. */
export const MONAD_CHAIN_ID = 143;

/**
 * Monad's public mainnet endpoint. It answers `429` with JSON-RPC `-32011
 * request limit reached` after roughly thirty sequential `debug_traceCall`s,
 * which a full live test run exceeds, so CI points `MOSS_RPC_URL` at a private
 * endpoint instead.
 */
export const PUBLIC_RPC_URL = "https://rpc.monad.xyz";

/**
 * The endpoint callers get unless they pin their own: `MOSS_RPC_URL` when set,
 * otherwise the public one. Resolved here, once, so that no other module spells
 * an endpoint or reads the environment for one.
 */
export const DEFAULT_RPC_URL = process.env.MOSS_RPC_URL ?? PUBLIC_RPC_URL;

export interface MossRuntime {
  rpcUrl: string;
  client: PublicClient;
}

/**
 * Creates a Monad mainnet runtime and rejects an RPC reporting any other chain.
 *
 * An earlier revision kept chain identity out of core entirely and let
 * `@themoss/system` supply the Monad defaults, but that separation is gone: core
 * has verified chain 143 itself since the `chainId` parameter was removed, so
 * the matching endpoint default belongs beside it rather than one package away.
 */
export async function createRuntime(opts: { rpcUrl?: string } = {}): Promise<MossRuntime> {
  const rpcUrl = opts.rpcUrl ?? DEFAULT_RPC_URL;
  const client = createPublicClient({ transport: http(rpcUrl) });
  const chainId = await client.getChainId();
  if (chainId !== MONAD_CHAIN_ID) {
    throw new Error(
      `Moss requires Monad mainnet chain ID ${MONAD_CHAIN_ID}; RPC reported ${chainId}`,
    );
  }
  return { rpcUrl, client };
}
