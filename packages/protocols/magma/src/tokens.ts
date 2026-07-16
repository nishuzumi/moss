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
  {
    symbol: "gMON",
    name: "Magma Staked MON",
    ref: "0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081", // verified on-chain 2026-07-16: symbol()="gMON", decimals()=18
    decimals: 18,
  },
];
