//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IERC1155 — Multi Token Standard
//
// ABI origin: vendored (ADR 0007)
//   Source:   OpenZeppelin Contracts v5.3.0 — IERC1155.sol
//   Package:  @openzeppelin/contracts@5.3.0
//   Spec:     https://eips.ethereum.org/EIPS/eip-1155
//   Derived via viem parseAbi from the canonical Solidity interface.
//   No hand-edits beyond the origin header. Diff against upstream:
//     node -e "require('@openzeppelin/contracts/token/ERC1155/IERC1155.sol')"
//   On-chain verification: deploy a reference ERC-1155 on Monad mainnet
//   and confirm TransferSingle(topics) + balanceOf match.
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { parseAbi } from "viem";

export const ierc1155Abi = parseAbi([
  // ── Events ──
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
  "event ApprovalForAll(address indexed account, address indexed operator, bool approved)",
  "event URI(string value, uint256 indexed id)",

  // ── Read ──
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory)",
  "function isApprovedForAll(address account, address operator) external view returns (bool)",
  "function uri(uint256 id) external view returns (string memory)",

  // ── Write ──
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external",
  "function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external",
  "function setApprovalForAll(address operator, bool approved) external",
] as const);
