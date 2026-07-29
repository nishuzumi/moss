import { type Handle, type InferParams, type ParamsSpec, Protocol, Query } from "@themoss/core";
import { z } from "zod/v4";
import { PythAbi } from "./abis/pyth.js";
import {
  PYTH_FEED_NAMES,
  PYTH_FEEDS,
  PYTH_PRICE_FEED_ADDRESS,
  type PythFeedId,
  type PythFeedName,
} from "./feeds.js";

export const DEFAULT_PYTH_MAX_AGE_SECONDS = 3_600;
export const MAX_PYTH_MAX_AGE_SECONDS = 86_400;

const PythFeed = z
  .enum(PYTH_FEED_NAMES)
  .describe("A Pyth feed name from Monad's official 60-feed allowlist.");

const MaxAgeSeconds = z
  .number()
  .int()
  .min(1)
  .max(MAX_PYTH_MAX_AGE_SECONDS)
  .default(DEFAULT_PYTH_MAX_AGE_SECONDS)
  .describe("An integer freshness limit in seconds from 1 through 86400; defaults to 3600.");

const priceParams = {
  feed: {
    type: PythFeed,
    description: "Official Monad Pyth feed to read, such as MON_USD, BTC_USD, or ETH_USD.",
  },
  maxAgeSeconds: {
    type: MaxAgeSeconds,
    description:
      "Reject the on-chain value when its publish time is older than this caller-selected limit.",
  },
} satisfies ParamsSpec;

type InferredPriceParams = InferParams<typeof priceParams>;

export interface PythPriceParams {
  feed: PythFeedName;
  maxAgeSeconds?: number;
}

export interface PythPrice {
  feed: PythFeedName;
  feedId: PythFeedId;
  price: string;
  confidence: string;
  exponent: number;
  publishTime: string;
}

@Protocol({
  name: "pyth",
  category: "oracle",
  description:
    "Read freshness-checked Pyth prices from the official Monad mainnet PriceFeed contract.",
  contracts: {
    priceFeed: {
      abi: PythAbi,
      addr: PYTH_PRICE_FEED_ADDRESS,
    },
  },
  labels: {
    PriceFeed: PYTH_PRICE_FEED_ADDRESS,
  },
})
export class Pyth {
  declare priceFeed: Handle<typeof PythAbi>;

  price(params: PythPriceParams): Promise<PythPrice>;
  @Query({
    intent: "Read a freshness-checked Pyth price on Monad mainnet",
    params: priceParams,
    tags: ["price", "feed", "freshness"],
  })
  async price(params: InferredPriceParams): Promise<PythPrice> {
    const feedId = PYTH_FEEDS[params.feed];
    const value = await this.priceFeed.read.getPriceNoOlderThan([
      feedId,
      BigInt(params.maxAgeSeconds),
    ]);

    return {
      feed: params.feed,
      feedId,
      price: value.price.toString(),
      confidence: value.conf.toString(),
      exponent: value.expo,
      publishTime: value.publishTime.toString(),
    };
  }
}
