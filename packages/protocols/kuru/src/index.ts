import { defineProtocolPackage } from "@themoss/core";
import { Kuru } from "./kuru.js";

export { KuruOrderbookAbi, KuruRouterAbi } from "./abis/kuru.js";
export { AUSD_ADDRESS, KURU_ROUTER_ADDRESS, Kuru, USDC_ADDRESS } from "./kuru.js";

/**
 * The package manifest a registry consumes: `registry.use(kuruManifest)`.
 * Kuru introduces no tokens of its own — USDC/AUSD are system tokens; a
 * protocol that mints receipt/LP tokens would list them in `tokens`.
 */
export const kuruManifest = defineProtocolPackage({
  name: "kuru",
  protocols: [Kuru],
  tokens: [],
});
