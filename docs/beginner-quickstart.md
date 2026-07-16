# Beginner quickstart

This page is for first-time Moss readers who want the shortest path from
"what is this?" to "I ran one verified flow." It does not replace
[Getting started](./getting-started.md); use this page as the pre-flight
checklist, then open the deeper guide when you want to inspect each layer.

## What you are about to run

Moss turns protocol actions into a four-step agent workflow:

```text
discover -> load -> action -> simulate
```

- `discover` lists the capabilities Moss currently serves.
- `load` explains how to call one capability correctly.
- `action` builds unsigned transactions plus declared expectations.
- `simulate` replays those unsigned transactions and reports warnings before
  anything reaches a signer.

Moss builds and verifies transactions. It never signs and never sends them.

## Requirements

- Node.js 22 or newer
- pnpm 11 or newer
- Git
- Internet access for package installation
- An RPC endpoint that supports `debug_traceCall` for live simulation

The default Monad RPC used by the examples is enough for the first pass. No
private key, wallet, or funds are needed for the commands below.

## First run

Clone, install, and build:

```bash
git clone https://github.com/nishuzumi/moss
cd moss
pnpm install
pnpm build
```

Run the offline test suite first. This checks the local toolchain without
requiring live-chain simulation:

```bash
MOSS_SKIP_E2E=1 pnpm test
```

Then run the smallest end-to-end example:

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

You should see the flow end with no warnings. That means Moss built unsigned
transactions and simulation did not find undeclared effects. It does not mean a
future signed transaction is guaranteed to execute at the same price or state.

## If something fails

### `pnpm` is not available

Install pnpm, then rerun `pnpm install`:

```bash
npm i -g pnpm
```

### The build cannot resolve workspace packages

Run `pnpm build` before `pnpm typecheck`. The packages depend on each other's
compiled `dist` types.

### Live simulation fails

Use `MOSS_SKIP_E2E=1 pnpm test` to separate local build issues from RPC issues.
If only live simulation fails, check that your RPC endpoint supports
`debug_traceCall`.

### You see warnings during simulation

Stop. Warnings are Moss's safety gate. Read the warning before handing any
transaction to a wallet.

## What to read next

- [Getting started](./getting-started.md) walks the full system one layer at a
  time.
- [MCP tools reference](./mcp-tools.md) documents `discover`, `load`, `action`,
  and `simulate`.
- [Agent skill guide](./agent-skill.md) explains the rules an agent must follow:
  simulate before signing, halt on warnings, and align effects with user intent.
- [Protocol onboarding](./protocol-onboarding.md) is the adapter authoring path.

## Quick glossary

| Term | Meaning |
| --- | --- |
| Capability | A protocol action exposed in user-facing terms, such as `wrap`, `transfer`, or `swap`. |
| Query | A read-only protocol method, such as a balance or quote lookup. |
| Plan | The unsigned transaction bundle and declared expectations returned by `action`. |
| Expects | What the plan declares may leave, must arrive, or may be approved. |
| Simulation | A `debug_traceCall` replay that extracts what would actually happen. |
| Warning | A mismatch or risk discovered during simulation. Any warning means stop. |
| MCP server | The process that exposes Moss's workflow as tools for an agent client. |
