---
"@themoss/core": minor
"@themoss/simulator": minor
"@themoss/erc": minor
"@themoss/mcp-server": minor
---

Add the address-free generic ERC-1155 interface protocol with compiled ABI,
single-id transfer and balance query support. Extend simulation effects and
reconciliation for `TransferSingle`/`TransferBatch`, preserving exact token ids
and per-id uint256 unit caps as decimal strings and rejecting undeclared ids or
uncapped quantities. Reconcile minimum NFT inflow counts and known incoming ids.
