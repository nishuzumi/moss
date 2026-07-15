import { defineProtocolPackage } from "@themoss/core";
import { AaveV3 } from "./adapter.js";
import { AAVE_TOKENS } from "./tokens.js";

export { AaveV3 } from "./adapter.js";
export { POOL_ADDRESS } from "./adapter.js";

export const aaveV3Manifest = defineProtocolPackage({
  name: "aave-v3",
  protocols: [AaveV3],
  tokens: AAVE_TOKENS,
});
