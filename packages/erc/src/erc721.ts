/**
 * The generic ERC-721 protocol: transfer any NFT by collection address and
 * token id, plus ownership queries. Fills the `nft` category the same way
 * the generic erc20 protocol fills `transfer` for fungibles.
 *
 * Interface-layer resident by the ADR 0009 test: the collection address is
 * naturally a call-time parameter (which NFT to move is the user's input),
 * so this is a DYNAMIC-ADDRESS protocol — `contracts: {}`, injected
 * `runtime`, Handles built per call. Collections are NOT in the token table
 * (that catalog is fungible-only); agents pass the 0x address explicitly.
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
import { ierc721Abi } from "./abis/erc.js";

@Protocol({
  name: "erc721",
  category: "nft",
  description:
    "Generic ERC-721 (NFT) operations for any collection: transfer by token id, " +
    "ownership and balance queries. Takes the collection's 0x address.",
  contracts: {}, // dynamic: the collection address is a parameter
})
export class ERC721 {
  declare runtime: MossRuntime;

  #handle(collection: Address) {
    return createHandle(ierc721Abi, collection, this.runtime.client);
  }

  @Capability({
    intent: "Transfer {collection} #{tokenId} to {to}",
    verb: "transfer",
    params: {
      collection: address,
      tokenId: uint,
      to: address,
    },
    risk: ["fundOut"],
    tags: ["nft", "payment"],
  })
  async transfer(
    { collection, tokenId, to }: { collection: Address; tokenId: bigint; to: Address },
    ctx: ActionCtx,
  ) {
    // safeTransferFrom refuses receivers that can't handle ERC-721 — exactly
    // the mistake a bare transferFrom would let through. `from` must be the
    // caller in calldata, hence ctx.account (simulation enforces ownership).
    const step = this.#handle(collection).safeTransferFrom([ctx.account, to, tokenId]);
    return plan([step], {
      nfts: [{ collection, count: 1, direction: "out", items: [{ tokenId }] }],
    });
  }

  @Query({
    intent: "Owner of {collection} #{tokenId}",
    params: { collection: address, tokenId: uint },
  })
  async ownerOf({ collection, tokenId }: { collection: Address; tokenId: bigint }) {
    const owner = await this.#handle(collection).read.ownerOf([tokenId]);
    return { collection, tokenId: tokenId.toString(), owner };
  }

  @Query({
    intent: "NFT balance of {owner} in {collection}",
    params: { collection: address, owner: address },
    tags: ["balance"],
  })
  async balanceOf({ collection, owner }: { collection: Address; owner: Address }) {
    const balance = await this.#handle(collection).read.balanceOf([owner]);
    return { collection, owner, balance: balance.toString() };
  }
}
