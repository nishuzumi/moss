---
'@themoss/protocol-aave-v3': minor
'@themoss/mcp-server': minor
---

feat(protocols): add Aave v3 lending adapter

New protocol adapter for Aave v3 lending on Monad:

- `supply` — deposit assets, receive aTokens (collateral)
- `withdraw` — burn aTokens, withdraw underlying assets
- `borrow` — borrow assets at variable rate
- `repay` — repay borrowed assets
- `userAccountData` — health factor, LTV, available borrows
- `reserveData` — aToken/debt token addresses, interest rates
- `@Event` observations for Supply/Withdraw/Borrow/Repay receipts
- Quantified expects (safety contract) for all capabilities
- 5 offline shape tests passing
