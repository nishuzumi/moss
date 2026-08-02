/**
 * The source-of-truth table for the complete explorer ABI generated under
 * src/abis/. The address is Monad Cards' official Monad-mainnet deployment:
 * https://github.com/monad-crypto/protocols/blob/main/mainnet/monad_cards.jsonc
 */
export interface AbiSource {
  exportName: string;
  file: string;
  address: `0x${string}`;
}

export const SOURCES: readonly AbiSource[] = [
  {
    exportName: "monadCards",
    file: "monad-cards.ts",
    address: "0x0000CA12D5c07085022eBC74867157449919Fd67",
  },
];
