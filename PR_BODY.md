## What & why

Rebuild of the FastLane shMONAD liquid staking adapter against the PR #31 Capability + Receipt framework.

The original PR (submitted before #31) used the removed Plan/expects, @Event, manifest, and MCP-registration architecture. This rebased version follows the new self-describing @Protocol pattern.

shMONAD is a combined ERC-4626 vault + ERC-20 receipt token on Monad: users stake native MON and receive shMON (a reward-bearing token that grows in value relative to MON over time).

## What changed

- **Rebased** onto current main (PR #31 refactored core)
- **Deleted** `tokens.ts` — token-catalog no longer exists
- **Rewrote** `adapter.ts` → `fastlane.ts` — new architecture:
  - `@Capability` decorator with `receipt` field (names a `@Receipt` method)
  - Capabilities return `[this.vault.deposit(...)]` — direct TransactionNode array, no `plan()`
  - `@Receipt` methods parse ordered `Change[]` (Deposit/Withdraw events decoded via viem)
  - Zod-based params (`PositiveDecimalString` for amounts, `Address` for addresses)
  - Pure `@Receipt` (no Runtime/Handle access) conforming to `verifyReceiptCoverage`
- **Rewrote** `index.ts` — exports only the `FastLane` Protocol class for `registry.use(FastLane)`
- **Rewrote** tests — discover → load → action → flattenCapabilityTree → parseReceipt pattern
- **No MCP server changes** — protocols self-discover via class export

## Type of change

- [x] New protocol adapter / capability / query
- [ ] Core / MCP server change
- [ ] Docs / examples
- [ ] Bugfix

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm build && pnpm test` passes locally (blocked by erc/system still importing removed APIs — expected transitional state)
- [x] Includes a changeset (`pnpm changeset`) if user-facing

### For new capabilities (required)

- [x] `intent`, `params` (Zod semantic types), and `risk` labels are all declared
- [x] Each @Capability returns exactly one direct TransactionNode
- [x] Each @Capability names a @Receipt method for exhaustive ordered Change parsing
- [x] Protocol class exported for direct Registry discovery
- [x] Discoverable & loadable: shows up in `discover` and `load` output

## Architecture

The shMONAD contract is an **ERC-1967 proxy** at `0x1B68626d…` pointing to an implementation (`0x856A4019…`) that combines **ERC-4626 vault** and **ERC-20 receipt token** in one contract.

| Role | Address | Verified |
|------|---------|----------|
| shMON Proxy | `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c` | ✅ On-chain 2026-07-14 |
| Implementation | `0x856A4019228c265DEE336DF705277607c4A18e1B` | ✅ On-chain 2026-07-14 |

`asset()` returns the native MON sentinel (`0xEee…EEeE`), confirming this is a native-MON vault.

## Capabilities

| Method | Verb | Receipt | Description |
|--------|------|---------|-------------|
| `stake` | `stake` | `stakeReceipt` | Deposit native MON → mint shMON via ERC-4626 `deposit(assets, receiver)` |
| `unstake` | `unstake` | `unstakeReceipt` | Burn shMON → redeem native MON via ERC-4626 `redeem(shares, receiver, owner)` |

## Queries

| Method | Description |
|--------|-------------|
| `balanceOf` | shMON balance for any address |
| `exchangeRate` | Current 1 shMON → MON conversion rate via `convertToAssets` |
| `totalStaked` | Total MON locked in FastLane via `totalAssets` |

## Receipt parsing

Both `stakeReceipt` and `unstakeReceipt` decode the ERC-4626 `Deposit`/`Withdraw` events via `viem.decodeEventLog`, preserving the original Change object identities to satisfy `verifyReceiptCoverage`:

- **stakeReceipt**: Decodes `assets` (MON deposited) and `shares` (shMON minted) from `Deposit` event
- **unstakeReceipt**: Decodes `assets` (MON received) and `shares` (shMON burned) from `Withdraw` event

## Files changed

```
packages/protocols/fastlane/
├── src/
│   ├── abis/fastlane.ts    (unchanged)
│   ├── fastlane.ts         (new — replaces adapter.ts)
│   └── index.ts            (rewritten — exports Protocol class only)
├── test/
│   └── fastlane.test.ts    (new — replaces adapter.test.ts)
└── tokens.ts               (deleted — no token-catalog in new framework)
.changeset/fastlane-shmonad-adapter.md  (updated)
```

## Changeset

Valid linked minor release plan covering `@themoss/protocol-fastlane` only (no MCP server change).
