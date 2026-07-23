# Pendle protocol adapter

Moss protocol adapter for [Pendle](https://pendle.finance) PT yield trading on Monad mainnet.
It buys and sells a market's Principal Token (PT) against the market underlying, over markets
discovered from the official Pendle API and verified on-chain before use.

## Public API

- **`swap` capability** — `{ market, tokenIn, tokenOut, amountIn, slippageBps }`. Re-verifies the
  market, resolves the direction from which token is the market PT, and returns one direct Pendle
  Router transaction with a nested ERC20 approval. `amountIn` is in display units; `slippageBps`
  bounds the minimum output. The receipt exhaustively parses the swap trace into a typed outcome
  (`buy-pt` / `sell-pt`, amounts, market, parties), retaining every Change in order.
- **`quote` query** — same parameters; returns the expected and minimum output in display units for
  either direction without moving funds.
- **`markets` query** — lists on-chain-verified Monad markets with expiry, decimals, and the
  Pendle-API aggregated APY carried as `inferred` provenance (never an on-chain guarantee). The APY
  is a decimal fraction, not a percentage: `0.05` means 5%.

Every candidate market — whether from the Pendle API or passed in by the caller — is validated
against the official V6 Market Factory (`isValidMarket`, `factory`), `readTokens`, SY token support,
expiry, decimals, and deployed bytecode before it can be used. The API only nominates candidates.

Scope: Monad mainnet only; simple direct routes; no aggregator, limit order, native token, YT, or LP.

## Unconfirmed maintainer assumptions (issue #11)

These are sensible defaults chosen pending confirmation on
[issue #11](https://github.com/nishuzumi/moss/issues/11) and may change:

- A single unified `swap` (rather than separate `buyPt` / `sellPt`).
- The caller passes a `market` address directly; it is re-verified on-chain every call.
- Dynamic API-based discovery is the market source; `slippageBps` uses the shared `BasisPoints` range.
- `@pendle/core-v2` vendored artifacts satisfy the issue's "official SDK"; ABI version `6.7.1`.

## ABI and address provenance

Fixed Monad deployments come from Pendle's immutable
[`deployments/143-core.json`](https://github.com/pendle-finance/pendle-core-v2-public/blob/6cd4773218e57dbda8925d10dfb672a0f594a9db/deployments/143-core.json):

- V6 Market Factory: `0xA3cb62a49b66eB2536cf6F3C7AC82293784888A3`
- Router V4 selector proxy: `0x888888888889758F76e7103c6CbF23ABbF58F946`
- RouterStatic selector proxy: `0x6813d43782395A1F2AAb42f39aeEDE03ac655e09`

Market and SY addresses are dynamic protocol state and are intentionally not fixed here.

Complete official artifacts are vendored verbatim from `@pendle/core-v2`; `abis-src/VENDOR.json`
records the selected release, tarball digest, artifact paths, and release-age decision.
`pnpm gen:abis` is offline and deterministically derives the committed TypeScript ABI, while
`pnpm update:abis` performs the networked release selection and re-vendoring step.

## Development

Run focused checks from the repository root:

```bash
pnpm --filter @themoss/protocol-pendle gen:abis
pnpm --filter @themoss/protocol-pendle build
pnpm --filter @themoss/protocol-pendle typecheck
pnpm --filter @themoss/protocol-pendle test
```
