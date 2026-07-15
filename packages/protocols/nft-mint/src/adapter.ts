/**
 * PublicMint721 — a minimal ERC-721 public mint adapter for collections that
 * expose `mint(address to, string uri) payable` and `mintPrice()`.
 *
 * This is intentionally a dynamic-address adapter: the collection address is
 * caller-supplied after the user/project chooses a concrete Monad NFT
 * contract. Simulation remains the source of truth for whether mint is open,
 * price is correct, and the collection emits the standard ERC-721 Transfer
 * receipt. Current Moss observations bind to static contract keys, so this
 * adapter relies on quantified `expects` for the audit plane.
 */
import {
  type ActionCtx,
  type Address,
  address,
  Capability,
  createHandle,
  type MossRuntime,
  NATIVE,
  Protocol,
  plan,
  Query,
  type SemanticType,
} from "@themoss/core";
import { formatEther } from "viem";
import { PublicMint721Abi } from "./abis/public-mint-721.js";

const tokenUriParam: SemanticType<string> = {
  describe: 'A token metadata URI, for example "ipfs://..." or "https://...".',
  decode(value) {
    if (typeof value !== "string") throw new Error(`expected a string, got ${typeof value}`);
    if (value.length === 0) throw new Error("must not be empty");
    return value;
  },
};

@Protocol({
  name: "public-mint-721",
  category: "nft",
  description:
    "Mint one ERC-721 NFT from a collection exposing mint(address to, string uri) payable.",
  contracts: {},
})
export class PublicMint721 {
  declare runtime: MossRuntime;

  #collection(collection: Address) {
    return createHandle(PublicMint721Abi, collection, this.runtime.client);
  }

  @Capability({
    intent: "Mint one NFT from {collection} with metadata {tokenUri}",
    verb: "mint",
    params: {
      collection: address,
      tokenUri: tokenUriParam,
    },
    risk: ["fundOut"],
    tags: ["erc721", "public-mint"],
  })
  async mint({ collection, tokenUri }: { collection: Address; tokenUri: string }, ctx: ActionCtx) {
    const nft = this.#collection(collection);
    const price = await nft.read.mintPrice();
    const step = nft.mint([ctx.account, tokenUri], { value: price });
    return plan([step], {
      out: [{ token: NATIVE, amountMax: price }],
      nfts: [{ collection, count: 1, direction: "in" }],
    });
  }

  @Query({
    intent: "Mint price for {collection}",
    params: { collection: address },
    tags: ["erc721", "public-mint", "price"],
  })
  async mintPrice({ collection }: { collection: Address }) {
    const price = await this.#collection(collection).read.mintPrice();
    return {
      collection,
      priceWei: price.toString(),
      priceMon: formatEther(price),
    };
  }
}
