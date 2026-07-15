# Moss — working notes for Claude

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

## Repo facts

- pnpm monorepo. `core` owns framework contracts; `simulator` owns trace and
  ordered Change extraction; `erc` owns address-free standard semantics;
  `system` owns Monad Runtime and verified official constants;
  `protocols/*` own protocol ABIs, Capabilities, Queries, dependencies, and
  Receipts; `mcp-server` owns transport and application composition only.
- Protocol packages export self-describing `@Protocol` classes. Registry scans
  selected top-level module exports, recursively registers declared Protocol
  dependencies, and injects typed instances. There is no import-time
  registration or separate package registration object.
- Every Capability owns exactly one direct TransactionNode and one typed pure
  Receipt parser. More transactions come from nested Capabilities. Core alone
  validates and depth-first flattens the tree.
- Simulation produces immutable ordered Event/native-transfer Changes. Receipt
  leaves retain the exact original Change objects; core verifies identity,
  length, and order. Any Warning halts.
- Capability and Query fields use `{ type, description }`: a reusable
  context-free Zod value contract plus a method-specific field purpose.
- Moss v1 is Monad-mainnet only. Runtime verifies RPC chain ID 143; chain
  identity is not configurable or repeated in Protocols and Capability nodes.
- Verify: `pnpm lint` / `pnpm build` / `pnpm typecheck` / `pnpm test`
  (build precedes typecheck — cross-package types resolve through dist). Tests include live
  Monad mainnet e2e (free: Moss never signs/sends); `MOSS_SKIP_E2E=1` when
  offline; sandboxed/proxied environments need `NODE_USE_ENV_PROXY=1` for
  Node fetch and `HOME=$TMPDIR/forge-home` for forge runs.
- Toolchain pins (ADR 0001): vitest 3.x (vite 8's oxc can't lower stage-3
  decorators), TypeScript 5.9 (tsup dts × TS6). Local gitignored `.npmrc`
  keeps pnpm store in-repo for sandboxed shells.
- ABIs are never hand-written (ADR 0007): compiled via forge + @wagmi/cli, or
  vendored via `update:abis` scripts with test-enforced derivation chains.
- Foundry: `forge init`/`forge install` MUST use `--no-git`; CI fails on any
  git submodule.
