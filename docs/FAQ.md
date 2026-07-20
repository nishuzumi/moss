# FAQ — frequently asked questions

This page covers the highest-frequency questions on running, integrating,
and contributing to Moss. It mirrors the questions that come up repeatedly
in issues and discussions; if yours isn't here, open a discussion or read
[docs/getting-started.md](./getting-started.md) for the next step.

> **Vocabulary**: this guide uses the post-`#31` Capability / Receipt model
> ([ADR 0011](./adr/0011-capability-trees-and-exhaustive-receipts.md),
> [ADR 0010](./adr/0010-self-describing-protocols-and-zod-parameters.md)). If
> you arrived from older material, "Plan" has been replaced by a **Capability
> tree**, "manifest" by a self-describing `@Protocol` class, "effects" by
> ordered **Change**s, and "reconciliation" by exhaustive Receipt parsing of
> every verified Change in order. The user's perspective is unchanged —
> discover, load, action, simulate — the internal contract is stricter.

## Run & toolchain

### Why is `pnpm test` slow / hanging?

The test suite includes a live e2e section that hits the configured
`MOSS_RPC_URL` (default `https://rpc.monad.xyz`). Roughly half of
third-party free RPC tiers don't support `debug_traceCall`, which the
simulator requires ([ADR 0002](./adr/0002-simulation-via-debug-tracecall.md)).
Either:

- Skip the live e2e: `pnpm test:offline` (alias for
  `MOSS_SKIP_E2E=1 pnpm test`)
- Or switch to a known-good endpoint — see
  [ADR 0002's evidence section](./adr/0002-simulation-via-debug-tracecall.md#evidence-monad-mainnet-2026-07-06)
  for the list of endpoints that pass

### `pnpm install` errors with `EBADENGINE Unsupported engine`

Your Node version is too old. Moss pins Node ≥ 22 (the simulator's
`debug_traceCall` integration is tested against Node 22+). Install
Node 22:

```bash
nvm install 22 && nvm use 22
```

### `pnpm build` fails with `Cannot find module '.../dist/index.js'`

You ran a script (test, an example, the MCP server, etc.) before
`pnpm build`. Cross-package TypeScript imports resolve through `dist/`
artifacts — the typecheck step even depends on this. Always build
after a clean checkout and after editing source:

```bash
pnpm build && pnpm typecheck && pnpm test
```

### `pnpm typecheck` fails after source edits but `pnpm test` passes

Cross-package types resolve from built `dist/*.d.ts`, so a fresh edit
won't be visible to typecheck until you rebuild. `pnpm -r build`
first, then re-run `pnpm -r typecheck`. The order is enforced in CI
([CONTRIBUTING.md](../CONTRIBUTING.md)).

### `pnpm` itself is not installed

The repo's lockfile and `.npmrc` assume pnpm ≥ 11 (older versions don't
honor the `minimumReleaseAge: 1440` supply-chain guard in
`pnpm-workspace.yaml`):

```bash
npm i -g pnpm
pnpm -v   # should print 11.x or newer
```

## RPC & simulation

### Which Monad RPC should I use?

