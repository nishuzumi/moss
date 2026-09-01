/**
 * ERC-1967 implementation slot: `keccak256("eip1967.proxy.implementation") - 1`.
 * Explorer `getabi` on a proxy returns the proxy's own ABI, so cross-checks
 * must resolve this slot and fetch the implementation's ABI instead.
 */
export const ERC1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

/**
 * Extract the implementation address from a raw ERC-1967 slot word as
 * returned by `eth_getStorageAt`. Fails closed: the word must be a 32-byte
 * hex quantity whose upper 12 bytes are zero (a cleanly stored address) —
 * anything else throws instead of yielding a garbage address.
 * Returns the lowercase address; checksum at the call site if needed.
 */
export function erc1967ImplementationAddress(slotWord: unknown): `0x${string}` {
  if (typeof slotWord !== "string" || !/^0x0{24}[0-9a-fA-F]{40}$/.test(slotWord)) {
    throw new Error(
      `not an ERC-1967 implementation slot word (expected a 32-byte hex quantity with zero upper bytes): ${String(slotWord)}`,
    );
  }
  return `0x${slotWord.slice(-40).toLowerCase()}`;
}
