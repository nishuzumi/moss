// ABI origin: explorer — retrieved from the Monad mainnet block explorer
// verified-contract page for ShMonad proxy at 0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c.
// The FastLane official deployment table (use-shmonad/references/deployments-and-rpc.md)
// confirms this proxy address. Retrieved 2026-07-18.
//
// The ABI is a focused subset covering the ERC-4626 deposit, redeem, and
// associated view functions. Agent operations, policies, validators, and
// administration selectors are excluded from this Protocol package.
import { parseAbi } from "viem";

export const ShMonadAbi = parseAbi([
  // ──── ERC-4626-ish vault (native MON) ────
  "function deposit(uint256 assets, address receiver) payable returns (uint256 shares)",
  "function mint(uint256 shares, address receiver) payable returns (uint256 assets)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",

  // ──── Previews & conversions ────
  "function previewDeposit(uint256 assets) view returns (uint256 shares)",
  "function previewRedeem(uint256 shares) view returns (uint256 assets)",
  "function convertToAssets(uint256 shares) view returns (uint256 assets)",
  "function convertToShares(uint256 assets) view returns (uint256 shares)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",

  // ──── ERC-20 metadata ────
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",

  // ──── Events ────
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
