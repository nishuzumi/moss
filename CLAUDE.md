# Moss agent instructions

## Working rules

- **No compatibility for uncommitted intermediates.** Anything that only ever
  existed between the last commit and the working tree is an in-flight draft:
  when a refactor supersedes it, replace it wholesale — no aliases, no
  re-exports, no deprecation shims, no migration notes. Delete, don't
  deprecate. Compatibility obligations begin at the first commit that ships a
  thing.
- **Accepted architecture is the requirement.** ADRs, the glossary, public
  docs, Agent rules, and the package template must describe it consistently.
  Never teach a superseded contract as a supported alternative.
- **Research files are temporary.** Never retain or commit `docs/research/`
  notes. Move durable conclusions into the relevant ADR or maintained docs,
  then delete the research file.
- **Keep type declarations local but grouped.** When a module accumulates many
  standalone domain or data-shape types, move the cohesive set into a
  colocated `types.ts`. Keep types derived directly from a runtime schema beside
  that schema instead of creating a reverse dependency from `types.ts`.

## Review guidelines

- Review against the accepted architecture, not the diff in isolation. Read
  `CONTEXT.md` and every ADR relevant to the changed area under `docs/adr/`;
  treat their vocabulary, ownership boundaries, and decisions as requirements.
- Reject changes that silently contradict a current ADR or reintroduce a
  superseded design. An intentional architecture change must update
  `CONTEXT.md`, replace the affected ADR, remove decisions that are no longer
  useful, and keep public docs, the glossary, Agent rules, and package templates
  consistent.

### Type safety

- Treat exported TypeScript types, inference, and literal autocomplete as
  public API behavior. Runtime validation does not replace a compile-time
  contract.
- A PR that changes an exported generic or decorator contract must include a
  compile-time fixture covering both directions: valid usage compiles with the
  intended inferred types, and invalid usage is rejected with
  `@ts-expect-error`. Reject `any`, broad casts, or widened `string` types that
  make the fixture pass without preserving the contract.
- Require every exposed Capability and Query parameter to keep reusable type
  semantics separate from field purpose. A Parameter type description may
  state only the value's representation, units, conversion, constraints, and
  examples; the parameter declaration's description must separately state its
  method-specific role. Reject missing descriptions or type descriptions
  coupled to one use site.
- Before concluding that types are sound, run `pnpm build` and then
  `pnpm typecheck`; cross-package type checking depends on built declarations.

### Architecture and evidence

- Enforce package ownership: `core` owns framework contracts; `simulator` owns
  trace mechanics and ordered Change extraction; `erc` owns address-free
  standards; `system` owns the Monad Runtime and shared verified constants;
  `protocols/*` own protocol semantics and deployments; `mcp-server` owns only
  transport and composition.
- Protocols must remain self-describing decorated classes discovered from
  selected top-level exports, with dependencies declared and injected. Reject
  import-time registration, separate registration objects, untyped Handles,
  or decorated Protocol inheritance.
- Every Capability must own exactly one direct TransactionNode and one pure,
  typed Receipt parser. Nested Capabilities own additional transactions; core
  alone validates and depth-first flattens the tree.
- Simulation and Receipts must preserve the exact identity, length, and order
  of immutable Event/native-transfer Changes. Reject inferred or reconstructed
  evidence, approximate ordering, continued execution after a Warning, and
  Receipt parsers that read external state.
- Moss v1 is Monad-mainnet only. Reject speculative per-chain maps or repeated
  chain IDs in Protocol metadata, address constants, and Capability nodes;
  Runtime must instead reject an RPC whose reported chain ID is not `143`.
- Reject hand-written ABIs and generated artifacts that drift from their
  source. Every ABI must follow ADR 0007's compiled, explorer, or vendored
  derivation and keep its origin and generated artifact verifiable.
- Require every fixed official address added to `@themoss/system` to cite a
  canonical source and include an on-chain check for deployed bytecode and,
  for tokens, expected metadata. Addresses discovered dynamically from chain
  state do not belong in the fixed system constants.
- For protocol-specific discovery, treat off-chain services only as candidate
  sources: verify transaction targets and relevant parameters on-chain, fail
  explicitly when verification is unavailable, and do not add static fallbacks.

### Verification

- Require focused tests for changed behavior and compile-time fixtures for
  exported type contracts. Before approval, run `pnpm lint`, `pnpm build`,
  `pnpm typecheck`, and `pnpm test` in that order; use `pnpm test:offline` only
  when the review environment cannot reach Monad mainnet, and state that the
  live checks were skipped.

## Repo facts

- pnpm monorepo. `core` owns framework contracts; `simulator` owns trace and
  ordered Change extraction; `erc` owns address-free standard semantics;
  `system` owns Monad Runtime and verified official constants;
  `protocols/*` own protocol ABIs, Capabilities, Queries, dependencies, and
  Receipts; `mcp-server` owns transport and application composition only.
- Protocol packages export self-describing `@Protocol` classes. Registry scans
  selected top-level module exports, recursively registers declared Protocol
  dependencies, and injects typed references. Parameterized dependencies use
  explicit `protocolFactory` aliases; their uncached factories create bound
  Capability/Query references and expose pure Receipt references separately.
  There is no import-time registration or separate package registration object.
- Every Capability owns exactly one direct TransactionNode and one typed pure
  Receipt parser. More transactions come from nested Capabilities. Core alone
  validates and depth-first flattens the tree.
- Simulation produces immutable ordered Event/native-transfer Changes. Receipt
  leaves retain the exact original Change objects; core verifies identity,
  length, and order. Any Warning halts.
- Capability and Query fields use `{ type, description }`: a reusable
  context-free Zod value contract plus a method-specific field purpose.
  Optional Protocol bindings use the same field contract, validate
  synchronously, derive dynamic Handles, and remain separate from method params.
- Moss v1 is Monad-mainnet only. Runtime verifies RPC chain ID 143; chain
  identity is not configurable or repeated in Protocols and Capability nodes.
- Verify: `pnpm lint` / `pnpm build` / `pnpm typecheck` / `pnpm test`
  (build precedes typecheck — cross-package types resolve through dist). Tests include live
  Monad mainnet e2e (free: Moss never signs/sends); use `pnpm test:offline` when
  offline; sandboxed/proxied environments need `NODE_USE_ENV_PROXY=1` for
  Node fetch and `HOME=$TMPDIR/forge-home` for forge runs.
- Toolchain pins (ADR 0001): vitest 3.x (vite 8's oxc can't lower stage-3
  decorators), TypeScript 5.9 (tsup dts × TS6). Local gitignored `.npmrc`
  keeps pnpm store in-repo for sandboxed shells.
- ABIs are never hand-written (ADR 0007): compiled via forge + @wagmi/cli, or
  vendored via `update:abis` scripts with test-enforced derivation chains.
- Foundry: `forge init`/`forge install` MUST use `--no-git`; CI fails on any
  git submodule.
