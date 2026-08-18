import * as erc from "@themoss/erc";
import * as aave from "@themoss/protocol-aave";
import * as apriori from "@themoss/protocol-apriori";
import * as clober from "@themoss/protocol-clober";
import * as kintsu from "@themoss/protocol-kintsu";
import * as kuru from "@themoss/protocol-kuru";
import * as monadCards from "@themoss/protocol-monad-cards";
import * as nadfun from "@themoss/protocol-nadfun";
import * as pancakeswap from "@themoss/protocol-pancakeswap";
import * as pendle from "@themoss/protocol-pendle";
import * as uniswap from "@themoss/protocol-uniswap";
import * as system from "@themoss/system";

/** Protocol modules the shipped MCP server registers by default. */
export const defaultProtocolModules = [
  system,
  erc,
  aave,
  apriori,
  clober,
  kintsu,
  kuru,
  monadCards,
  nadfun,
  pancakeswap,
  pendle,
  uniswap,
] as const;
