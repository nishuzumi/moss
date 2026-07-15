# @themoss/protocol-fastlane

FastLane shMONAD liquid staking adapter for Moss.

## Capabilities

| Method | Verb | Description |
|--------|------|-------------|
| `stake` | `stake` | Stake native MON → receive shMON (receipt token) |
| `unstake` | `unstake` | Redeem shMON → receive native MON (with accrued rewards) |

## Queries

| Method | Description |
|--------|-------------|
| `balanceOf` | shMON balance for any address |
| `exchangeRate` | Current 1 shMON → MON conversion rate |
| `totalStaked` | Total MON locked in FastLane |

## Addresses

| Contract | Address | Verified |
|----------|---------|----------|
| shMON Proxy (main entry) | `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c` | ✅ On-chain 2026-07-14 |
| shMON Implementation | `0x856A4019228c265DEE336DF705277607c4A18e1B` | ✅ On-chain 2026-07-14 |

The shMON contract is an **ERC-1967 proxy** pointing to an implementation that combines **ERC-4626 vault** and **ERC-20 receipt token** in one contract. `asset()` returns the native MON sentinel.
