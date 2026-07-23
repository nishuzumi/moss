---
"@themoss/protocol-pendle": minor
"@themoss/mcp-server": minor
---

Add the Pendle protocol adapter and register it in the MCP server. It exposes a bidirectional PT `swap` capability with a nested ERC20 approval, plus `quote` and `markets` queries, over Monad markets discovered from the official Pendle API and verified on-chain. Receipts exhaustively parse the swap trace into a typed outcome. ABIs are vendored from `@pendle/core-v2` with deterministic provenance.
