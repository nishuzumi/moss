---
"@themoss/erc": minor
---

feat(erc): add ERC-1155 multi-token Protocol

- **Capability**: `transfer` (safeTransferFrom single-token), `approve` (setApprovalForAll)
- **Query**: `balanceOf`, `isApprovedForAll`, `uri`
- **Receipt**: TransferSingle, TransferBatch, ApprovalForAll ordered Change parsing
- **ABI**: vendored from OpenZeppelin Contracts v5.3.0 IERC1155 via viem parseAbi
- **Tests**: 7 offline tests covering calldata encoding, receipt parsing, event ordering, error rejection

Closes #68
