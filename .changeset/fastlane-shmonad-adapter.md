---
'@themoss/protocol-fastlane': minor
---

feat(protocols): add FastLane shMONAD liquid staking adapter (Capability + Receipt framework)

New protocol adapter for FastLane shMONAD liquid staking on Monad, rebuilt for the PR #31 Capability + Receipt framework:

- `stake` — @Capability: deposit native MON → receive shMON (ERC-4626 vault)
- `unstake` — @Capability: redeem shMON → receive native MON (with accrued rewards)
- `stakeReceipt` / `unstakeReceipt` — @Receipt methods for post-simulation change parsing
- `balanceOf` — @Query: shMON balance
- `exchangeRate` — @Query: current shMON → MON conversion rate
- `totalStaked` — @Query: total MON locked in FastLane
- Each @Capability returns exactly one direct TransactionNode ([this.vault.deposit/redeem])
- Exhaustive ordered Change parsing via decodeEventLog for Deposit/Withdraw events
- Protocol class exported for direct Registry discovery (no manifest, no MCP server change)
