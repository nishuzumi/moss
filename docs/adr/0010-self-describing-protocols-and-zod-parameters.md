# Protocol packages are self-describing and compose through injected dependencies

A Protocol package exports top-level self-describing `@Protocol` classes; the composition root supplies selected modules, and Registry registers their Protocol exports and recursively injects declared dependencies. Core owns framework contracts, simulator owns trace mechanics, Protocol packages own ABI semantics, Receipts, and protocol-exclusive deployments, `@themoss/erc` stays address-free, core owns the shared Monad Runtime and rejects non-143 RPCs, system owns shared verified asset constants, and MCP server owns transport; dynamic addresses come from chain state and adding a Protocol changes only its package and composition root. Capability and Query inputs use `{ type, description }`, separating a reusable context-free Zod value contract from the field's purpose and exposing the generated JSON-safe schema through `load`.

Protocol classes compose through declared `protocols` dependencies and typed injected fields. A decorated Protocol cannot extend another decorated Protocol; Registry rejects that inheritance so Receipt-only instances never execute a parent Protocol's Runtime-injecting constructor.

Protocol metadata may declare fixed Package address labels independently of Handles. Registry renders them as `Package(Title Cased Slug:localName)` and validates the combined payload inside the Core-owned wrapper as a 1–32 character safe name. The composition root supplies Trusted token labels through the explicit Registry constructor option, rendered as `Trusted(name)`; Registry never discovers them by scanning ordinary Protocol exports. Within one catalog or Protocol, addresses and case-insensitive names are both unique.

## The Monad Runtime moved to core (2026-07-31)

An earlier revision (ADR 0006, since deleted) kept chain identity out of `core`
entirely: `createRuntime` took `chainId` as a required parameter and shipped no
chain data, so `@themoss/system` supplied both Monad defaults through
`monadRuntime()`. That separation is gone — `core` dropped the `chainId`
parameter and has verified chain 143 itself ever since, which left
`monadRuntime()` as a wrapper whose only remaining job was a default endpoint,
and left `143` declared in two packages.

`core` now owns the whole Runtime: `MONAD_CHAIN_ID`, `PUBLIC_RPC_URL`, and
`DEFAULT_RPC_URL` (the `MOSS_RPC_URL` override, resolved once so no other module
spells an endpoint or reads the environment). `createRuntime()` takes an optional
`rpcUrl`, `monadRuntime()` is gone, and `system` is what its name claims: shared
verified constants plus the WMON Protocol.

This also removes a package-boundary problem rather than working around it.
`system` imports `ERC20` and `WETH9Abi` from `erc`, so an `erc` test that wanted
the shared endpoint could not import `system` without a cycle — a
devDependency-only cycle still reorders `pnpm -r build` and breaks system's dts
build. Every package already depends on `core`, so the endpoint is now reachable
from all of them directly.
