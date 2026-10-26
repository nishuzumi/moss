/** ERC-1967 implementation storage slot (not a contract ABI). */
export const ERC1967_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;
/**
 * Reviewed OrderBook runtime at block 112692350 (2026-10-12).
 * See ../DEPLOYMENT.md for source/state evidence and degraded verification limits.
 * This permits interpreting a corroborated pause only; unknown code stays unavailable.
 */
export const REVIEWED_ORDERBOOK_CODE_HASH =
  "0x6576ced90ca537c9aa058ea4a54ab5edd802ab78b834168b21fcc6d9ac392c0c" as const;

/** Reviewed ERC-1967 delegate proxy runtime; see DEPLOYMENT.md. */
export const REVIEWED_ORDERBOOK_PROXY_HASH =
  "0xb3fcfca704395c210e969b841f35fff7483f99721de8d65b219615dd5e03f43b" as const;
