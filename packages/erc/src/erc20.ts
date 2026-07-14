/**
 * The generic ERC-20 protocol: transfers, balances, allowances for ANY token
 * — well-known symbols or explicit addresses. USDC needs no adapter of its
 * own; it is served here, as is every token in the table.
 *
 * This is also the reference for DYNAMIC-ADDRESS protocols: there is no fixed
 * contract to declare (`contracts: {}`), so the class declares `runtime` and
 * builds Handles per call with createHandle. Native MON is first-class: a
 * transfer of "MON" is a plain value transaction.
 */
import {
  type Address,
  address,
  Capability,
  createHandle,
  defineProtocolPackage,
  type MossRuntime,
  NATIVE,
  Protocol,
  plan,
  Query,
  type TokenRef,
  type TxStep,
  token,
  tokenAmount,
} from "@themoss/core";
import { ierc20Abi } from "./abis/erc.js";
import { ERC721 } from "./erc721.js";
import { ERC1155 } from "./erc1155.js";

@Protocol({
  name: "erc20",
  category: "token",
  description:
    "Generic ERC-20 operations for any token (and native MON): transfer, balance, allowance. " +
    "Accepts well-known symbols or explicit token addresses.",
  contracts: {}, // dynamic: the token address is a parameter
})
export class ERC20 {
  declare runtime: MossRuntime;

  #handle(tokenAddress: Address) {
    return createHandle(ierc20Abi, tokenAddress, this.runtime.client);
  }

  @Capability({
    intent: "Transfer {amount} {token} to {to}",
    verb: "transfer",
    params: {
      token: token,
      to: address,
      amount: tokenAmount("token"),
    },
    risk: ["fundOut"],
    tags: ["payment"],
  })
  async transfer({ token: ref, to, amount }: { token: TokenRef; to: Address; amount: bigint }) {
    // The riskiest primitive there is — funds to an arbitrary recipient —
    // which is exactly why the expects bound matters: reconciliation verifies
    // nothing beyond `amount` of `ref` leaves the account.
    const step: TxStep =
      ref === NATIVE ? { to, data: "0x", value: amount } : this.#handle(ref).transfer([to, amount]);
    return plan([step], {
      out: [{ token: ref, amountMax: amount }],
    });
  }

  @Query({
    intent: "Balance of {token} held by {owner}",
    params: { token: token, owner: address },
    tags: ["balance"],
  })
  async balanceOf({ token: ref, owner }: { token: TokenRef; owner: Address }) {
    if (ref === NATIVE) {
      const wei = await this.runtime.client.getBalance({ address: owner });
      return { token: NATIVE, symbol: "MON", decimals: 18, balance: wei.toString() };
    }
    const handle = this.#handle(ref);
    const [balance, decimals, symbol] = await Promise.all([
      handle.read.balanceOf([owner]),
      handle.read.decimals().catch(() => 18),
      handle.read.symbol().catch(() => "?"),
    ]);
    return { token: ref, symbol, decimals: Number(decimals), balance: balance.toString() };
  }

  @Query({
    intent: "Allowance of {token} granted by {owner} to {spender}",
    params: { token: token, owner: address, spender: address },
    tags: ["approval"],
  })
  async allowance({
    token: ref,
    owner,
    spender,
  }: {
    token: TokenRef;
    owner: Address;
    spender: Address;
  }) {
    if (ref === NATIVE) throw new Error("native MON has no allowances");
    const allowance = await this.#handle(ref).read.allowance([owner, spender]);
    return { token: ref, owner, spender, allowance: allowance.toString() };
  }
}

/** The ERC standards package: introduces no tokens of its own. */
export const ercManifest = defineProtocolPackage({
  name: "erc",
  protocols: [ERC20, ERC721, ERC1155],
  tokens: [],
});
