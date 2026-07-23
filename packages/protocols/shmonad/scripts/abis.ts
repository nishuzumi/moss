/**
 * The OFFLINE half of the ABI pipeline: the source-of-truth table mapping the
 * shMONAD contract to its generated module under src/abis/.
 *
 * shMONAD is a TransparentUpgradeableProxy (ERC-1967). Explorer `getabi` on the
 * proxy returns the proxy's own ABI, so the staking surface is fetched from the
 * verified *implementation* address recorded here, while the adapter binds it to
 * the proxy at SHMONAD_ADDRESS.
 *
 * scripts/update-abis.ts fetches this verified ABI from the explorer;
 * test/abis.test.ts enforces that the committed module is byte-exact
 * renderAbiModule output for this entry, and that the address equals the
 * protocol's exported SHMONAD_IMPLEMENTATION_ADDRESS. The live e2e additionally
 * pins that constant to the proxy's ERC-1967 implementation slot, so a proxy
 * upgrade turns the suite red instead of silently shipping a stale ABI.
 */
export interface AbiSource {
  /** TypeScript identifier prefix: the module exports `<exportName>Abi`. */
  exportName: string;
  /** Generated module filename under src/abis/. */
  file: string;
  /** Verified Monad mainnet address the ABI is fetched from. */
  address: `0x${string}`;
}

export const SOURCES: readonly AbiSource[] = [
  {
    // The ShMonad implementation behind the SHMONAD_ADDRESS proxy. Fetching the
    // proxy address would yield the proxy's own ABI, not the ERC-4626 staking
    // surface the adapter calls.
    exportName: "ShMonad",
    file: "shmonad.ts",
    address: "0x856A4019228c265DEE336DF705277607c4A18e1B",
  },
];
