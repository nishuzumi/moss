---
"@themoss/core": minor
"@themoss/mcp-server": minor
---

Flatten Capability trees iteratively with one centralized fail-closed
complexity contract (`CAPABILITY_TREE_LIMITS`): depth, Capability count,
children per Capability, cumulative parameter depth/nodes/characters,
cumulative calldata bytes, canonical uint256 transaction values, and
byte-aligned calldata. Cycles and shared nodes fail with a typed
`CapabilityTreeError` carrying a stable code and tree path. MCP `simulate`
runs the Core validator before its recursive wire-shape decoder and before
invoking Simulator.
