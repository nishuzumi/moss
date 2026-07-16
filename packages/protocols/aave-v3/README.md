# Aave v3 — Lending on Monad

Moss protocol adapter for [Aave v3](https://aave.com) on Monad mainnet.
The canonical lending protocol: supply assets as collateral, borrow against
them, withdraw, and repay.

## Pool contract

| Role | Address | Verification |
|------|---------|-------------|
| Pool (ERC-1967 proxy) | `0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef` | Verified on-chain 2026-07-15 |
| Implementation | `0x9539531ea4f6563a66421a7449506152609985be` | 21KB code, matching Aave v3 |

> **⚠️ Native MON not supported.** All Pool entrypoints (supply/withdraw/borrow/repay)
> are `nonpayable`. Supply WMON (`0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`)
> instead. The adapter rejects native MON with a clear error.

## Capabilities

| Method   | Verb      | Description                        | Risk          |
|----------|-----------|------------------------------------|---------------|
| `supply` | `supply`  | Deposit WMON → mint aToken         | fundOut, approval |
| `withdraw` | `withdraw` | Burn aToken → withdraw WMON      | fundOut       |
| `borrow` | `borrow`  | Borrow asset at variable rate      | fundOut       |
| `repay`  | `repay`   | Repay borrowed asset               | fundOut, approval |

Supply and repay compose an `erc20.approve` capability before the Pool
interaction — both share `approval` risk.

## Queries

| Method             | Description                                    |
|--------------------|------------------------------------------------|
| `userAccountData`  | Health factor, LTV, total collateral/debt base |
| `reserveData`      | aToken/debt token addresses, liquidity rate    |

## Architecture

The adapter uses the PR #31 Capability + Receipt framework:

- `@Capability` decorators define each operation with typed Zod params,
  risk labels, and metadata
- `@Receipt` methods decode Aave Pool events (Supply/Withdraw/Borrow/Repay)
  from simulation `Change[]` output
- Supply/repay return composed trees: `[erc20.approve, pool.<method>]`
- Withdraw/borrow return single-transaction capabilities
- `registry.use(AaveV3)` — no manifest wrapper needed

See `src/aave-v3.ts` for the full implementation.
