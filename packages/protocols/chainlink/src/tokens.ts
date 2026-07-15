import type { KnownToken } from "@themoss/core";

/**
 * Tokens this protocol INTRODUCES (receipt tokens, LP tokens, LSTs) — they
 * register into the token table when the manifest is used, becoming
 * symbol-addressable for every agent. Leave empty if the protocol only
 * consumes existing tokens (like Kuru).
 *
 * Every entry is a security claim: verify symbol/decimals on-chain and note
 * a canonical source. Same-symbol collisions with other packages are
 * rejected at registration (ADR 0006).
 */
export const TOKENS: readonly KnownToken[] = [
  // {
  //   symbol: "exTOKEN",
  //   name: "Example Receipt Token",
  //   ref: "0x…", // verified on-chain YYYY-MM-DD: symbol()=…, decimals()=…
  //   decimals: 18,
  // },
];
