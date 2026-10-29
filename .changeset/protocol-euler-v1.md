---
"@themoss/protocol-euler": minor
"@themoss/mcp-server": minor
---

First release of the Euler v2 lending adapter: `supply`, `withdraw`, `borrow` and `repay` over EVK vaults, with Euler Vault Connector authorization composed as nested Capabilities. Vaults are not fixed constants — each one is verified on-chain against the Euler factory, Euler's own vault perspectives, and the pinned Vault Connector before any transaction is assembled. `borrow` carries the `debt` and `liquidation` risk labels; `enableController` carries `liquidation`. The default MCP catalog includes the adapter.
