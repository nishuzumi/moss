import * as erc from "@themoss/erc";
import * as apriori from "@themoss/protocol-apriori";
import * as kuru from "@themoss/protocol-kuru";
import * as monadCards from "@themoss/protocol-monad-cards";
import * as pancakeswap from "@themoss/protocol-pancakeswap";
import * as pendle from "@themoss/protocol-pendle";
import * as system from "@themoss/system";

/** Protocol modules the shipped MCP server registers by default. */
export const defaultProtocolModules = [
  system,
  erc,
  apriori,
  kuru,
  monadCards,
  pancakeswap,
  pendle,
] as const;

/** Protocol-specific execution errors decoded by the default MCP simulator. */
export const defaultRevertSelectors = {
  [pendle.PENDLE_ROUTER_ADDRESS]: {
    [pendle.MARKET_ZERO_NET_LP_FEE_SELECTOR]: pendle.MARKET_ZERO_NET_LP_FEE_MESSAGE,
  },
} as const;
