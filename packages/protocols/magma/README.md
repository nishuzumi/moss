# @themoss/protocol-magma

A read-only Moss Protocol package for querying Magma liquid-staking vault state on Monad mainnet.

## Supported Queries

- `totalAssets` — reads the total MON assets managed by Magma.
- `coreVault` — reads the configured Core Vault address.
- `gVault` — reads the configured gVault address.
- `rewardsFee` — reads the current rewards fee in protocol base units.
- `withdrawalFee` — reads the current withdrawal fee in protocol base units.

## Contract

- Network: Monad mainnet
- Magma address: `0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081`
- ABI origin: compiled from the pinned official `IMagma.sol` source
- ABI provenance: see `contracts/SOURCE.md`

## Regenerate the ABI

Run from the Moss repository root:

    pnpm --filter @themoss/protocol-magma gen:abis

## Verify the Package

Run from the Moss repository root:

    pnpm --filter @themoss/protocol-magma build
    pnpm --filter @themoss/protocol-magma typecheck
    pnpm --filter @themoss/protocol-magma test

## Current Limitations

This initial version is read-only. It does not implement staking, redemption, wallet signing, or transaction broadcasting.
