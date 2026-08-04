# @themoss/protocol-capricorn

Capricorn CLMM on Monad mainnet. Scope and addresses per [#150](https://github.com/nishuzumi/moss/issues/150).

**Status: in progress.** Deployment verification is complete. The ABI and adapter are pending the provenance question below.

## Scope

| v1 | Out of scope |
|---|---|
| `swap` — exact-in single-hop, SwapRouter `exactInputSingle` (`0x414bf389`), approve as a nested Capability | LP and PositionManager operations |
| `quote` — QuoterV2 `quoteExactInputSingle` (`0xc6a5026a`) | Multi-hop `exactInput` |
| Risk labels: `fundOut`, `approval`, `priceImpact` | Exact-output, PAMM, `unwrapWETH9` |

## Addresses

| Contract | Address |
|---|---|
| SwapRouter | `0xdac97b6a3951641B177283028A8f428332333071` |
| QuoterV2 | `0xB430EDD2b54cdB3B25703fb3342ca3a88663A04D` |
| CapricornCLFactory | `0x6B5F564339DbAD6b780249827f2198a841FEB7F3` |

Source: [capricorn.exchange](https://capricorn.exchange/).

## Deployment verification

ADR 0007 requires an on-chain bytecode check behind every fixed address. Capricorn is unverified on MonadScan, so the selector evidence below also stands in for the interface confirmation an explorer ABI would otherwise provide.

```
pnpm --filter @themoss/protocol-capricorn verify:deployment
```

Against `rpc.monad.xyz`, 2026-08-04:

```
  ok    chain is Monad mainnet                         chain id 143

deployed bytecode
  ok    SwapRouter          0xdac97b6a3951641B177283028A8f428332333071 — 12070 bytes
  ok    QuoterV2            0xB430EDD2b54cdB3B25703fb3342ca3a88663A04D —  8273 bytes
  ok    CapricornCLFactory  0x6B5F564339DbAD6b780249827f2198a841FEB7F3 — 24643 bytes

selectors present in deployed bytecode
  ok    SwapRouter.exactInputSingle                    0x414bf389
  ok    SwapRouter.WETH9                               0x4aa4a4fc
  ok    QuoterV2.quoteExactInputSingle                 0xc6a5026a
  ok    CapricornCLFactory.getPool                     0x1698ee82

test pool identity
  ok    token0 is WMON                                 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A
  ok    token1 is USDC                                 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
  ok    fee tier is 3000                               3000
  ok    pool has liquidity                             195826009639256953
  ok    factory derives the same pool                  0x878750488F613e043D016F99913e639E58BC1e52

quoter responds
  ok    1 WMON quotes to a positive amount             21050 USDC base units
```

Three results bear on the implementation:

- `exactInputSingle` resolves to `0x414bf389`, the Uniswap V3 periphery signature including `deadline` — not the seven-field PancakeSwap V3 variant. An adapter modelled on `packages/protocols/pancakeswap` cannot reuse its params struct.
- `WETH9()` is present; `WETH()` is not.
- `CapricornCLFactory.getPool(WMON, USDC, 3000)` returns the pool named in the issue, establishing it as canonical rather than one of several holding the pair. This matters for the live simulation test.

## ABI provenance

No ABI is committed yet. ADR 0007 permits three tiers, and this deployment rules out two:

- **Compiled** requires Solidity sources. Not published.
- **Explorer** requires a verified contract. `pnpm fetch-abi` has nothing to return.
- **Vendored** is what remains: artifacts under `abis-src/`, an `update:abis` script pinning the tarball by sha256, and a derivation test, following `packages/protocols/kuru`.

### Open question

Capricorn presents as a Uniswap V3 periphery deployment. Does vendoring the upstream `@uniswap/v3-periphery` artifacts, with a selector-derivation test proving this deployment implements them, satisfy the vendored tier?

If vendored is intended to mean artifacts published by the protocol itself, this needs input from the Capricorn team before proceeding.

## Remaining work

- ABI artifacts pinned, with derivation test
- `@Protocol` class: `swap` and `quote`; approve as a nested Capability so the swap Capability retains exactly one direct `TransactionNode`; one typed pure Receipt parser
- Compile-time fixtures, both directions
- Receipt coverage tests: missing, duplicated, replaced, reordered Changes
- Live Monad mainnet zero-Warning simulation against the fee-3000 pool
- Changeset
