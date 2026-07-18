/**
 * Uniswap v4 TypeScript type definitions.
 *
 * Derived from:
 * - v4-core: types/PoolKey.sol, types/Currency.sol, types/BalanceDelta.sol
 * - v4-periphery: src/libraries/PathKey.sol, src/interfaces/IV4Router.sol
 *
 * These types mirror the Solidity structs for use in the adapter's
 * parameter encoding and receipt parsing.
 */
import type { AddressValue, TokenRef } from "@themoss/core";
import { NATIVE } from "@themoss/core";

// ---------------------------------------------------------------------------
// PoolKey — uniquely identifies a Uniswap v4 pool
// ---------------------------------------------------------------------------

/**
 * Hook type from v4-core.
 * Represents the address of a hooks contract (or address(0) for no hooks).
 */
export type PoolHooks = AddressValue;

/**
 * Fee amount for a pool, in hundredths of a bip (i.e., 1/10,000,000).
 * - 3000 = 0.3%
 * - 10000 = 1%
 * - Capped at 1,000,000.
 * - If the highest bit (bit 23) is set, the pool has a dynamic fee
 *   and must be exactly equal to 0x800000.
 */
export type PoolFee = number;

/**
 * Tick spacing for a pool.
 * Ticks must be a multiple of tickSpacing.
 * Pools must have a positive, non-zero tickSpacing.
 */
export type PoolTickSpacing = number;

/**
 * PoolKey uniquely identifies a Uniswap v4 pool.
 * Currencies are sorted numerically: currency0 < currency1.
 */
export type PoolKey = {
  currency0: AddressValue;
  currency1: AddressValue;
  fee: PoolFee;
  tickSpacing: PoolTickSpacing;
  hooks: AddressValue;
};

// ---------------------------------------------------------------------------
// PathKey — for multi-hop swaps
// ---------------------------------------------------------------------------

/**
 * PathKey defines a single leg of a multi-hop swap.
 * Used in V4Router.ExactInputParams.path[].
 */
export type PathKey = {
  /** The output currency of this leg (used as input to the next leg). */
  intermediateCurrency: TokenRef;
  /** Pool fee for this leg. */
  fee: PoolFee;
  /** Tick spacing for this leg. */
  tickSpacing: PoolTickSpacing;
  /** Hook contract address for this leg (or address(0)). */
  hooks: PoolHooks;
  /** Arbitrary data to pass to hooks. */
  hookData: `0x${string}`;
};

// ---------------------------------------------------------------------------
// Swap parameters
// ---------------------------------------------------------------------------

/**
 * Exact-in single-hop swap parameters for V4Router.
 */
export type ExactInputSingleParams = {
  /** The pool key identifying the swap pool. */
  poolKey: PoolKey;
  /** true if swapping currency0→currency1, false for currency1→currency0. */
  zeroForOne: boolean;
  /** Amount of currencyIn to swap (in smallest units). */
  amountIn: bigint;
  /** Minimum amount of currencyOut to receive (in smallest units). */
  amountOutMinimum: bigint;
  /** Minimum price for the hop, in x36 fixed-point. 0 = no check. */
  minHopPriceX36: bigint;
  /** Hook data to pass to the pool. */
  hookData: `0x${string}`;
};

/**
 * Exact-in multi-hop swap parameters for V4Router.
 */
export type ExactInputParams = {
  /** Input currency. */
  currencyIn: TokenRef;
  /** Swap path (each leg specifies output currency + pool params). */
  path: PathKey[];
  /** Per-hop minimum price checks. */
  minHopPriceX36: bigint[];
  /** Total input amount. */
  amountIn: bigint;
  /** Overall minimum output amount. */
  amountOutMinimum: bigint;
};

// ---------------------------------------------------------------------------
// Quote results
// ---------------------------------------------------------------------------

/**
 * Quote result from V4Quoter.quoteExactInputSingle.
 */
export type QuoteResult = {
  /** The quoted output amount (in smallest units). */
  amountOut: string;
  /** Estimated gas for the swap. */
  gasEstimate: string;
  /** The input amount side. */
  amountSide?: "amountIn" | "amountOut";
  /** The input amount. */
  amountIn?: string;
  /** The estimated output amount. */
  estimatedAmountOut?: string;
  /** The minimum output amount. */
  minimumAmountOut?: string;
  /** The estimated input amount (for exact-out quotes). */
  estimatedAmountIn?: string;
  /** The maximum input amount (for exact-out quotes). */
  maximumAmountIn?: string;
};

/**
 * Structured swap outcome for the Receipt parser.
 */
export type SwapOutcome = {
  operation: "swap";
  /** Protocol name for identification. */
  protocol: string;
  /** Input token reference. */
  tokenIn: TokenRef;
  /** Output token reference. */
  tokenOut: TokenRef;
  /** Input amount in smallest units. */
  amountIn: string;
  /** Output amount in smallest units. */
  amountOut: string;
  /** Pool fee that was used. */
  fee: PoolFee;
  /** Whether swap was currency0→currency1. */
  zeroForOne: boolean;
};

// ---------------------------------------------------------------------------
// Currency helpers
// ---------------------------------------------------------------------------

/**
 * Check if a TokenRef represents the native currency (MON).
 * In v4, native = Currency.wrap(address(0)).
 */
export function isNativeCurrency(token: TokenRef): boolean {
  return token === NATIVE || token === "0x0000000000000000000000000000000000000000";
}

/**
 * Convert a TokenRef to a raw Currency(0) address for PoolKey.
 */
export function toCurrencyAddress(token: TokenRef): `0x${string}` {
  if (isNativeCurrency(token)) return "0x0000000000000000000000000000000000000000";
  return token as `0x${string}`;
}

/**
 * Build a PoolKey from two token refs.
 * Ensures currency0 < currency1 by numeric address comparison.
 */
export function buildPoolKey(
  tokenIn: TokenRef,
  tokenOut: TokenRef,
  fee: PoolFee,
  tickSpacing: PoolTickSpacing,
  hooks: PoolHooks = "0x0000000000000000000000000000000000000000" as const,
): PoolKey {
  const a0 = toCurrencyAddress(tokenIn);
  const a1 = toCurrencyAddress(tokenOut);
  const [currency0, currency1] = a0.toLowerCase() < a1.toLowerCase() ? [a0, a1] : [a1, a0];
  return {
    currency0: currency0 as `0x${string}`,
    currency1: currency1 as `0x${string}`,
    fee,
    tickSpacing,
    hooks,
  };
}

/**
 * Determine swap direction given currencyIn and the pool key.
 * Returns true if swapping currency0→currency1.
 */
export function getSwapDirection(
  currencyIn: TokenRef,
  poolKey: PoolKey,
): { zeroForOne: boolean; currencyOut: TokenRef } {
  const addr = toCurrencyAddress(currencyIn);
  const zeroForOne = addr.toLowerCase() === poolKey.currency0.toLowerCase();
  const currencyOut = zeroForOne ? poolKey.currency1 : poolKey.currency0;
  return { zeroForOne, currencyOut: currencyOut as TokenRef };
}

/**
 * Convert a TokenRef back to Currency (identity, since v4 Currency = address).
 */
export function toCurrency(token: TokenRef): TokenRef {
  return token;
}
