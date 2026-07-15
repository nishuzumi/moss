# Codex PR review rules

## Type safety

- Treat exported TypeScript types, inference, and literal autocomplete as public API behavior. Runtime validation does not replace a compile-time contract.
- A PR that changes an exported generic or decorator contract must include a compile-time fixture covering both directions: valid usage compiles with the intended inferred types, and invalid usage is rejected with `@ts-expect-error`. Reviewers must reject `any`, broad casts, or widened `string` types that make the fixture pass without preserving the contract.
- Require every exposed Capability and Query parameter to keep reusable type semantics separate from field purpose. A Parameter type description may state only the value's representation, units, conversion, constraints, and examples; the parameter declaration's description must separately state its method-specific role. Reject missing descriptions or type descriptions coupled to one use site.
- Before concluding that types are sound, run `pnpm build` and then `pnpm typecheck`; cross-package type checking depends on built declarations.

## Architecture reviews

- Before reviewing a PR, read the root `CONTEXT.md` and every relevant current ADR under `docs/adr/`; treat their vocabulary, boundaries, and decisions as repository standards alongside this file.
- Reject code that silently reintroduces a removed architecture or contradicts a current ADR. A deliberate architecture change must update `CONTEXT.md`, replace the affected ADR, and delete decisions that are no longer useful.
- Moss v1 is Monad-mainnet only. Reject speculative per-chain maps or repeated chain IDs in Protocol metadata, address constants, and Capability nodes; Runtime must instead reject an RPC whose reported chain ID is not `143`.
- Require every fixed official address added to `@themoss/system` to cite a canonical source and include an on-chain check for deployed bytecode and, for tokens, expected metadata. Addresses discovered dynamically from chain state do not belong in the fixed system constants.
