import * as erc from "@themoss/erc";
import * as aave from "@themoss/protocol-aave";
import * as apriori from "@themoss/protocol-apriori";
import * as kuru from "@themoss/protocol-kuru";
import * as monadCards from "@themoss/protocol-monad-cards";
import * as nadfun from "@themoss/protocol-nadfun";
import * as pancakeswap from "@themoss/protocol-pancakeswap";
import * as system from "@themoss/system";

/** Protocol modules selected by the default MCP CLI application. */
export const defaultProtocolModules = [
  system,
  erc,
  aave,
  apriori,
  kuru,
  monadCards,
  nadfun,
  pancakeswap,
] as const;
