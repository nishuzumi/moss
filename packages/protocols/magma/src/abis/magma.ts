import { parseAbi } from "viem";

// Origin: explorer - Verified contract at 0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081 (Magma Staking Vault on Monad Mainnet)
export const MagmaAbi = parseAbi([
  // ERC-4626 标准接口
  "function asset() external view returns (address)",
  "function totalAssets() external view returns (uint256)",
  "function convertToShares(uint256 assets) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function maxDeposit(address receiver) external view returns (uint256)",
  "function previewDeposit(uint256 assets) external view returns (uint256)",
  "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
  "function maxMint(address receiver) external view returns (uint256)",
  "function previewMint(uint256 shares) external view returns (uint256)",
  "function mint(uint256 shares, address receiver) external returns (uint256 assets)",
  "function maxWithdraw(address owner) external view returns (uint256)",
  "function previewWithdraw(uint256 assets) external view returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)",
  "function maxRedeem(address owner) external view returns (uint256)",
  "function previewRedeem(uint256 shares) external view returns (uint256 assets)",
  "function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)",
  // ERC-20 标准接口
  "function balanceOf(address owner) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  // Magma 特有接口 (depositMON 及 requestRedeem)
  "function depositMON(address receiver, uint256 referralId) external payable returns (uint256 shares)",
  "function requestRedeem(uint256 shares, address controller, address owner) external returns (uint256 requestId)",
  // 链上事件定义
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
  "event RedeemRequest(address indexed controller, address indexed owner, uint256 indexed requestId, uint256 shares)"
]);
