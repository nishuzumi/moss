import { type AddressValue, type Handle, type ParamsSpec, Protocol, Query } from "@themoss/core";
import { monadCardsAbi } from "./abis/monad-cards.js";

/**
 * Monad Cards' official Monad-mainnet deployment.
 * Source: https://github.com/monad-crypto/protocols/blob/main/mainnet/monad_cards.jsonc
 */
export const MONAD_CARDS_ADDRESS: AddressValue = "0x0000CA12D5c07085022eBC74867157449919Fd67";

const noParams = {} satisfies ParamsSpec;

@Protocol({
  name: "monad-cards",
  category: "nft",
  description: "Read the cumulative minted supply of the Monad Cards collectible.",
  contracts: {
    collection: { abi: monadCardsAbi, addr: MONAD_CARDS_ADDRESS },
  },
})
export class MonadCards {
  declare collection: Handle<typeof monadCardsAbi>;

  @Query({
    intent: "Read the total number of Monad Cards minted",
    params: noParams,
    tags: ["supply"],
  })
  async totalMinted() {
    const totalMinted = await this.collection.read.totalMinted();
    return { totalMinted: totalMinted.toString() };
  }
}
