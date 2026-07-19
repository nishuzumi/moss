# Pendle protocol adapter

This workspace package is the build and test boundary for the Pendle Protocol adapter on Monad.
Its public entry point will export reviewed Protocol classes as implementation is added.

## Stage 2 provenance boundary

The fixed Monad deployments come from Pendle's immutable
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
