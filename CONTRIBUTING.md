# Contributing to Moss

Thanks for helping build the capability layer for agentic Monad. Contributions we're excited about, roughly in order of impact:

1. **Protocol adapters** — new protocols, new capabilities/queries on existing ones, better metadata (parameter constraints, risk labels, cleanup steps).
2. **Docs & examples** — tutorials, FAQ entries, runnable examples for real user needs.
3. **Bugfixes & core improvements.**

## Development setup

Node ≥ 22 and pnpm 11 (`corepack` is no longer bundled with Node — `npm i -g pnpm` works).

```bash
pnpm install
pnpm build        # build precedes typecheck: packages resolve each other's dist types
pnpm typecheck
pnpm lint         # biome — pnpm lint:fix to auto-format
pnpm test         # includes live e2e against Monad mainnet (free: nothing is signed/sent)
```

`MOSS_SKIP_E2E=1 pnpm test` skips the live-chain tests when offline.

Toolchain notes you shouldn't fight:

- **Stage-3 decorators** are lowered by esbuild (tsup/tsx/vitest 3). Don't bump vitest to 4.x until vite's oxc transform lowers decorators, and don't enable `experimentalDecorators`. Background: [ADR 0001](./docs/adr/0001-decorator-authoring-model.md).
- TypeScript is pinned to 5.9.x until tsup's dts build supports TS 6.
- **Supply-chain guard**: `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` — dependency versions younger than one day are rejected at resolution. If you bump a dependency and pnpm refuses a just-published version, that's working as intended; take the previous release or wait a day.

## Pull requests

- Branch from `main`; conventional titles appreciated (`feat(protocols): add curvance supply`).
- Every PR: motivation, what changed, and evidence (test output; for capabilities, a simulate effects summary).
- User-facing changes need a changeset: `pnpm changeset`.
- CI must pass: lint, build, typecheck, tests (including mainnet e2e).

## Adding a protocol adapter — Definition of Done

One protocol = one package: copy [`packages/protocols/_template`](./packages/protocols/_template) and follow its checklist; full guide in [docs/protocol-onboarding.md](./docs/protocol-onboarding.md). The bar a new adapter must clear:

- [ ] The package exports a **manifest** (`defineProtocolPackage`) and, to be officially listed, is added to the MCP server's `use()` array in `packages/mcp-server` ([ADR 0006](./docs/adr/0006-protocol-packages-and-manifests.md)).
- [ ] Every ABI lives in `src/abis/` with an **ABI origin** header — compiled / explorer / vendored ([ADR 0007](./docs/adr/0007-abi-origin.md)).
- [ ] Capabilities/queries are declared with `@Capability`/`@Query`: intent template, semantic params, risk labels, tags. Verbs are user-perspective fund semantics from the closed set — never protocol function names ([ADR 0003](./docs/adr/0003-two-tier-capability-taxonomy.md)).
- [ ] Every capability returns `plan(steps, flows)` with **quantified expects** — what may leave (max), what must arrive (min). Approvals built via `approveStep` (from `@mossxyz/erc`) are auto-declared ([ADR 0004](./docs/adr/0004-quantified-expects-in-plans.md)).
- [ ] Writes with a meaningful on-chain receipt declare it with `@Event` and gate on it via `confirms`; observations narrate, never overrule the audit plane ([ADR 0008](./docs/adr/0008-observation-plane.md)).
- [ ] Tokens the protocol introduces are listed in `src/tokens.ts`, verified on-chain (collisions with existing symbols are rejected at registration).
- [ ] Discoverable & loadable: shows up in `discover`/`load` output (unit test).
- [ ] A live e2e test simulates the happy path against Monad mainnet and asserts **zero warnings**.
- [ ] Contract addresses verified on-chain, with the verification method noted in a comment.
- [ ] Docs: what the protocol is, supported markets/assets, parameter quirks, known risks.

References: the system WMON adapter [`packages/system/src/wmon.ts`](./packages/system/src/wmon.ts) (over-commented on purpose); [`packages/protocols/kuru`](./packages/protocols/kuru) for reads-before-build and precision-unit quirks; [`packages/erc`](./packages/erc) for dynamic-address protocols and compiled ABIs.

## Reporting security issues

Not in public issues — see [SECURITY.md](./SECURITY.md).
