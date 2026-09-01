# Contributing to Moss

`CONTEXT.md` and the current ADRs define the framework contract. Delete superseded contracts instead of extending them.

Useful contributions include:

1. Protocol packages and new Capabilities or Queries;
2. runnable tutorials, examples, and documentation;
3. bug fixes, safety checks, and focused core improvements.

## Development setup

Requires Node 22 or newer and pnpm 11.

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm test:offline` skips live Monad tests when offline. Build must precede typecheck because cross-package declarations resolve through built output.

Toolchain notes you shouldn't fight:

- **Stage-3 decorators** are lowered by esbuild (tsup/tsx/vitest 3). Don't bump vitest to 4.x until vite's oxc transform lowers decorators. Don't enable `experimentalDecorators`. See [ADR 0001](./docs/adr/0001-decorator-authoring-model.md).
- TypeScript is pinned to 5.9.x until tsup's dts build supports TS 6.
- **Supply-chain guard**: `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` — dependency versions younger than one day are rejected at resolution.

## Pull requests

- Branch from `main` and explain motivation, behavior, package boundaries, and verification evidence.
- Read `AGENTS.md`, `CONTEXT.md`, and every relevant current ADR before review.
- User-facing package changes require a changeset.
- Do not add compatibility for an uncommitted intermediate design. Delete replaced code and documentation.
- Keep docs, examples, tests, and source consistent in the same change.
- CI must pass lint, build, typecheck, and tests, including the Monad-mainnet E2E path.

## Protocol Definition of Done

- [ ] The package exports one or more top-level self-describing `@Protocol` classes. There is no separate registration object or import-time registration.
- [ ] Protocol dependencies are declared explicitly and injected into typed instance fields. Cross-Protocol writes use injected Capabilities; reads use injected Queries.
- [ ] Every Capability and Query parameter is `{ type, description }`: a reusable context-free Zod value contract plus a method-specific field description.
- [ ] Generated JSON Schema shown by `load` preserves the type description separately from the field description.
- [ ] Every Capability owns exactly one direct TransactionNode and names exactly one typed Receipt parser. Additional transactions belong to nested Capabilities.
- [ ] Every Receipt parser is pure, receives only the immutable ordered Changes of one successful transaction, and returns a structured Outcome plus exact ordered coverage.
- [ ] Positive and negative compile-time fixtures prove exported decorator inference, parameter inference, and Receipt-name autocomplete. Invalid usage uses `@ts-expect-error`.
- [ ] Registry runtime checks reject invalid metadata, missing dependencies, bad Receipt bindings, and malformed Capability trees.
- [ ] Every ABI has a documented origin and follows [ADR 0007](./docs/adr/0007-abi-origin.md). Vendored generation uses the full upstream artifact.
- [ ] Every fixed address cites a canonical source and is checked for deployed bytecode; token constants also verify expected metadata.
- [ ] A live Monad-mainnet simulation test proves zero Warnings and exact Receipt coverage for the happy path.
- [ ] Adding the Protocol changes only its package and the explicit application composition root.

Start from [`packages/protocols/_template`](./packages/protocols/_template) and read [Protocol onboarding](./docs/protocol-onboarding.md).

## Reporting security issues

Use GitHub private vulnerability reporting. Do not open a public issue for a vulnerability.
