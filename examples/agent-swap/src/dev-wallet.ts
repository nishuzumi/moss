import { privateKeyToAccount } from "viem/accounts";

/**
 * anvil's dev account #0 — a PUBLICLY KNOWN key that every anvil user on
 * earth shares. It exists so this demo is zero-config; it holds value only
 * on your local fork. Never fund it anywhere real.
 */
const DEV_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

export const devAccount = privateKeyToAccount(DEV_PRIVATE_KEY);

/** The local monad-anvil fork every part of this example points at. */
export const FORK_RPC_URL = "http://127.0.0.1:8545";

export async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(FORK_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result as T;
}
