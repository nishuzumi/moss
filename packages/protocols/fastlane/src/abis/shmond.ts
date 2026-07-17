// ABI origin: compiled (ADR 0007)
//   source: ERC-4626 standard vault interface, implemented by FastLane shMONAD
//   on Monad mainnet.
//
//   deposit() is declared payable because shMONAD accepts raw native MON
//   (not pre-wrapped WMON). The caller sends {value: assets} alongside the
//   deposit() call — the vault uses msg.value as the staked MON amount.
//
//   This is a minimal ABI covering only the functions and events this
//   Protocol adapter uses. Full contract source is not required because
//   ERC-4626 is a standardized, well-known interface.
//
//   On-chain verification: the adapter's E2E test checks deployed bytecode
//   and exercises the happy-path deposit + redeem flow.
import { parseAbi } from "viem";

/**
 * Minimal ERC-4626 vault ABI for FastLane shMONAD.
 *
 * Includes:
 *   - Vault functions: deposit, redeem, totalAssets, convertToAssets
 *   - ERC-20/shMON functions: balanceOf, totalSupply
 *   - Events: Deposit, Withdraw, Transfer
 */
export const ShmonadAbi = parseAbi([
  // ── ERC-4626 Vault ──────────────────────────────────────
  // "deposit": stake native MON → receive shMON shares.
  //   @param assets  MON amount in wei (must equal msg.value)
  //   @param receiver  Address that receives shMON shares
  //   payable: accepts native MON via msg.value
  "function deposit(uint256 assets, address receiver) payable returns (uint256 shares)",

  // "redeem": burn shMON shares → withdraw MON from the vault.
  //   @param shares  shMON amount in wei to burn
  //   @param receiver  Address that receives the MON
  //   @param owner  Address that owns the shares (must = msg.sender or approved)
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",

  // "totalAssets": total MON under management by the vault.
  "function totalAssets() view returns (uint256)",

  // "convertToAssets": how much MON a given number of shares is worth.
  "function convertToAssets(uint256 shares) view returns (uint256)",

  // "previewDeposit": simulate deposit return without state change.
  "function previewDeposit(uint256 assets) view returns (uint256)",

  // "previewRedeem": simulate redeem return without state change.
  "function previewRedeem(uint256 shares) view returns (uint256)",

  // ── ERC-20 (shMON token) ───────────────────────────────
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",

  // ── Events ───────────────────────────────────────────────
  // Deposit(sender, owner, assets, shares) — emitted on stake
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",

  // Withdraw(sender, receiver, owner, assets, shares) — emitted on unstake
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",

  // Transfer(from, to, value) — ERC-20 transfer / mint / burn
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
