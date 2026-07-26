import * as erc from "@themoss/erc";
import * as apriori from "@themoss/protocol-apriori";
import * as kintsu from "@themoss/protocol-kintsu";
import * as kuru from "@themoss/protocol-kuru";
import * as monadCards from "@themoss/protocol-monad-cards";
import * as pancakeswap from "@themoss/protocol-pancakeswap";
import * as system from "@themoss/system";

/** Protocol modules selected by the default MCP CLI application. */
export const defaultProtocolModules = [
  system,
  erc,
  apriori,
  kintsu,
  kuru,
  monadCards,
  pancakeswap,
] as const;
