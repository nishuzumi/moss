# Uniswap v4 — Concentrated-Liquidity AMM on Monad

Moss protocol adapter for [Uniswap v4](https://uniswap.org) on Monad mainnet.
Single-hop exact-input swaps through the Universal Router with native MON
support (no WMON detour).

## Contracts

| Contract | Address | Verification |
|----------|---------|-------------|
| Universal Router | `0x0d97dc33264bfc1c226207428a79b26757fb9dc3` | Verified on-chain 2026-07-14 |
| V4Quoter | `0xa222dd357a9076d1091ed6aa2e16c9742dd26891` | Verified on-chain 2026-07-14 |
| PoolManager | `0x188d586ddcf52439676ca21a244753fa19f9ea8e` | Verified on-chain 2026-07-14 |

## Capabilities

| Method | Verb | Description | Risk |
|--------|------|-------------|------|
| `swap` | `swap` | Exact-input swap through Universal Router | fundOut, approval, priceImpact |

For ERC20 inputs, swap composes an `erc20.approve` capability before the
Universal Router transaction. Native MON inputs produce a single transaction
with value attached.

## Queries

| Method | Description |
|--------|-------------|
| `quote` | Estimate swap output amount via V4Quoter |
| `markets` | List known v4 pools this adapter can trade on |

## Supported Pools

| Pair | Fee | Tick Spacing |
|------|-----|-------------|
| MON/USDC | 0.05% | 10 |
| MON/AUSD | 0.05% | 10 |

## Architecture

The adapter uses the PR #31 Capability + Receipt framework:

- `@Capability` decorator with typed Zod params (TokenReference, PositiveDecimalString, BasisPoints)
- `@Receipt` for swap execution (simple receipt — Universal Router events
  are emitted inside PoolManager and not directly observable)
- `@Protocol(protocols: { erc20: ERC20 })` for ERC20 approval composition
- try/catch around `#quoteExactIn` to allow offline capability building

See `src/uniswap-v4.ts` for the full implementation.
