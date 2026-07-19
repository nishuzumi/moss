// ABI origin: explorer — retrieved from aPriori's verified aprMON (aPriori Monad
// LST) contract on Monad mainnet, cross-checked against aPriori docs. Retrieval
// date: 2026-07-18.
//
// aPriori on Monad is a native-asset ERC4626 vault with an async withdrawal
// queue. aprMON (0x0c65a0bc65a5d819235b71f554d210d3f80e0852) is an EIP-7702
// delegated token whose logic lives in the implementation at
// 0x29fcb43b46531bca003ddc8fcb67ffe91900c762 (48k-byte vault). The deposit /
// requestRedeem / redeem entrypoints are confirmed present on-chain.
//
// deposit(uint256 assets, address receiver) is payable (assets = msg.value).
//   selector 0x6e553f65
// requestRedeem(uint256 shares, address receiver) nonpayable. selector 0x107703ab
// redeem(uint256[] requestIds, address receiver) nonpayable. selector 0x492e47d2
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
