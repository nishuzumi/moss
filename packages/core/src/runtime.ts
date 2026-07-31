import { createPublicClient, http, type PublicClient } from "viem";

/** Monad mainnet. Moss v1 targets no other chain, so this is not configurable. */
export const MONAD_CHAIN_ID = 143;

/**
 * Monad's public mainnet endpoint. It answers `429` with JSON-RPC `-32011 request
 * limit reached` after roughly thirty sequential `debug_traceCall`s, which a full
 * live test run exceeds, so CI points `MOSS_RPC_URL` at a private endpoint.
 *
 * Not re-exported from the package: `defaultRpcUrl()` is what callers want, and a
 * runtime already reports the endpoint it settled on.
 */
export const PUBLIC_RPC_URL = "https://rpc.monad.xyz";

/**
 * The endpoint callers get unless they pin their own: `MOSS_RPC_URL` when it names
 * one, otherwise the public one. The single place in the repo that reads the
 * environment for an endpoint.
 *
 * Read per call rather than captured at module load, so setting the variable after
 * importing this module still takes effect and a test needs no module-registry
 * reset to change it.
 *
 * Blank counts as unset: a workflow forwarding an endpoint from a secret sets the
 * variable to an empty string wherever that secret is unavailable, which is every
 * fork pull request. A non-blank value that is not a URL is a misconfiguration, and
 * failing here names the variable instead of surfacing as a transport error.
 */
export function defaultRpcUrl(): string {
  const configured = process.env.MOSS_RPC_URL?.trim();
  if (!configured) return PUBLIC_RPC_URL;
  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error(`MOSS_RPC_URL is not a URL: ${configured}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`MOSS_RPC_URL must be http or https, got ${parsed.protocol}`);
  }
  return configured;
}

export interface MossRuntime {
  rpcUrl: string;
  client: PublicClient;
}

/** Creates a Monad mainnet runtime and rejects an RPC reporting any other chain. */
export async function createRuntime(opts: { rpcUrl?: string } = {}): Promise<MossRuntime> {
  const rpcUrl = opts.rpcUrl ?? defaultRpcUrl();
  const client = createPublicClient({ transport: http(rpcUrl) });
  const chainId = await client.getChainId();
  if (chainId !== MONAD_CHAIN_ID) {
    throw new Error(
      `Moss requires Monad mainnet chain ID ${MONAD_CHAIN_ID}; RPC reported ${chainId}`,
    );
  }
  return { rpcUrl, client };
}
