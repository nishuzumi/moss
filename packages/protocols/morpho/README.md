# @themoss/protocol-morpho

Read-only adapter for the Grove x Steakhouse High Yield AUSD MetaMorpho V1.1
vault at `0x32841A8511D5c2c5b253f45668780B99139e476D` on Monad mainnet.

- `position({ owner })` returns `shares` (18 decimals) and their current
  ERC-4626 `assets` equivalent (6-decimal AUSD), both as base-unit strings.

Vault strategy, fees, and conversion can change on-chain. Supply, withdraw,
APY, and other vaults remain follow-up work in issue #9.
