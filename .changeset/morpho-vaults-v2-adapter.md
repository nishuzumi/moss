---
"@themoss/protocol-morpho": minor
"@themoss/mcp-server": patch
---

Add the Morpho Vaults V2 Protocol adapter for Monad: `vaults` discovery through the official Morpho GraphQL API with mandatory on-chain factory attestation and asset cross-checks (ADR 0012), on-chain `position` and `previewDeposit` Queries, `deposit` (nested ERC-20 approve + one direct transaction) and `withdraw` Capabilities pinned to the acting account, and exhaustive ordered Receipts that decode `Deposit` / `Withdraw` / `AccrueInterest` and delegate ERC-20 Changes. Registers the Protocol in the MCP composition root.
