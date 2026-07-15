/**
 * The generic ERC-1155 protocol: transfer one token id from any collection
 * and query an account's balance for an id. Like ERC721, the collection is a
 * call-time parameter, so the interface layer remains address-free.
 */
import {
  type ActionCtx,
  type Address,
  address,
  Capability,
  createHandle,
  type MossRuntime,
  Protocol,
  plan,
  Query,
  uint,
} from "@themoss/core";
import { ierc1155Abi } from "./abis/erc.js";

@Protocol({
  name: "erc1155",
  category: "nft",
  description:
    "Generic ERC-1155 multi-token operations for any collection: transfer an amount by token id " +
    "and query an account's balance. Takes the collection's 0x address.",
  contracts: {},
})
export class ERC1155 {
  declare runtime: MossRuntime;

  #handle(collection: Address) {
    return createHandle(ierc1155Abi, collection, this.runtime.client);
  }

  @Capability({
    intent: "Transfer {amount} of {collection} #{tokenId} to {to}",
    verb: "transfer",
    params: {
      collection: address,
      tokenId: uint,
      amount: uint,
      to: address,
    },
    risk: ["fundOut"],
    tags: ["nft", "multi-token", "payment"],
  })
  // Every call declares its exact canonical receipt, including zero-value and
  // self-transfers. Only positive transfers to another account are asset
  // outflows; the simulator keeps those two audit concepts separate.
  async transfer(
    {
      collection,
      tokenId,
      amount,
      to,
    }: { collection: Address; tokenId: bigint; amount: bigint; to: Address },
    ctx: ActionCtx,
  ) {
    const step = this.#handle(collection).safeTransferFrom([
      ctx.account,
      to,
      tokenId,
      amount,
      "0x",
    ]);
    const movesAsset = amount > 0n && to.toLowerCase() !== ctx.account.toLowerCase();
    return plan([step], {
      nfts: movesAsset
        ? [
            {
              collection,
              count: 1,
              direction: "out",
              items: [{ tokenId, amountMax: amount }],
            },
          ]
        : [],
      nftTransfers: [
        {
          kind: "erc1155-single",
          collection,
          operator: ctx.account,
          from: ctx.account,
          to,
          tokenId,
          amount,
        },
      ],
    });
  }

  @Query({
    intent: "Balance of {collection} #{tokenId} held by {owner}",
    params: { collection: address, tokenId: uint, owner: address },
    tags: ["balance", "nft", "multi-token"],
  })
  async balanceOf({
    collection,
    tokenId,
    owner,
  }: {
    collection: Address;
    tokenId: bigint;
    owner: Address;
  }) {
    const balance = await this.#handle(collection).read.balanceOf([owner, tokenId]);
    return { collection, tokenId: tokenId.toString(), owner, balance: balance.toString() };
  }
}
