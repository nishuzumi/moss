---
"@themoss/protocol-pendle": minor
"@themoss/mcp-server": minor
"@themoss/simulator": minor
---

Add the Pendle protocol adapter and register it in the MCP server. It exposes a bidirectional PT `swap` capability with a nested ERC20 approval, plus `quote` and `markets` queries, over Monad markets discovered from the official Pendle API and verified on-chain. Receipts exhaustively parse the swap trace into a typed outcome. ABIs are vendored from `@pendle/core-v2` with deterministic provenance.

Add injectable simulator state overrides so live protocol gates can use deterministic read-only funding, with explicit documentation that successful synthetic-prestate simulations do not prove current account affordability. Add transaction-target-scoped revert-selector descriptions so protocol errors cannot be attributed to unrelated deployments.
