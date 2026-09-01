---
"@themoss/core": minor
"@themoss/mcp-server": minor
---

Remove caller-supplied Receipt names from serialized Capability trees. Registry now resolves the Receipt parser from the registered Capability metadata for each `protocol + method`, and the MCP `simulate` input schema follows the same source of truth.
