---
"@themoss/protocol-pendle": minor
"@themoss/core": minor
"@themoss/mcp-server": minor
"@themoss/simulator": minor
---

Add the Pendle protocol adapter and register it in the MCP server. It exposes a bidirectional PT `swap` capability with a nested ERC20 approval, plus `quote` and `markets` queries, over Monad markets discovered from the official Pendle API and verified on-chain. Receipts exhaustively parse the swap trace into a typed outcome. ABIs are vendored from `@pendle/core-v2` with deterministic provenance.

Add injectable simulator state overrides so live protocol gates can use deterministic read-only funding. `SimulateOutcome.syntheticState` reports the addresses whose prestate the caller supplied, so a consumer can tell a run proving behavior under supplied state from one proving it against live state. Decode custom reverts from each Capability Protocol's declared target ABI, with optional Protocol-owned human explanations keyed by ABI error name and raw-reason fallback for unknown evidence.
