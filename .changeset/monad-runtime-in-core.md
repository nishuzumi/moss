---
"@themoss/core": minor
"@themoss/system": minor
---

Move the Monad Runtime into `@themoss/core`. `createRuntime()` now takes an
optional `rpcUrl`, and core exports `MONAD_CHAIN_ID` alongside `DEFAULT_RPC_URL`,
which resolves `MOSS_RPC_URL` once so no other module spells an endpoint or reads
the environment. `@themoss/system` no longer exports `monadRuntime`,
`MONAD_CHAIN_ID` or `DEFAULT_RPC_URL`; call `createRuntime()` from core instead.
