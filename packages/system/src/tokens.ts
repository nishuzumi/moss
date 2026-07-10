import type { Address, KnownToken } from "@themoss/core";
import { NATIVE, Token } from "@themoss/core";

/**
 * The Monad mainnet well-known token data — instances of the ERC-20 standard
 * (plus the native coin), registered into every registry that uses
 * `systemManifest`. Adding an entry requires on-chain verification (bytecode,
 * symbol, decimals) plus a canonical source, noted in the PR (ADR 0005).
 *
 * All entries verified on-chain against rpc.monad.xyz (2026-07-06/07):
 * symbol() and decimals() match; WMON also cross-checked with docs.monad.xyz,
 * USDC/AUSD with Kuru market params and issuer address conventions.
 */
export const MONAD_TOKENS: readonly KnownToken[] = [
  { symbol: "MON", name: "Monad", ref: NATIVE, decimals: 18 },
  {
    symbol: "WMON",
    name: "Wrapped MON",
    ref: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
    decimals: 18,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    ref: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    decimals: 6,
  },
  {
    symbol: "AUSD",
    name: "Agora USD",
    ref: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
    decimals: 6,
  },
];

/** The canonical address of a system ERC-20; throws when absent or native. */
export function knownTokenAddress(symbol: string): Address {
  const hit = MONAD_TOKENS.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
  if (!hit) {
    throw new Error(
      `"${symbol}" is not a system token (system: ${MONAD_TOKENS.map((t) => t.symbol).join(", ")})`,
    );
  }
  return Token.of(hit.ref, hit.decimals, hit.symbol).address;
}
