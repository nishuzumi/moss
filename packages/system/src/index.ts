import { defineProtocolPackage } from "@themoss/core";
import { MONAD_TOKENS } from "./tokens.js";
import { WMON } from "./wmon.js";

export { DEFAULT_RPC_URL, MONAD_CHAIN_ID, monadRuntime } from "./runtime.js";
export { knownTokenAddress, MONAD_TOKENS } from "./tokens.js";
export { WMON, WMON_ADDRESS } from "./wmon.js";

/**
 * The Monad system package: the well-known token data plus the
 * address-bearing system protocols. Like every package it is opt-in —
 * `registry.use(systemManifest)` — nothing auto-registers (ADR 0006).
 */
export const systemManifest = defineProtocolPackage({
  name: "system",
  protocols: [WMON],
  tokens: MONAD_TOKENS,
});
