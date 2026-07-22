# @themoss/protocol-apriori

Moss protocol adapter for **aPriori** MON liquid staking on Monad (aprMON).

## What it does

Three Capabilities mapping aPriori's native-asset ERC4626 vault with an async
withdrawal queue:

- `stake` — `deposit(uint256 assets, address receiver)` payable: stake MON, mint aprMON
- `unstake` — `requestRedeem(uint256 shares, address receiver)`: queue aprMON for withdrawal
- `claim` — `redeem(uint256[] requestIds, address receiver)`: claim MON after the unbonding epoch

## Contracts (Monad mainnet, verified on-chain 2026-07-18)

| Contract | Address | Status |
|----------|---------|--------|
| aprMON (stake entry) | `0x0c65a0bc65a5d819235b71f554d210d3f80e0852` | Proxy (non-EIP-7702); logic in impl `0x29fcb43b46531bca003ddc8fcb67ffe91900c762` |
| Entrypoints | `deposit` `0x6e553f65`, `requestRedeem` `0x107703ab`, `redeem` `0x492e47d2` | confirmed present on-chain |

## ABI provenance (ADR 0007)

The adapter vendors a minimal ABI in `src/abis/apriori.ts` covering only the
functions/events the Moss adapter needs. This ABI was originally retrieved from
the implementation address via the Monad mainnet explorer on 2026-07-18 and is
pinned by the online test `pnpm test:abi:online`:

- `packages/protocols/apriori/abis.json` records the proxy/implementation pair
  plus the explorer API base.
- `test-online/abi-explorer.test.ts` verifies that the recorded addresses have
  deployed bytecode and that the explorer still returns a verified ABI for the
  implementation.

The proxy itself is a regular mutable proxy (`eth_getCode` returns `0x6080...`,
EIP-1967 implementation slot is `0x0`), so the implementation address is pinned
explicitly in the manifest rather than read from `eth_getStorageAt`.

## Parameters

- `stake`: `amount` (MON, 18 decimals), `receiver` (address)
- `unstake`: `shares` (aprMON, 18 decimals), `receiver` (address)
- `claim`: `requestId` (uint256), `receiver` (address)

## Notes

- MON is native, so `deposit` is payable with `msg.value == assets`; no ERC20 approve needed.
- `unstake` only queues a withdrawal; `claim` completes it after the Monad unbonding epoch.
- Exchange rate (reward-bearing) is observable via the ERC4626 `convertToShares` / `convertToAssets` views on the same contract.
