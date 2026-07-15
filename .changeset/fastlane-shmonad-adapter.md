---
'@themoss/protocol-fastlane': minor
'@themoss/mcp-server': minor
---

feat(protocols): add FastLane shMONAD liquid staking adapter

New protocol adapter for FastLane shMONAD liquid staking on Monad:

- `stake` — deposit native MON → receive shMON (ERC-4626 vault)
- `unstake` — redeem shMON → receive native MON (with accrued rewards)
- `balanceOf` — query shMON balance
- `exchangeRate` — current shMON → MON conversion rate
- `totalStaked` — total MON locked in FastLane
- `@Event` observations for Deposit/Withdraw receipts
- Quantified expects (safety contract) for all capabilities
- 5 offline shape tests + 4 live mainnet e2e tests (zero funds needed)
