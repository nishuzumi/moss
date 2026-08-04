---
"@themoss/protocol-morpho": minor
---

Add the Morpho vaults adapter for Monad mainnet: `supply` and `withdraw` Capabilities on MetaMorpho V1.1 vaults, `position` and `vaultInfo` Queries, factory-verified vault identity, and typed Receipt parsers that cover the vault, Morpho Blue, IRM and ERC-20 evidence a vault flow produces, each piece bound to the flow it belongs to. Share and asset movements are correlated by candidate set and require exactly one match each, so an ambiguous set fails closed instead of attributing the flow to the first matching Transfer. `vaultInfo` reports the deposit capacity against the account it was read for, because ERC-4626 scopes `maxDeposit` to a receiver.
