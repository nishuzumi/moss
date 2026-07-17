# @themoss/protocol-clober

Moss Protocol package for exact-input market swaps on the Clober V2 on-chain orderbook on Monad mainnet.

## Operations

- `quote`: derives the canonical single-book market, verifies its `BookKey` on-chain, and returns the requested input, estimated amount spent, and expected/minimum output in human token units.
- `swap`: repeats the current quote and verification, adds a nested ERC-20 approval when needed, and builds one direct `Controller.spend` transaction.

Inputs use explicit token addresses or `native`, a human-readable `amountIn`, and slippage in basis points (default `50`, or 0.5%). The package does not accept a caller-supplied BookId or transaction target.

## Trust and provenance

Monad mainnet deployments come from the official Clober V2 SDK address book:

| Contract | Address |
| --- | --- |
| Controller | `0x19b68a2b909D96c05B623050C276FBD457De8e83` |
| BookManager | `0x6657d192273731C3cAc646cc82D5F28D0CBE8CCC` |
| BookViewer | `0xe424c211e2Ed8a5B6d1C57FA493C41715568D238` |

Source: [Clober V2 SDK addresses](https://github.com/clober-dex/v2-sdk/blob/main/src/constants/chain-configs/addresses.ts), retrieved 2026-07-16. Live tests verify deployed bytecode and contract relationships.

ABIs are vendored verbatim from the guarded `@clober/v2-sdk` npm tarball and deterministically regenerated into `src/abis/clober.ts`. `test/abis.test.ts` enforces the source-to-generated chain.

## Safety model

The BookId is derived from the input/output assets and Clober's canonical Monad fee and unit-size rules. The returned `BookKey` must exactly match those values before quoting or constructing a Capability. A quote must use at least 99.9% of the requested input; this allows deterministic book-unit dust while rejecting materially partial fills.

Input amounts must be exactly representable in the token's smallest unit; excess non-zero decimal precision is rejected instead of silently rounded. ERC-20 allowance is read before construction, so an approval Capability is added only when the current allowance is insufficient.

The Receipt parser uses only ordered simulation Changes. It interprets BookManager `Take` events, rejects fills from multiple books, and requires actual input/output transfer evidence. Native/ERC-20 settlement Changes are delegated to the ERC Protocol while preserving every original Change object in order.

## Current scope

- Monad mainnet only.
- Exact-input, single-book market orders only.
- No target-output swaps, multi-book routing, limit orders, custom hooks, permits, or caller-supplied market identifiers.

Run the package checks from the repository root:

```bash
pnpm build
pnpm typecheck
pnpm lint
MOSS_SKIP_E2E=1 pnpm test
```
