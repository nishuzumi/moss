// ABI origin: explorer — retrieved from the verified aprMON implementation on
// Monad mainnet, cross-checked against aPriori docs and on-chain selectors.
// Retrieval date: 2026-07-18.
//
// On-chain status as of retrieval:
// - proxy `0x0c65a0bc65a5d819235b71f554d210d3f80e0852` is a regular proxy
//   (eth_getCode returns 0x6080...; EIP-1967 implementation slot is 0x0)
// - implementation `0x29fcb43b46531bca003ddc8fcb67ffe91900c762` is the
//   48k-byte lpStaking vault
// - selectors confirmed present on-chain via eth_call:
//     deposit(uint256,address)        0x6e553f65
//     requestRedeem(uint256,address)  0x107703ab
//     redeem(uint256[],address)       0x492e47d2
//
// deposit(uint256 assets, address receiver) is payable (assets = msg.value).
// requestRedeem(uint256 shares, address receiver) nonpayable.
// redeem(uint256[] requestIds, address receiver) nonpayable.
import { parseAbi } from "viem";

export const APRMON_ADDRESS =
  "0x0c65a0bc65a5d819235b71f554d210d3f80e0852" as const;

export const AprMonAbi = parseAbi([
  "function deposit(uint256 assets, address receiver) payable returns (uint256 shares)",
  "function requestRedeem(uint256 shares, address receiver) returns (uint256 requestId)",
  "function redeem(uint256[] requestIds, address receiver) returns (uint256 assets)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event RequestRedeem(address indexed sender, address indexed owner, uint256 shares, uint256 requestId)",
  "event Redeem(address indexed sender, address indexed owner, uint256[] requestIds, uint256 assets)",
]);
