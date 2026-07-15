/**
 * FastLane shMONAD — combined ERC-20 receipt token + ERC-4626 vault.
 *
 * ABI origin: standard (EIP-4626 + ERC-20). The shMONAD contract is an
 * ERC-1967 proxy (0x1B68626…) with an implementation (0x856A4019…) that
 * implements both the ERC-4626 vault interface (deposit/redeem/asset) and
 * the ERC-20 receipt token interface (transfer/balanceOf/approve).
 *
 * Verified on-chain 2026-07-14 against rpc.monad.xyz: symbol() → "shMON",
 * decimals() → 18, name() → "ShMonad", asset() → NATIVE sentinel.
 */

/** ERC-4626 vault + ERC-20 token functions needed by the FastLane adapter. */
export const ShMonadAbi = [
  // ── ERC-4626 vault ──
  {
    type: 'function',
    inputs: [
      { name: 'assets', internalType: 'uint256', type: 'uint256' },
      { name: 'receiver', internalType: 'address', type: 'address' },
    ],
    name: 'deposit',
    outputs: [{ name: 'shares', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'shares', internalType: 'uint256', type: 'uint256' },
      { name: 'receiver', internalType: 'address', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'redeem',
    outputs: [{ name: 'assets', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'asset',
    outputs: [{ name: 'assetTokenAddress', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalAssets',
    outputs: [{ name: 'totalManagedAssets', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'shares', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'convertToAssets',
    outputs: [{ name: 'assets', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'assets', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'convertToShares',
    outputs: [{ name: 'shares', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'maxRedeem',
    outputs: [{ name: 'maxShares', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },

  // ── ERC-20 receipt token ──
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view',
  },

  // ── ERC-4626 events ──
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address', indexed: true },
      { name: 'owner', internalType: 'address', type: 'address', indexed: true },
      { name: 'assets', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'shares', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Deposit',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address', indexed: true },
      { name: 'receiver', internalType: 'address', type: 'address', indexed: true },
      { name: 'owner', internalType: 'address', type: 'address', indexed: true },
      { name: 'assets', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'shares', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Withdraw',
  },
] as const;
