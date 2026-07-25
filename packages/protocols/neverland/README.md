# @themoss/protocol-neverland

Moss protocol adapter for **Neverland** — an Aave V3-based lending market deployed on
Monad mainnet. It exposes Neverland's supply / borrow / repay / withdraw flow as
uniform, agent-callable Moss Capabilities and Queries, with exhaustive typed Receipts
that capture on-chain price and reward observations.

## Deployment (Monad mainnet, chainId 143)

| Contract | Address |
| --- | --- |
| Pool (ERC-1967 proxy) | `0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585` |
| Wrapped-token Gateway | `0x800409dBd7157813BB76501c30e04596Cc478f25` |
| Rewards controller | `0x57ea245cCbfab074babb9d01d1f0c60525e52cec` |

The Pool retains the upstream Aave V3 `IPool` surface; stable-rate borrowing
intentionally reverts in this release, so the adapter only offers variable-rate debt.

## Capabilities

- **supply** — supply an ERC-20 reserve asset to earn interest.
- **supplyNative** — wrap native MON and supply it through the wrapped-token gateway.
- **withdraw** — withdraw a supplied ERC-20 reserve asset.
- **withdrawNative** — withdraw supplied WMON and unwrap it into native MON.
- **borrow** — borrow a reserve asset at the variable rate.
- **repay** — repay variable-rate debt.

## Queries

- **reserves** — list Neverland reserves with their tokens and current rates.
- **reserveData** — read a single reserve's tokens and rates.
- **accountData** — read an account's collateral, debt, and health factor.
- **accountReserve** — read an account's supplied and borrowed amounts on one reserve.

## Receipts

Every operation Receipt returns a `NeverlandOutcome` recording the operation, asset,
amount, and account, plus:

- `priceObservations` — `PriceObserved` events emitted by Neverland's `PriceEmitter` on
  each nToken / debt-token action (asset, price, oracle, action, ok flag, user, timestamp).
- `rewardObservations` — `Accrued` events emitted by the rewards controller during the
  operation (asset, reward token, user, indexes, amount accrued).

Receipt parsing is pure: it consumes only the ordered, immutable `Change[]` trace and
returns evidence preserving exact change identity, length, and order. Reserve-token
`Mint` / `Burn` accounting events and the Pool's `ReserveDataUpdated` / collateral-toggle
events are accepted as auxiliary evidence.

## ABI provenance (ADR 0007)

All ABIs are vendored verbatim under `abis-src/` and regenerated deterministically offline:

- `NeverlandPoolAbi` — `@aave/core-v3@1.19.3` `IPool` artifact.
- `WrappedTokenGatewayAbi` — `@aave/periphery-v3@2.5.2` `IWrappedTokenGatewayV3` artifact.
- `PriceObservedAbi` — `PriceEmitter.sol` from `Neverland-Money/neverland-lending` (pinned commit).
- `NeverlandRewardsAbi` — `Accrued` event from Aave's `IRewardsDistributor`.

`VENDOR.json` records each source, version/commit, and sha256. Regenerate with
`pnpm gen:abis`; re-vendor upstream with `pnpm update:abis`. The Pool and gateway ABIs
are cross-checked against the explorer-verified contracts by `pnpm test:abi:online`.

## Development

Run checks from the repository root so workspace dependencies build in order:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

`test/neverland.test.ts` covers tree validation, Receipt coverage, and failure cases
offline, plus a live Monad-mainnet happy-path simulation of a native supply with zero
warnings. ABI byte-for-byte derivation is asserted in `test/abis.test.ts`.
