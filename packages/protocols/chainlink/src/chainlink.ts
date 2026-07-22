import {
  type ActionCtx,
  Address,
  type AddressValue,
  createHandle,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  Protocol,
  Query,
} from "@themoss/core";
import { formatUnits } from "viem";
import { aggregatorV3Abi } from "./abis/aggregator-v3.js";

const latestRoundParams = {
  feed: {
    type: Address,
    description: "Chainlink Data Feed proxy address whose latest round should be read.",
  },
} satisfies ParamsSpec;

/**
 * Read-only Chainlink Data Feed adapter.
 *
 * The caller supplies a Chainlink Feed proxy address. This Protocol does not
 * build transactions, move assets, sign messages, or send transactions.
 */
@Protocol({
  name: "chainlink",
  category: "token",
  description: "Read Chainlink Data Feed prices and metadata from caller-supplied proxy addresses.",
  contracts: {},
})
export class Chainlink {
  declare runtime: MossRuntime;

  #feed(feed: AddressValue, account: AddressValue) {
    return createHandle(aggregatorV3Abi, feed, this.runtime.client, account);
  }

  @Query({
    intent: "Read the latest Chainlink Data Feed round",
    params: latestRoundParams,
    tags: ["oracle", "price-feed"],
  })
  async latestRound(params: InferParams<typeof latestRoundParams>, ctx: ActionCtx) {
    const feed = this.#feed(params.feed, ctx.account);

    const [description, decimals, version, roundData] = await Promise.all([
      feed.read.description(),
      feed.read.decimals(),
      feed.read.version(),
      feed.read.latestRoundData(),
    ]);

    const [roundId, answer, startedAt, updatedAt, answeredInRound] = roundData;

    return {
      feed: params.feed,
      description,
      decimals: Number(decimals),
      version: version.toString(),
      roundId: roundId.toString(),
      answer: answer.toString(),
      formattedAnswer: formatUnits(answer, Number(decimals)),
      startedAt: startedAt.toString(),
      updatedAt: updatedAt.toString(),
      answeredInRound: answeredInRound.toString(),
    };
  }
}
