---
"@themoss/mcp-server": minor
---

Add the Euler v2 lending adapter to the default MCP protocol catalog: `supply`, `withdraw`, `borrow` and `repay` over EVK vaults, with Euler Vault Connector authorization composed as nested Capabilities. Vaults are not fixed constants — each one is verified on-chain against the Euler factory, Euler's own vault perspectives, and the pinned Vault Connector before any transaction is assembled. `borrow` carries the `debt` and `liquidation` risk labels; `enableController` carries `liquidation`.
