/**
 * The OFFLINE half of the ABI pipeline: the source-of-truth table mapping
 * each PancakeSwap V3 contract to its generated module under src/abis/.
 *
 * scripts/update-abis.ts fetches these verified ABIs from the explorer;
 * test/abis.test.ts enforces that every committed module is byte-exact
 * renderAbiModule output for its entry here, and that the addresses match
 * the protocol's exported constants.
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
    // The classic V3 SwapRouter (ISwapRouter: deadline inside the params
    // struct), NOT SwapRouter02 — the verified source at this address names
    // `ISwapRouter.ExactInputSingleParams`.
    exportName: "swapRouter",
    file: "swap-router.ts",
    address: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
  },
  {
    exportName: "factory",
    file: "factory.ts",
    address: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
  },
];
