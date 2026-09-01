// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./IERC20.sol";

/// @notice The canonical WETH9-style wrapped-native interface: deposit()
/// mints 1:1 for msg.value, withdraw(wad) burns and returns the native coin.
/// Mint/burn emit Deposit/Withdrawal — not Transfer. Source of truth for the
/// generated `iweth9Abi`; regenerate with `pnpm gen:abis`.
interface IWETH9 is IERC20 {
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    function deposit() external payable;
    function withdraw(uint256 wad) external;
}
