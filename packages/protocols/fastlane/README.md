# FastLane shMONAD adapter

This package provides a minimal Moss adapter for the FastLane shMONAD vault on Monad mainnet.

## Supported actions

- Stake native MON into the vault with the `stake` capability.
- Read the vault share balance with `balanceOf`.
- Read the share-to-asset conversion rate with `exchangeRate`.
- Read the total amount of assets staked in the vault with `totalStaked`.

## Current limitation

Unstake is not implemented in this round. The adapter intentionally exposes only the features confirmed in the repo workstream so far.

## Verified contract facts

- Proxy address: `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c`
- ERC-4626-style vault semantics: deposit, balanceOf, convertToAssets, totalAssets
- Deposit flow uses `deposit(assets, receiver)` with native MON supplied as `msg.value`

Run checks from the repository root so workspace dependencies are built in order:

```bash
pnpm build
pnpm typecheck
pnpm lint
MOSS_SKIP_E2E=1 pnpm test
```
