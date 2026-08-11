# @themoss/protocol-beets

Moss protocol adapter for [Beets](https://beets.fi) — the Balancer V3 DEX on Monad mainnet.

## Surface

- `swap` — single-pool `swapSingleTokenExactIn` / `swapSingleTokenExactOut` through the canonical Balancer v3 Router, with native MON wrap/unwrap (`wethIsEth`) on both sides.
- `addLiquidity` — single-token `addLiquidityUnbalanced`.
- `removeLiquidity` — single-token `removeLiquiditySingleTokenExactIn`.
- Queries: `quote`, `quoteAddLiquidity`, `quoteRemoveLiquidity`, and `pool` (tokens, raw balances, static swap fee).
- Receipts: Vault `Swap`, `LiquidityAdded`, and `LiquidityRemoved` events, normalising native MON round-trips.

## Addresses

Canonical Balancer v3 deployment on Monad mainnet, pinned from
[balancer/balancer-deployments](https://github.com/balancer/balancer-deployments) at the commit
recorded in `abis-src/VENDOR.json`:

| Contract       | Address                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------- |
| Router         | `0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c`                                              |
| Vault          | `0xbA1333333333a1BA1108E8412f11850A5C319bA9` |
| VaultExtension | `0x0E8B07657D719B86e06bF0806D6729e3D528C9A9` |
| VaultExplorer  | `0x043A2daD730d585C44FB79D2614F295D2d625412` |

Pool view reads go through the read-only VaultExplorer: the VaultExtension rejects direct calls
(`NotVaultDelegateCall`) and is only reachable through the Vault's delegatecall paths.

## ABIs

Deterministic pipeline, see the package scripts:

- `pnpm gen:abis` — regenerate `src/abis/beets.ts` offline from `abis-src/`.
- `pnpm update:abis [commit|latest]` — re-vendor upstream artifacts (verbatim, SHA-256 recorded in
  `abis-src/VENDOR.json`) and regenerate.
- `pnpm test:abi:online` — on-chain derivation checks (bytecode, contracts pinned, VaultExplorer
  reads) against Monad mainnet.

## Checks

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Live Monad-mainnet behavior is covered by the `Beets mainnet` e2e suite (skipped when
`MOSS_SKIP_E2E` is set).