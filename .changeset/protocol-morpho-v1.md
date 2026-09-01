---
"@themoss/protocol-morpho": minor
"@themoss/mcp-server": minor
---

Add the Morpho vaults adapter for Monad mainnet: `supply` and `withdraw` Capabilities on MetaMorpho V1.1 vaults, `position` and `vaultInfo` Queries, factory-verified vault identity, and typed Receipt parsers that cover the vault, Morpho Blue, IRM and ERC-20 evidence a vault flow produces, each piece bound to the flow it belongs to. Share and asset movements are correlated by candidate set and require exactly one match each, so an ambiguous set fails closed instead of attributing the flow to the first matching Transfer. Receipt Outcomes name no underlying token: a vault's asset is a permissionless parameter that a Receipt parser cannot authenticate, so the Outcome reports only what the vault's own ERC-4626 event says while `vaultInfo` and `position` report the asset from a live `asset()` read. `vaultInfo` reports the deposit capacity against the account it was read for, because ERC-4626 scopes `maxDeposit` to a receiver. The adapter ships in the default MCP composition, so `discover` and `load` reach it there.
