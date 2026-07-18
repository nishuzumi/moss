# @themoss/protocol-morpho

Moss protocol adapter for [Morpho Vaults V2](https://docs.morpho.org/) on Monad
mainnet: deposit into and withdraw from curated ERC-4626 yield vaults.

## What it does

- `vaults` (Query) — lists curated (`listed: true`) Morpho V2 vaults on Monad
  via the official keyless GraphQL API (`https://api.morpho.org/graphql`).
  API rows are **candidates only** (ADR 0012): every vault must pass the fixed
  factory's on-chain `isVaultV2` attestation, and its underlying asset address,
  symbol, decimals, and `totalAssets` are read from chain state. `name`,
  `symbol`, `netApy`, `netApyExcludingRewards`, and `totalAssetsUsd` are
  advisory API display data and never become transaction inputs.
- `position` (Query) — on-chain only: `balanceOf` + `convertToAssets`.
- `previewDeposit` (Query) — on-chain `previewDeposit` for a display-unit
  amount.
- `deposit` (Capability, verb `supply`) — ERC-20 `approve` nested Capability +
  one direct `deposit(assets, onBehalf)` transaction. `onBehalf` is pinned to
  the acting account.
- `withdraw` (Capability, verb `withdraw`) — one direct
  `withdraw(assets, receiver, onBehalf)` transaction with both `receiver` and
  `onBehalf` pinned to the acting account; no approval is needed.

Receipts decode the vault's `Deposit` / `Withdraw` events, keep
`AccrueInterest` as an informational leaf, and delegate every ERC-20 `Transfer`
/ `Approval` Change to the injected `erc20` Protocol so ordered coverage stays
exhaustive (ADR 0011).

## Fixed address provenance

`MORPHO_VAULT_V2_FACTORY_ADDRESS = 0x8B2F922162FBb60A6a072cC784A2E4168fB0bb0c`
comes from the vendored `@morpho-org/morpho-ts` SDK
(`addresses[143].vaultV2Factory`; version and tarball sha256 in
`abis-src/VENDOR.json`) and is cross-checked against `api.morpho.org`, which
reports the same `factory.address` for every listed Monad vault. The live test
verifies deployed bytecode; every vault interaction re-verifies `isVaultV2`
on-chain. Vault addresses themselves are dynamic chain state and never become
constants.

## ABI provenance

`src/abis/morpho.ts` is generated (ADR 0007, vendored origin) from the
committed verbatim upstream module `abis-src/abis.js.txt`
(`@morpho-org/morpho-ts` `lib/esm/abis.js`). Regenerate offline with
`pnpm gen:abis`; re-vendor from npm (dist-tags.latest with a 7-day release-age
guard) with `pnpm update:abis`. `test/abis.test.ts` enforces byte-for-byte
derivation.

## Units

- `amount` parameters are display units of the vault's underlying asset
  (e.g. `"1.5"` USDC); decimals are read from the asset contract on-chain.
- Query outputs return base-unit strings (`shares`, `assets`, `totalAssets`)
  plus display-formatted fields where meaningful. Share amounts stay in base
  units; VaultV2 share decimals mirror the underlying asset's decimals plus a
  virtual-share offset — consult the vault contract before displaying them.

## Limitations

- Exact-assets withdraw only (`withdraw`); a max-style `redeem` Capability is
  future work.
- VaultV2's `maxDeposit` / `maxMint` / `maxWithdraw` / `maxRedeem` always
  return 0 by design and are never used.
- Vaults with a configured `liquidityAdapter` may route deposits/withdrawals
  through allocation adapters and emit `Allocate` / `Deallocate` plus adapter
  events. The v1 Receipts fail loudly on such Changes (simulation surfaces a
  Warning instead of unverifiable evidence). The discovery Query surfaces each
  vault's `liquidityAdapter` so callers can prefer idle-liquidity vaults.
