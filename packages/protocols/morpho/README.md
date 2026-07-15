# @themoss/protocol-morpho

Partial Morpho adapter for Monad mainnet. This package currently exposes one
read-only query for the curated Grove x Steakhouse High Yield AUSD MetaMorpho
V1.1 vault at `0x32841A8511D5c2c5b253f45668780B99139e476D`.

## Supported query

- `position({ owner })` returns the owner's vault shares and their current
  AUSD asset equivalent from ERC-4626 `convertToAssets`.
- `shares` uses 18 decimals; `assets` is returned in 6-decimal AUSD base units.

Vault strategy, fees, and the share-to-asset conversion can change on-chain;
the query is a point-in-time read. Supply, withdraw, APY, additional vaults,
and generic ERC-4626 addresses remain follow-up work in issue #9/#13.
