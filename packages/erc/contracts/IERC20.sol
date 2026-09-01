// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice The ERC-20 interface Moss consumes: EIP-20 plus the optional
/// metadata extension. This file is the source of truth for the generated
/// `src/abis/erc20.ts` — regenerate with `pnpm gen:abis` (requires foundry).
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    // EIP-20 optional metadata extension
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}
