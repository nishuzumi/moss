/**
 * WMON — canonical wrapped MON on Monad mainnet. A SYSTEM protocol: the
 * INTERFACE is the generic WETH9 standard (compiled ABI from @themoss/erc),
 * but the ADDRESS is Monad instance data — which is exactly why the adapter
 * class lives in the system layer (ADR 0006: anything with a hardcoded
 * address lives in system or a protocol package).
 *
 * It doubles as the reference adapter — deliberately small and over-commented,
 * because new adapters are expected to start as a copy of this class (package
 * scaffolding is modeled by packages/protocols/_template). The authoring
 * contract:
 *
 *   1. `@Protocol` declares the contracts (ABI + address); matching `declare`
 *      fields receive ABI-typed Handles at construction.
 *   2. `@Capability` methods take DECODED params (already scaled to base
 *      units by their semantic types) and return `plan(steps, flows)` —
 *      unsigned transactions plus quantified expectations. Never sign, never
 *      send.
 *   3. `@Query` methods return plain JSON-safe data via `handle.read`.
 *   4. Verbs are user-perspective fund semantics: WMON's `deposit()` function
 *      is verb `wrap`, never "deposit" (that word belongs to lending).
 */
import {
  type Address,
  address,
  Capability,
  fixedAmount,
  type Handle,
  NATIVE,
  nativeAmount,
  Protocol,
  plan,
  Query,
} from "@themoss/core";
import { WETH9Abi } from "@themoss/erc";
import { knownTokenAddress } from "./tokens.js";

/** Canonical address comes from the system token data (single source of truth). */
export const WMON_ADDRESS: Address = knownTokenAddress("WMON");

@Protocol({
  name: "wmon",
  category: "token",
  description:
    "Canonical wrapped MON (WETH9-style). Wraps native MON 1:1 into the WMON ERC-20 and back.",
  contracts: {
    // The key "wmon" must match the `declare wmon` field below.
    wmon: { abi: WETH9Abi, addr: WMON_ADDRESS },
  },
})
export class WMON {
  // Type-only declaration; the @Protocol wrapper injects the Handle at
  // construction. The ABI type parameter is what makes calls fully typed.
  declare wmon: Handle<typeof WETH9Abi>;

  @Capability({
    intent: "Wrap {amount} native MON into WMON",
    verb: "wrap",
    params: { amount: nativeAmount },
    risk: ["fundOut"],
    tags: ["wrapper"],
  })
  async wrap({ amount }: { amount: bigint }) {
    // deposit() is payable and takes no calldata arguments: the amount
    // travels as the transaction's native value.
    const deposit = this.wmon.deposit([], { value: amount });
    return plan([deposit], {
      // Quantified expectations (ADR 0004): at most `amount` MON leaves,
      // at least `amount` WMON arrives (WETH9Abi wraps strictly 1:1).
      out: [{ token: NATIVE, amountMax: amount }],
      in: [{ token: WMON_ADDRESS, amountMin: amount }],
    });
  }

  @Capability({
    intent: "Unwrap {amount} WMON back into native MON",
    verb: "unwrap",
    params: { amount: fixedAmount(18, "WMON") },
    risk: ["fundOut"],
    tags: ["wrapper"],
  })
  async unwrap({ amount }: { amount: bigint }) {
    const withdraw = this.wmon.withdraw([amount]);
    return plan([withdraw], {
      out: [{ token: WMON_ADDRESS, amountMax: amount }],
      in: [{ token: NATIVE, amountMin: amount }],
    });
  }

  @Query({
    intent: "WMON balance of {owner}",
    params: { owner: address },
  })
  async balanceOf({ owner }: { owner: Address }) {
    const balance = await this.wmon.read.balanceOf([owner]);
    return { token: WMON_ADDRESS, symbol: "WMON", decimals: 18, balance: balance.toString() };
  }
}
