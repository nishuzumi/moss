// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice The ERC-165 standard interface consumed by Moss.
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
