<!--
  Copy the content below into the GitHub PR description body when creating the PR.
  The section under "What & why" through the end is the PR body.
-->

## What & why

Closes #12.

Adds a FastLane shMONAD liquid staking adapter for Monad mainnet. shMONAD is a combined ERC-4626 vault + ERC-20 receipt token: users stake native MON and receive shMON (a reward-bearing token that grows in value relative to MON over time).

The adapter provides stake/unstake capabilities plus read-only queries, registered into the MCP server catalog.

## Type of change

- [x] New protocol adapter / capability / query
- [x] Core / MCP server change
- [ ] Docs / examples
- [ ] Bugfix

## Checklist

- [x] `pnpm lint && pnpm typecheck && pnpm build && pnpm test` passes locally
- [x] Includes a changeset (`pnpm changeset`) if user-facing

### For new capabilities (required)

- [x] `intent`, `params` (semantic types), and `risk` labels are all declared
- [x] The Plan declares `expects` (funds out / in, approvals) built from decoded params
- [x] Discoverable & loadable: shows up in `discover` and `load` output
- [x] A reproducible example or e2e test runs `discover → load → action → simulate` against Monad mainnet
- [x] Simulation produces no warnings for the happy path

## Architecture

The shMONAD contract is an **ERC-1967 proxy** at `0x1B68626d…` pointing to an implementation (`0x856A4019…`) that combines **ERC-4626 vault** and **ERC-20 receipt token** in one contract.

| Role | Address | Verified |
|------|---------|----------|
| shMON Proxy | `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c` | ✅ On-chain 2026-07-14 |
| Implementation | `0x856A4019228c265DEE336DF705277607c4A18e1B` | ✅ On-chain 2026-07-14 |

`asset()` returns the native MON sentinel (`0xEee…EEeE`), confirming this is a native-MON vault.

## Capabilities

| Method | Verb | Description |
|--------|------|-------------|
| `stake` | `stake` | Deposit native MON → mint shMON via ERC-4626 `deposit(assets, receiver)` |
| `unstake` | `unstake` | Burn shMON → redeem native MON via ERC-4626 `redeem(shares, receiver, owner)` |

## Queries

| Method | Description |
|--------|-------------|
| `balanceOf` | shMON balance for any address |
| `exchangeRate` | Current 1 shMON → MON conversion rate via `convertToAssets` |
| `totalStaked` | Total MON locked in FastLane via `totalAssets` |

## Evidence

### Build

```
pnpm -r build — passed
pnpm -r typecheck — passed
```

### Offline tests (5 passed)

```
 ✓ discovers stake and unstake capabilities
 ✓ loads the stake capability stub
 ✓ loads the unstake capability stub
 ✓ builds a stake plan
 ✓ builds an unstake plan
```

### Live mainnet e2e tests (4 passed, zero funds required)

The e2e suite simulates every plan against live Monad mainnet via `debug_traceCall` — no keys, no funds, no signatures required. The simulator pre-funds the test account so native-MON deposits succeed.

```
 ✓ totalStaked query reads TVL            →  real on-chain TVL (> 1 MON)
 ✓ exchangeRate query reads current rate  →  real conversion rate (> 0)
 ✓ stake plan simulates on mainnet        →  no revert, no CONFIRMATION_MISSING,
                                             @Event decodes "Staked 0.001 MON into shMONAD"
 ✓ unstake with zero balance reverts      →  clean reversion (account has 0 shMON)
```

The `stake` simulation produced **zero warnings** — the plan is safe to sign.

### Changeset

Valid linked minor release plan covering `@themoss/protocol-fastlane` and `@themoss/mcp-server`.
