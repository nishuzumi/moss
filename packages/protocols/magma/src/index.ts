import { defineProtocolPackage } from "@themoss/core";
import { Magma } from "./adapter.js";
import { TOKENS } from "./tokens.js";

export { MAGMA_VAULT_ADDRESS, WMON_ADDRESS, Magma } from "./adapter.js";
export { TOKENS } from "./tokens.js";

export const magmaManifest = defineProtocolPackage({
  name: "magma",
  protocols: [Magma],
  tokens: TOKENS,
});
