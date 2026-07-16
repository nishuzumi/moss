/**
 * Uniswap v4 ABI for the Universal Router and V4Quoter on Monad.
 *
 * ABI origin: standard (Uniswap v4 interfaces).
 * Universal Router: 0x0d97dc33264bfc1c226207428a79b26757fb9dc3
 * V4Quoter: 0xa222dd357a9076d1091ed6aa2e16c9742dd26891
 * PoolManager: 0x188d586ddcf52439676ca21a244753fa19f9ea8e
 *
 * Verified on-chain 2026-07-14 against rpc.monad.xyz: bytecode exists at all three addresses.
 */

/** Universal Router — the entry point for executing swap commands. */
export const UniversalRouterAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'commands', internalType: 'bytes', type: 'bytes' },
      { name: 'inputs', internalType: 'bytes[]', type: 'bytes[]' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

/**
 * PoolKey struct for Uniswap v4.
 * Tightly packed: currency0 (address), currency1 (address),
 * fee (uint24), tickSpacing (int24), hooks (address).
 */
export const PoolKeyAbi = [
  {
    type: 'tuple',
    components: [
      { name: 'currency0', internalType: 'address', type: 'address' },
      { name: 'currency1', internalType: 'address', type: 'address' },
      { name: 'fee', internalType: 'uint24', type: 'uint24' },
      { name: 'tickSpacing', internalType: 'int24', type: 'int24' },
      { name: 'hooks', internalType: 'address', type: 'address' },
    ],
  },
];

/** V4Quoter — used for estimating swap output amounts. */
export const V4QuoterAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'poolKey',
        internalType: 'struct PoolKey',
        type: 'tuple',
        components: [
          { name: 'currency0', internalType: 'address', type: 'address' },
          { name: 'currency1', internalType: 'address', type: 'address' },
          { name: 'fee', internalType: 'uint24', type: 'uint24' },
          { name: 'tickSpacing', internalType: 'int24', type: 'int24' },
          { name: 'hooks', internalType: 'address', type: 'address' },
        ],
      },
      { name: 'exactInput', internalType: 'bool', type: 'bool' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'sqrtPriceLimitX96', internalType: 'uint160', type: 'uint160' },
      { name: 'hookData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'quote',
    outputs: [
      { name: 'amountOut', internalType: 'uint256', type: 'uint256' },
      { name: 'gasEstimate', internalType: 'uint256', type: 'uint256' },
      { name: 'sqrtPriceAfter', internalType: 'uint160', type: 'uint160' },
      { name: 'initializedTicksCrossed', internalType: 'uint32', type: 'uint32' },
    ],
    stateMutability: 'view',
  },
] as const;

/**
 * PoolManager ABI — needed for the swap function that the Universal Router
 * delegates to. Only the key function for our adapter is included.
 */
export const PoolManagerAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'key',
        internalType: 'struct PoolKey',
        type: 'tuple',
        components: [
          { name: 'currency0', internalType: 'address', type: 'address' },
          { name: 'currency1', internalType: 'address', type: 'address' },
          { name: 'fee', internalType: 'uint24', type: 'uint24' },
          { name: 'tickSpacing', internalType: 'int24', type: 'int24' },
          { name: 'hooks', internalType: 'address', type: 'address' },
        ],
      },
      {
        name: 'params',
        internalType: 'struct IPoolManager.SwapParams',
        type: 'tuple',
        components: [
          { name: 'zeroForOne', internalType: 'bool', type: 'bool' },
          { name: 'amountSpecified', internalType: 'int256', type: 'int256' },
          { name: 'sqrtPriceLimitX96', internalType: 'uint160', type: 'uint160' },
        ],
      },
      { name: 'hookData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'swap',
    outputs: [
      { name: 'amount0Delta', internalType: 'int256', type: 'int256' },
      { name: 'amount1Delta', internalType: 'int256', type: 'int256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const;
