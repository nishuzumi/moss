import {
  type Address,
  address,
  Protocol,
  Query,
} from "@themoss/core";

import { ChainlinkAggregatorAbi } from "./abis/chainlink.js";


/**
 * Chainlink Price Feed Adapter
 *
 * Provides AI Agents with access to decentralized oracle price data.
 * This adapter supports reading latest token prices from Chainlink feeds.
 *
 * The adapter currently focuses on read-only oracle queries.
 */


// ETH/USD Chainlink feed address (Ethereum Mainnet)
// Verified from Chainlink public feed registry.
export const ETH_USD_FEED: Address =
  "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419";


@Protocol({
  name: "chainlink",
  category: "oracle",
  description:
    "Chainlink decentralized oracle price feed adapter for AI Agent queries.",
  contracts: {
    priceFeed: {
      abi: ChainlinkAggregatorAbi,
      addr: ETH_USD_FEED,
    },
  },
})
export class ChainlinkProtocol {

  declare priceFeed: any;


  @Query({
    intent: "Get latest ETH USD price from Chainlink oracle",
    params: {},
  })
  async latestPrice() {

    const price =
      await this.priceFeed.read.latestAnswer([]);

    const decimals =
      await this.priceFeed.read.decimals([]);

    return {
      price: price.toString(),
      decimals,
    };
  }
}