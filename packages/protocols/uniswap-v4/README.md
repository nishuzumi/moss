# @themoss/protocol-uniswap-v4

Uniswap v4 adapter on Monad — single-hop token swaps via PoolManager.

## Overview

This package implements a self-describing `@Protocol` adapter for Uniswap v4 on Monad
(mainnet, chain ID 143). It exposes the PoolManager contract for token swaps and the
V4Quoter contract for price quotes.

The adapter uses PoolManager's `unlock(callback)` pattern to execute a single
transaction that encapsulates the full swap flow: `settle/sync` → `swap` → `take`.

## Contracts

| Contract | Address | Source |
|----------|---------|--------|
| PoolManager | `0x188d586dcf52439676ca21a244753fa19f9ea8e` | [Uniswap/v4-core@1.0.2](https://github.com/Uniswap/v4-core), vendored via npm tarball |
| V4Quoter | `0xa222dd357a9076d1091ed6aa2e16c9742dd26891` | [Uniswap/v4-periphery@1.0.3](https://github.com/Uniswap/v4-periphery), vendored via npm tarball |

Addresses verified on Monad mainnet (chain 143). Contracts are immutable (no upgrade pattern).

Full address and provenance record: [Uniswap official deployments](https://github.com/Uniswap/docs/blob/main/content/deployments.md).

## Capabilities

### `swap`

Swap a fixed amount of one token for another via a Uniswap v4 pool (exact-in single-hop).

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `tokenIn` | `TokenReference` | Asset offered to the swap (ERC20 address or `"native"` for MON). |
| `tokenOut` | `TokenReference` | Asset requested from the swap. |
| `amountIn` | `PositiveDecimalString` | Amount of `tokenIn` to swap, in display units. |
| `slippageBps` | `BasisPoints` | Maximum adverse price movement allowed (integer basis points; 1 bps = 0.01%). |
| `hookData` | `TokenReference` (hex) | Arbitrary bytes to pass to pool hooks; defaults to `0x`. |

**Flow:**

1. If `tokenIn` is ERC20: calls `erc20.approve(poolManager, amountIn)` (nested Capability).
2. If `tokenIn` is native MON: calls `poolManager.sync([])` with `{value: amountIn}` via `settle()` payable function.
3. Calls `poolManager.unlock(callback)` — single direct TransactionNode.
   The callback encodes: `settle()`/`sync(tokenOut)` → `swap(poolKey, params, hookData)` → `take(tokenOut, recipient, minAmountOut)`.
4. Handles native MON output directly via PoolManager's `take()` with the zero address recipient.

**Risk labels:** `fundOut`, `approval`, `priceImpact`

## Queries

### `quote`

Get a quote for an exact-in swap via V4Quoter.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `tokenIn` | `TokenReference` | Input token address or `"native"`. |
| `tokenOut` | `TokenReference` | Output token address or `"native"`. |
| `amountIn` | `PositiveDecimalString` | Amount of `tokenIn` to quote, in display units. |

**Returns `QuoteResult`:**

| Field | Type | Description |
|-------|------|-------------|
| `amountOut` | `string` | Quoted output amount (display units). |
| `gasEstimate` | `string` | Estimated gas cost. |
| `amountIn` | `string?` | Input amount (display units). |
| `estimatedAmountOut` | `string?` | Estimated output amount. |
| `minimumAmountOut` | `string?` | Minimum output after 2% slippage buffer. |

## Receipt

The `swapReceipt` parser decodes PoolManager events from simulation traces:

- **PoolManager.Swap** — decoded via `decodeAbiParameters` (custom event layout not in 4byte registry). Extracts `amount0`, `amount1`, `fee`, and derives `zeroForOne` direction.
- **PoolManager.Transfer** — decodes token movements to/from PoolManager to derive `tokenIn` and `tokenOut`.
- **ERC20 nativeTransfer** — delegated to `erc20.changesReceipt` for value movements.
- **ERC20 Transfer/Approval** — delegated to `erc20.changesReceipt` for non-PoolManager events.

Returns `SwapOutcome` with operation, protocol, token refs, amounts, fee tier, and direction.

## ABI Provenance

All ABIs follow ADR 0007 vendored provenance:

| ABI | Source | Tarball SHA256 |
|-----|--------|----------------|
| PoolManagerAbi | `@uniswap/v4-core@1.0.2` foundry artifacts | `033d148fac5995874b83621afe35be94a28eb00bfd59bd0a8c9c030bea6a1aef` |
| V4QuoterAbi | `@uniswap/v4-periphery@1.0.3` foundry artifacts | `3abeef0bd9e6d895727e0bec457db5d600fbb5debd4d413a95577cca938adff0` |
| UniversalRouterAbi | `@uniswap/universal-router@2.1.0` | `9cdf0ead2bc8993604a4e6e2e8a1fd6f6f8621a5026cb63ef14888c952b42aa5` |

Generated from npm tarballs via `pnpm gen:abis`. See `abis-src/*.json` for committed upstream metadata.

## Risks

- **priceImpact**: Slippage can cause significant loss on low-liquidity pools. Use `slippageBps` to limit adverse movement.
- **slippage**: The adapter computes `minAmountOut` from on-chain quotes; ensure slippage tolerance matches your risk appetite.
- **hook uncertainty**: Pool hooks may modify swap behavior unpredictably. Hook address should be verified before use.
- **quote advisory**: The `quote` query is advisory — actual swap execution repeats discovery against current state.

## Fee Tiers

Standard pool fee tiers (in hundredths of a bip, i.e., 1/10,000,000):

| Fee value | Percentage |
|-----------|------------|
| 100 | 0.01% |
| 500 | 0.05% |
| 3000 | 0.3% (default) |
| 10000 | 1% |

Dynamic-fee pools use fee value `0x800000` (highest bit set).