Default is `https://rpc.monad.xyz` (the free public endpoint). Roughly
half of third-party free tiers don't support `debug_traceCall`; see
[ADR 0002](./adr/0002-simulation-via-debug-tracecall.md#evidence-monad-mainnet-2026-07-06)
for the endpoints that have been verified to work. To override:

```bash
export MOSS_RPC_URL=https://your-rpc.example
```

`monadRuntime()` rejects any RPC whose reported chain ID is not `143`
— Moss is Monad-mainnet only.

### `debug_traceCall` returns "Method not found"

Your RPC doesn't expose the tracer. The simulator's design assumes
`debug_traceCall` is available — there is no fallback. Switch to a
working endpoint (see above) or run `pnpm test:offline` to skip the
live section.

### Simulation returns zero warnings — is the swap safe to sign?

**No.** Zero warnings means every verified Change on every transaction
in the Capability tree was consumed by its typed Receipt parser in
exact original order — i.e. the tree is *internally consistent*. It
does not mean the tree matches what the user asked for. The agent
must perform the second check: compare the Receipt text against the
user's stated intent. A swap whose Receipt reports `out` ≠ the
user's intended input, or `in` ≠ the user's intended output, must be
rejected even with zero warnings. See
[docs/agent-skill.md](./agent-skill.md) and
[ADR 0011](./adr/0011-capability-trees-and-exhaustive-receipts.md).

### Simulation reverts but I don't know why

The top-level revert reason from `debug_traceCall` is usually generic
("execution reverted"). The actual reason lives in the simulator's
`revertReason` field (`packages/simulator/src/index.ts`). If the
deeper reason is something like "selector not found" or "wrong
argument count", suspect a stale or hand-edited ABI — ABIs are
machine-generated per [ADR 0007](./adr/0007-abi-origin.md) for exactly
this reason.

### My Receipt shows raw addresses instead of names

Receipt text renders addresses through a three-tier label system
introduced in PR #98:

- **Trusted** — system-curated token declarations (e.g. `Trusted(WMON)`);
  supplied explicitly at composition time, never discovered from exports
- **Package** — fixed addresses declared in a Protocol's `labels` field
  (e.g. `Package(Kuru:Router)`); scoped to the Protocol and its declared
  dependencies
- **OnChain** — addresses whose token metadata was successfully queried
  during the current Registry lifetime

Precedence: Trusted > Package > OnChain > raw address. Labels affect
Receipt **text only**; structured Outcomes, data, Changes, and calldata
are unchanged. If a label is wrong or missing, verify the address
constants in your Protocol's `@Protocol` declaration and the
`trustedTokens` passed to `Registry`.

## ABI & provenance

### How do I fetch an ABI from the explorer?

Use the repository command. It calls the official Etherscan V2 ABI
endpoint for Monad mainnet (`chainid=143`), prints the complete verified
ABI as typed TypeScript, and stamps the public Monadscan source URL and
UTC retrieval date:

```bash
export MONADSCAN_API_KEY=…
pnpm fetch-abi 0x1b81D678ffb9C0263b24A97847620C99d213eB14 swapRouter \
  > packages/protocols/myprotocol/src/abis/swap-router.ts
```

The command writes TypeScript only to stdout and diagnostics only to
stderr. For repeatable regeneration, give the package an `update:abis`
script that drives `@themoss/abi-tools`' `fetchAbi` + `renderAbiModule`
from a committed source table, and pin the committed modules to the
renderer's exact output with a derivation test (see
[`packages/protocols/pancakeswap/scripts/`](../packages/protocols/pancakeswap/scripts/)
and [its `test/abis.test.ts`](../packages/protocols/pancakeswap/test/abis.test.ts)).

### What is `pnpm test:abi:online` and why does it fail?

Vendored ABIs have one authenticity anchor (the npm tarball). PR #108
added a second, independent anchor: the explorer-verified implementation
behind each proxy. `test:abi:online` re-fetches the deployed ABI from
the explorer and compares it semantically against the vendored artifact.
A mismatch means either the ABI is stale or the proxy has been upgraded.

The test requires the `MONADSCAN_API_KEY` environment variable. In CI,
the key is injected as a GitHub Actions secret; the ABI cross-check
workflow has no `pull_request` trigger, so fork PRs never receive the
secret and this test is not a fork-PR gate. Locally:

```bash
MONADSCAN_API_KEY=... pnpm test:abi:online
```

A failing cross-check does **not** block `pnpm test` — the offline suite
remains the only required gate. It signals that a human must re-verify
the ABI against the current on-chain source.

### What's the deal with ABI provenance?

[ADR 0007](./adr/0007-abi-origin.md) requires every ABI to be one of:

- **`compiled`** — generated from a foundry setup + a `gen:abis` script
  (e.g. the generic `erc20` / `erc721` ABIs in `@themoss/erc`);
- **`explorer`** — fetched from a verified-contract page on a block
  explorer, with the explorer URL and fetch date in a header, and a
  committed source table driving a repeatable `update:abis` script
  (e.g. PancakeSwap V3);
- **`vendored`** — committed full upstream artifacts with package version
  and tarball SHA, plus deterministic regeneration and a derivation test.

