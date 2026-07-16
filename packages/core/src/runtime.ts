import { createPublicClient, http, type PublicClient } from "viem";

const MONAD_MAINNET_CHAIN_ID = 143;

export interface MossRuntime {
  rpcUrl: string;
  client: PublicClient;
}

export async function createRuntime(opts: { rpcUrl: string }): Promise<MossRuntime> {
  const client = createPublicClient({ transport: http(opts.rpcUrl) });
  const chainId = await client.getChainId();
  if (chainId !== MONAD_MAINNET_CHAIN_ID) {
    throw new Error(
      `Moss requires Monad mainnet chain ID ${MONAD_MAINNET_CHAIN_ID}; RPC reported ${chainId}`,
    );
  }
  return { rpcUrl: opts.rpcUrl, client };
}
