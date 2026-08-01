import * as erc from "@themoss/erc";
import * as aave from "@themoss/protocol-aave";
import * as kuru from "@themoss/protocol-kuru";
import * as monadCards from "@themoss/protocol-monad-cards";
import * as pancakeswap from "@themoss/protocol-pancakeswap";
import * as system from "@themoss/system";

/** Protocol modules selected by the default MCP CLI application. */
export const defaultProtocolModules = [system, erc, aave, kuru, monadCards, pancakeswap] as const;
