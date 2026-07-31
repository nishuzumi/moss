---
"@themoss/core": minor
"@themoss/system": minor
---

Move the Monad Runtime into `@themoss/core`. `createRuntime()` now takes an
optional `rpcUrl`, and core exports `MONAD_CHAIN_ID` alongside `defaultRpcUrl()`,
which resolves `MOSS_RPC_URL` so no other module spells an endpoint or reads the
environment. A blank value counts as unset; a non-blank value that is not an
http(s) URL is rejected by name. `@themoss/system` no longer exports
`monadRuntime`, `MONAD_CHAIN_ID` or `DEFAULT_RPC_URL`; call `createRuntime()` from
core instead.
