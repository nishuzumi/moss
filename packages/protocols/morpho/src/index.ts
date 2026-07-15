import { defineProtocolPackage } from "@themoss/core";
import { Morpho } from "./morpho.js";
import { TOKENS } from "./tokens.js";

export { MetaMorphoV1_1Abi } from "./abis/metamorpho-v1.1.js";
export { AUSD_ADDRESS, MORPHO_AUSD_VAULT_ADDRESS, Morpho } from "./morpho.js";
export { TOKENS } from "./tokens.js";

export const morphoManifest = defineProtocolPackage({
  name: "morpho",
  protocols: [Morpho],
  tokens: TOKENS,
});
