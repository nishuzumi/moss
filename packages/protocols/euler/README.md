# @themoss/protocol-euler

Euler v2 lending on Monad mainnet: `supply`, `withdraw`, `borrow` and `repay` over EVK vaults, plus the Euler Vault Connector authorization those operations need.

The package exports two Protocols because Euler is two contracts with two different jobs:

| Protocol | Capabilities | Queries |
| --- | --- | --- |
| `euler` | `supply`, `withdraw`, `borrow`, `repay` | `markets`, `vault`, `position` |
| `euler-vault-connector` | `enableCollateral`, `enableController` | `collaterals`, `controllers` |

`borrow` composes the connector's Capabilities as nested children, and only the ones the account still needs — so an agent asks for a borrow and gets whatever authorization sequence that borrow actually requires, with a Receipt for each step.

## Vaults are verified, not listed

EVK vaults are created per market — 127 of them existed on Monad at the time of writing — so they are not fixed constants. A vault address arrives as a Capability parameter and nothing about it is trusted until the chain says so. Every action re-establishes that:

1. the Euler `GenericFactory` created it (`isProxy`);
2. one of Euler's own on-chain perspectives has verified it (`governedPerspective` or `escrowedCollateralPerspective`);
3. it points back at the pinned Vault Connector (`vault.EVC()`).

A failure is explicit and there is no fallback that proceeds anyway. The underlying asset, its decimals, and the vault's symbol all come from the vault and the token themselves, never from a parameter.

The four addresses that *are* fixed are protocol-exclusive singletons — the Vault Connector, the EVault factory, and the two perspectives — cited to Euler's published deployment record and bytecode-checked by the live test:

```
addresses/143/CoreAddresses.json + PeripheryAddresses.json
github.com/euler-xyz/euler-interfaces @ df477f9d56a0c11542c26aabb63690219eecce6d
```

## Units, defaults, and limits

- Every `amount` is in the vault's **underlying asset** display units, resolved from that token's own `decimals()`. Supplying `"1.5"` to a USDC vault means 1.5 USDC.
- `supply` and `repay` emit an exact-amount ERC-20 approval as a nested Capability — never an unbounded allowance.
- `borrow` takes an optional `collateral` vault. With it, the vault's `LTVBorrow` must be non-zero and the collateral is enabled when it is not already. Without it, the account must already have collateral enabled, or the call is rejected rather than left to revert.
- `supply` rejects amounts above the vault's supply cap and `borrow` rejects amounts above available cash, because both are properties of the vault. **Account-level** state is deliberately not guarded: the shares `withdraw` redeems or the debt `repay` clears may be created by an earlier Capability in the same tree, so reading a balance at assembly time would reject valid compositions. Simulation is the check that matters.

## Known limitations (v1)

- **No sub-accounts.** The EVC addresses an owner's 256 sub-accounts by address prefix; v1 acts only on the account itself. Sub-account selection is a parameter-design question worth its own issue.
- **No `receiver` parameter.** Assets always return to the acting account; forwarding elsewhere is a `transfer` away and keeps intent alignment tight.
- **No batching through `EVC.batch`.** Each step is its own transaction with its own Receipt, which is what makes them independently verifiable. A batched variant would collapse them into one opaque call.
- **No liquidation, `pullDebt`, `EulerSwap`, or `EulerEarn`.**
- `borrow` and `enableController` should carry a `liquidation` **risk label**. That word is not in the closed risk set yet — it arrives with the perps vocabulary change — so the danger currently rides as a `tags` entry, which is what ADR 0003 designates tags for.

## ABI provenance (ADR 0007)

`vendored`. Euler publishes no ABI package on npm, so `abis-src/` holds verbatim copies of `EVault.json`, `EthereumVaultConnector.json`, `GenericFactory.json` and `BasePerspective.json` from a pinned `euler-interfaces` commit, with a per-file sha256 in `VENDOR.json`. `src/abis/euler.ts` is derived from those files by an offline, clockless generator, and `test/abis.test.ts` asserts the committed TS is byte-for-byte what the generator produces.

- `pnpm update:abis [commit]` — re-vendor from upstream. Follows the default branch's head with a 7-day **commit-age guard** (the git analogue of pnpm's `minimumReleaseAge`), walking back by commit time when head is too young.
- `pnpm gen:abis` — regenerate offline from what is already committed.
- `pnpm test:abi:online` — cross-check the vendored EVault and Vault Connector ABIs against Monadscan's explorer-verified deployments, and assert `GenericFactory.implementation()` still equals the recorded EVault implementation. That last one is the upgrade tripwire: Euler upgrades vaults by repointing the factory, so an upgrade turns the check red instead of being silently accepted. Requires `MONADSCAN_API_KEY`; a missing key fails rather than skips.

Vault proxies are not valid cross-check targets — Etherscan's `getabi` on a proxy returns the proxy's own surface — which is why the check targets the shared implementation.

## Verification

`pnpm test` runs the offline suite plus a live Monad-mainnet simulation; `pnpm test:offline` at the repo root skips the live half. Moss never signs or sends, so the live tests cost nothing and need no keys.

The end-to-end tests simulate two full flows against mainnet with zero Warnings:

```
wmon.wrap → erc20.approve → euler.supply → euler.withdraw
wmon.wrap → erc20.approve → euler.supply → enableCollateral → enableController → euler.borrow → erc20.approve → euler.repay
```

The second one is the whole point: eight chained transactions where the collateral being borrowed against is created by the same tree, every one of them producing an exhaustively parsed Receipt.