For vendored ABIs specifically, the ABI cross-check (`test:abi:online`)
adds a second anchor: `compareDeployedAbi()` from `@themoss/abi-tools`
semantically compares the committed ABI against the explorer-verified
implementation. ERC-1967 proxy addresses are resolved via
`erc1967ImplementationAddress()` (explorer `getabi` on a proxy returns
the proxy's own ABI). The Kuru adapter ships `abis.json` to pin expected
proxy targets and implementation addresses; a proxy upgrade turns the
cross-check red and forces human re-verification.

Hand-written ABIs and ad-hoc generation are rejected in review.

### My changeset isn't picked up by `pnpm version`

The repo's `changesets/config.json` `linked` list excludes
`@themoss/example-simple-flow`, `@themoss/example-agent-swap`, and
`@themoss/protocol-template`. If your package isn't
in the linked list, add it there (or open an issue) — changesets
only bumps packages in the `linked` group.

### How do I add Moss to Claude Code / Claude Desktop?

Moss runs as an MCP server over stdio. In `claude_desktop_config.json`
(Desktop) or `.mcp.json` (Code):

```jsonc
{
  "mcpServers": {
    "moss": {
      "command": "node",
      "args": ["<path-to-moss>/packages/mcp-server/dist/cli.js"],
      "env": { "MOSS_RPC_URL": "https://rpc.monad.xyz" }
    }
  }
}
```

Run `pnpm build` first so `dist/cli.js` exists. See
[docs/getting-started.md](./getting-started.md#10-use-the-mcp-server)
and [docs/agent-skill.md](./agent-skill.md) for the agent-side contract
(mandatory simulation, halt on warnings, intent alignment).

### The MCP server starts but `discover` returns nothing I expected

The MCP server passes selected `Protocol` classes to
`Registry.use(...)` directly in `packages/mcp-server/src/server.ts`.
A Protocol package is not auto-included — it must be added to that
composition root by the maintainer after the protocol's PR lands.
The current served list is in
[`README.md`'s Supported Protocols table](../README.md#supported-protocols). If a protocol you
expected is missing, open an issue against this repo.

### My new Protocol doesn't appear even after adding it

Protocol discovery scans **top-level exports** of the selected modules
([ADR 0010](./adr/0010-self-describing-protocols-and-zod-parameters.md)).
A `@Protocol` class exported as a named top-level binding is picked
up; one re-exported from a nested module, behind a default export, or
re-assigned to a different name is not. Also: a decorated Protocol
class cannot extend another decorated Protocol class — the Registry
rejects that inheritance.

## Contribution

### How do I add a new protocol adapter?

1. Copy `packages/protocols/_template` to
   `packages/protocols/<yourprotocol>`.
2. Follow the [protocol onboarding guide](./protocol-onboarding.md) and
   fill in the template's checklist (ABIs by origin, `@Protocol`
   class with declared dependencies, `@Capability` / `@Query` with
   `{ type, description }` zod parameters, typed `@Event` Receipts
   gated by `confirms`).
3. For the ABI: start with `pnpm fetch-abi <address> <name>` to bootstrap
   an explorer-tier module, then add a committed source table and
   `update:abis` script for repeatable regeneration. For vendored ABIs,
   ship a `test:abi:online` script so the ABI cross-check workflow
   verifies your committed artifact against the explorer-verified
   implementation.
4. The live e2e must assert zero warnings on a happy-path simulation
   against Monad mainnet. Without that assertion the PR won't be
   accepted.
4. The PR also needs to add the new package to the MCP server's
   `use(...)` call in `packages/mcp-server/src/server.ts` so it
   becomes part of the served catalog — that is the whole listing
   mechanism. Nothing else.

The full Definition of Done is in [CONTRIBUTING.md](../CONTRIBUTING.md).

### What's the deal with ABI provenance?

[ADR 0007](./adr/0007-abi-origin.md) requires every ABI to be one of:

- **`compiled`** — generated from a foundry setup + a `gen:abis` script,
- **`explorer`** — hand-pinned from a verified contract on a block
  explorer with the explorer URL and fetch date in a header, or
- **`vendored`** — from a published package, with a tarball SHA.

For vendored ABIs specifically, the ABI cross-check adds a second anchor:
`compareDeployedAbi()` from `@themoss/abi-tools` semantically compares
the committed ABI against the explorer-verified implementation. ERC-1967
proxy addresses are resolved via `erc1967ImplementationAddress()`
(explorer `getabi` on a proxy returns the proxy's own ABI). The Kuru
adapter ships `abis.json` to pin expected proxy targets; a proxy upgrade
turns the cross-check red and forces human re-verification. The
PancakeSwap adapter uses the explorer tier instead: a committed source
table drives a repeatable `update:abis` script that re-fetches the
verified ABI from the explorer and pins the renderer's exact output.

The Kuru adapter is the gold-standard example of `vendored`; the
generic `erc20` / `erc721` ABIs in `@themoss/erc` are `compiled`.
Pick the one that matches how you sourced the surface, and label the
origin in the ABI file's header. Hand-written ABIs and ad-hoc
generation are rejected in review.

### My changeset isn't picked up by `pnpm version`

The repo's `changesets/config.json` `linked` list excludes
`@themoss/example-simple-flow`, `@themoss/example-agent-swap`, and
`@themoss/protocol-template`. If your package isn't
in the linked list, add it there (or open an issue) — changesets
only bumps packages in the `linked` group.

## Security & trust

### Is Moss audited?

**No.** Moss is alpha software. The
[README](../README.md) warning at the top of the file is not a
formality — APIs, Capability shapes, and package layout may change
without notice. Read [SECURITY.md](../SECURITY.md) before trusting
simulation output with real decisions.

### Where do I report a vulnerability?

[SECURITY.md](../SECURITY.md) — please don't file public issues for
vulnerabilities.