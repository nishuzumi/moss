import type { Address, TokenSource, TxStep } from "@themoss/core";
import { Token } from "@themoss/core";
import type { PublicClient } from "viem";
import { encodeFunctionData } from "viem";
import { ierc20Abi } from "./abis/erc.js";

/**
 * ERC-20 approve, as a Plan step. Lives in the standards layer because
 * approving IS an ERC-20 operation — core owns the `approval` tag mechanics
 * (plan() auto-declares the expectation, ADR 0004), this owns the encoding.
 */
export function approveStep(token: Address, spender: Address, amount: bigint): TxStep {
  return {
    to: token,
    data: encodeFunctionData({
      abi: ierc20Abi,
      functionName: "approve",
      args: [spender, amount],
    }),
    value: 0n,
    approval: { token, spender, amount },
  };
}

/**
 * On-chain ERC-20 metadata reader (decimals/symbol), cached per address.
 * Wire it into a Registry as the token-table fallback for addresses outside
 * the table: `new Registry(runtime, { tokenFallback: erc20MetadataSource(client) })`.
 * Symbols never reach this — the table rejects unknown symbols loudly.
 */
export function erc20MetadataSource(client: PublicClient): TokenSource {
  const cache = new Map<string, Promise<Token>>();
  return (ref) => {
    const key = ref.toLowerCase();
    let hit = cache.get(key);
    if (!hit) {
      hit = (async () => {
        const address = ref as Address;
        const [decimals, symbol] = await Promise.all([
          client.readContract({ address, abi: ierc20Abi, functionName: "decimals" }),
          client.readContract({ address, abi: ierc20Abi, functionName: "symbol" }).catch(() => "?"),
        ]);
        return Token.of(address, Number(decimals), symbol);
      })();
      cache.set(key, hit);
    }
    return hit;
  };
}
