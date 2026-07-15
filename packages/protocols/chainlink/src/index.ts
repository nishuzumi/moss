import { defineProtocolPackage } from "@themoss/core";

import {
  ChainlinkProtocol,
} from "./adapter.js";


export {
  ChainlinkProtocol,
  ETH_USD_FEED,
} from "./adapter.js";


export {
  ChainlinkAggregatorAbi,
} from "./abis/chainlink.js";


export const chainlinkManifest = defineProtocolPackage({
  name: "chainlink",
  protocols: [
    ChainlinkProtocol,
  ],
  tokens: [],
});