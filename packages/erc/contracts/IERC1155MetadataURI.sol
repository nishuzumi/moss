// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice The optional EIP-1155 metadata URI extension consumed by Moss. This
/// contract is the source of truth for its generated ABI in `src/abis/erc.ts`.
interface IERC1155MetadataURI {
    function uri(uint256 id) external view returns (string memory);
}
