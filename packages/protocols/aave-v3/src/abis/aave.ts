/**
 * Aave v3 ABI — Pool contract on Monad mainnet.
 *
 * ABI origin: standard Aave v3 interface. Pool proxy verified on-chain
 * 2026-07-15 against rpc.monad.xyz:
 *   - Pool proxy: 0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef (ERC-1967, 1.8KB)
 *   - Implementation: 0x9539531ea4f6563a66421a7449506152609985be (21KB)
 */

export const PoolAbi = [
  // ── Core lending ──
  {
    type: 'function',
    inputs: [
      { name: 'asset', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'onBehalfOf', internalType: 'address', type: 'address' },
      { name: 'referralCode', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'supply',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'asset', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
    ],
    name: 'withdraw',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'asset', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'interestRateMode', internalType: 'uint256', type: 'uint256' },
      { name: 'referralCode', internalType: 'uint16', type: 'uint16' },
      { name: 'onBehalfOf', internalType: 'address', type: 'address' },
    ],
    name: 'borrow',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'asset', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'interestRateMode', internalType: 'uint256', type: 'uint256' },
      { name: 'onBehalfOf', internalType: 'address', type: 'address' },
    ],
    name: 'repay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },

  // ── Queries ──
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
    ],
    name: 'getUserAccountData',
    outputs: [
      { name: 'totalCollateralBase', internalType: 'uint256', type: 'uint256' },
      { name: 'totalDebtBase', internalType: 'uint256', type: 'uint256' },
      { name: 'availableBorrowsBase', internalType: 'uint256', type: 'uint256' },
      { name: 'currentLiquidationThreshold', internalType: 'uint256', type: 'uint256' },
      { name: 'ltv', internalType: 'uint256', type: 'uint256' },
      { name: 'healthFactor', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'asset', internalType: 'address', type: 'address' },
    ],
    name: 'getReserveData',
    outputs: [
      { name: 'configuration', internalType: 'uint256', type: 'uint256' },
      { name: 'liquidityIndex', internalType: 'uint128', type: 'uint128' },
      { name: 'variableBorrowIndex', internalType: 'uint128', type: 'uint128' },
      { name: 'currentLiquidityRate', internalType: 'uint128', type: 'uint128' },
      { name: 'currentVariableBorrowRate', internalType: 'uint128', type: 'uint128' },
      { name: 'currentStableBorrowRate', internalType: 'uint128', type: 'uint128' },
      { name: 'lastUpdateTimestamp', internalType: 'uint40', type: 'uint40' },
      { name: 'id', internalType: 'uint16', type: 'uint16' },
      { name: 'aTokenAddress', internalType: 'address', type: 'address' },
      { name: 'stableDebtTokenAddress', internalType: 'address', type: 'address' },
      { name: 'variableDebtTokenAddress', internalType: 'address', type: 'address' },
      { name: 'interestRateStrategyAddress', internalType: 'address', type: 'address' },
      { name: 'accruedToTreasury', internalType: 'uint128', type: 'uint128' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getReservesList',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },

  // ── Events ──
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'reserve', internalType: 'address', type: 'address', indexed: true },
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'onBehalfOf', internalType: 'address', type: 'address', indexed: true },
      { name: 'amount', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'referralCode', internalType: 'uint16', type: 'uint16', indexed: false },
    ],
    name: 'Supply',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'reserve', internalType: 'address', type: 'address', indexed: true },
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      { name: 'amount', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Withdraw',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'reserve', internalType: 'address', type: 'address', indexed: true },
      { name: 'user', internalType: 'address', type: 'address', indexed: false },
      { name: 'onBehalfOf', internalType: 'address', type: 'address', indexed: true },
      { name: 'amount', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'interestRateMode', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'borrowRate', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'referralCode', internalType: 'uint16', type: 'uint16', indexed: false },
    ],
    name: 'Borrow',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'reserve', internalType: 'address', type: 'address', indexed: true },
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'repayer', internalType: 'address', type: 'address', indexed: true },
      { name: 'amount', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'useATokens', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'Repay',
  },
] as const;
