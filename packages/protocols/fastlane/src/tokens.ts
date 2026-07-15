import type { KnownToken } from "@themoss/core";
import { SHMON_PROXY_ADDRESS } from "./adapter.js";

/**
 * FastLane shMONAD tokens. shMON is the liquid staking receipt token.
 *
 * Verified on-chain 2026-07-14 against rpc.monad.xyz:
 *   - symbol(): "shMON"
 *   - name(): "ShMonad"
 *   - decimals(): 18
 *   - totalSupply(): non-zero (active contract)
 *   - ERC-1967 proxy at 0x1B68626D..., implementation at 0x856A4019...
 */
export const FASTLANE_TOKENS: readonly KnownToken[] = [
  {
    symbol: "shMON",
    name: "ShMonad (Liquid Staking)",
    ref: SHMON_PROXY_ADDRESS,
    decimals: 18,
  },
];
