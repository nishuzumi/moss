# Getting started — from zero to a verified swap

**English** | [中文](./getting-started.zh-CN.md)

This guide walks you through Moss one layer at a time. You will run the full
flow first, then open each stage up — discover, load, action, simulate,
observations — and finish by wiring an agent and sketching your own adapter.
Everything runs against **live Monad mainnet with zero funds and zero keys**:
Moss never signs and never sends, and simulation is free.

Each step ends with **Go deeper** pointers. Skim them on the first pass; come
back when you need the "why".

## 0. Setup (5 minutes)

Requires Node ≥ 22 and pnpm.

```bash
git clone https://github.com/nishuzumi/moss && cd moss
pnpm install
pnpm build
```

Prove the toolchain without touching the network:

```bash
MOSS_SKIP_E2E=1 pnpm test
```

Every package's offline tests should pass. (Without the env var, the suite
also runs live mainnet e2e — free, but it needs an RPC that supports
`debug_traceCall`; the default `https://rpc.monad.xyz` does.)

## 1. Run the whole flow once

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

You just watched the canonical four-step flow — wrapping 1.5 MON into WMON:

1. `discover` found which protocol can `wrap`
2. `load` fetched how to call it
3. `action` built a **Plan** — unsigned transactions plus declared expectations
4. `simulate` replayed it on real chain state and reconciled the results

The last line is the point of the whole system:

```
✓ No warnings — the unsigned txs may be handed to a wallet for review.
```

Now let's take those four steps apart. Create a scratch file to follow along
(`examples/simple-flow/src/play.ts`, run with
`pnpm --filter @themoss/example-simple-flow exec tsx src/play.ts`):

```ts
import { Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";

const runtime = monadRuntime();
const registry = new Registry(runtime);
for (const m of [systemManifest, ercManifest, kuruManifest]) registry.use(m);
```

Note what just happened: the registry started **empty** and you chose what to
assemble. Nothing in Moss registers itself by being imported.

## 2. discover — what's on the shelf

```ts
console.log(registry.discover({ verb: "swap" }));
```

```jsonc
[{ "protocol": "kuru", "method": "swap", "kind": "capability",
   "verb": "swap", "category": "dex", "tags": ["clob"], "summary": "…" }]
```

Two vocabularies are at work:

- **verb** — the user-perspective fund action, from a small closed set
  (`swap`, `wrap`, `supply`, `transfer`, …). Never a protocol's function
  name: WMON's `deposit()` is verb `wrap`.
- **tags** — free-form long-tail semantics (`clob` tells you this DEX is an
  orderbook, not an AMM).

Try `discover({ verb: "transfer" })` — served three times, by the generic `erc20`
protocol (any token), the generic `erc721` protocol (any NFT collection), and
the generic `erc1155` protocol (any multi-token collection).
Try `discover({})` to see the whole catalog.

**Go deeper:** [mcp-tools.md](./mcp-tools.md#discover) · verb/category design:
[ADR 0003](./adr/0003-two-tier-capability-taxonomy.md)

## 3. load — the calling contract

```ts
console.log(registry.load([{ protocol: "kuru", method: "swap" }]));
```

The stub tells a caller (human or agent) everything needed to call correctly:
the intent template, each parameter's semantics, and the declared risk labels
(`fundOut`, `approval`, `priceImpact`).

Read one parameter description closely — e.g. `amount`: *"A human-decimal
amount of the token in `tokenIn` (e.g. \"1.5\"). Do not pre-scale."* That is a
**semantic type**: you pass `"1.5"`, and the runtime resolves the token's
decimals and scales it. Token parameters take well-known symbols (`"MON"`,
`"USDC"`), a `0x` address, or `"native"` — symbols resolve only through the
curated catalog, never from on-chain names (which scam tokens spoof).

**Go deeper:** semantic types: `packages/core/src/semantics.ts` · symbol
safety: [ADR 0005](./adr/0005-curated-token-catalog.md)

## 4. action — build a Plan

```ts
const ACCOUNT = "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC"; // any address — no keys needed
const plan = await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: "MON", tokenOut: "USDC", amount: "1",
});
console.log(plan.intent, plan.expects, plan.txs);
```

A **Plan** is the contract between the protocol and everyone downstream:

- `txs` — the unsigned transactions, fully encoded (calldata, value)
- `expects` — the quantified promise: at most 1 MON leaves (`out.amountMax`),
  at least the quoted USDC arrives (`in.amountMin`), approvals capped
  exactly at the spend
- `intent` + `declaredRisk` — what the plan claims to be, in words
- `planHash` — integrity seal over `{chainId, account, txs, expects, confirms}`
- `confirms` — on-chain receipts this write must produce (step 6)

Build the reverse swap (`tokenIn: "USDC"`) and notice `txs` now has **two**
entries: an `approve` step appeared, and `expects.approvals` declares it —
capped at exactly the amount spent, never unlimited.

**Go deeper:** [ADR 0004](./adr/0004-quantified-expects-in-plans.md) — why
expects are the safety contract

## 5. simulate — the verification gate

```ts
const simulator = createTraceSimulator(runtime);
const { results } = await simulator.simulate([plan]);
console.log(results[0]?.effects, results[0]?.warnings);
```

The simulator replays the plan's transactions on **live chain state** via
`debug_traceCall` and extracts what actually happened — every asset flow
(including native MON and wrapped mint/burn, which emit no Transfer events),
every approval, every recipient. Then it reconciles reality against the
plan's `expects`: **any undeclared difference becomes a warning**, and any
warning means stop.

Two experiments worth running:

- **Tamper with the plan** — edit `plan.txs[0].value` and simulate again:
  `PLAN_TAMPERED`. The plan travels agent-side; integrity is re-derived, not
  trusted.
- **Chain plans** — pass `[sellPlan, buyBackPlan]` in one call: plan B runs
  on plan A's simulated state, so it can spend USDC the account only holds
  inside the simulation. That is how multi-step flows (claim → swap → supply)
  are verified end to end. Run `pnpm --filter @themoss/example-simple-flow
  swap` to watch a MON → USDC → MON round-trip do exactly this.

**Go deeper:** [mcp-tools.md](./mcp-tools.md#simulate) — warning codes ·
[ADR 0002](./adr/0002-simulation-via-debug-tracecall.md) — why debug_traceCall

## 6. observations — protocol receipts

Reconciliation speaks in token flows. Protocols can also narrate in their own
terms. Wire the observer and simulate a swap:

```ts
const observing = createTraceSimulator(runtime, { observer: registry.observer() });
const { results } = await observing.simulate([plan]);
console.log(results[0]?.observations);
// [{ protocol: "kuru", name: "swapResult",
//    intent: "Swapped 1 MON into 0.0239 USDC on Kuru (3 fills)", data: {…} }]
```

That sentence was authored by the Kuru adapter with `@Event`: after
simulation, the plan's logs are decoded against the protocol's ABIs and
rendered into a human receipt. Because the swap capability declares
`confirms: ["swapResult"]`, a swap whose receipt fails to appear raises a
`CONFIRMATION_MISSING` warning — the receipt is load-bearing.

One rule to internalize: observations are **narrative, not law**. They can
tighten the outcome (via `confirms`) but can never silence a warning.

**Go deeper:** [ADR 0008](./adr/0008-observation-plane.md) — the two-plane
design

## 7. Drive it from an agent

Everything you just did by hand is exposed as four MCP tools. Point an MCP
client (Claude Desktop, Claude Code, …) at the server:

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

Then ask the agent something like *"quote 1 MON in USDC on Monad"* and watch
it walk discover → load → action → simulate. The tool descriptions embed the
safety rules; the full agent-side contract (mandatory simulation, the halt
rule, intent alignment) is in [agent-skill.md](./agent-skill.md).

**Go deeper:** [mcp-tools.md](./mcp-tools.md) — the four tool contracts

## 8. Write your own adapter

You now know everything an adapter must produce. Scaffold one:

```bash
cp -r packages/protocols/_template packages/protocols/<yourprotocol>
```

The template is a real CI-built package — if you copied it, it compiles — and
its README is a checklist. The shape you'll fill in:

1. **ABIs** with a documented origin (compiled / explorer / vendored)
2. **`@Protocol`** — contracts + verified addresses
3. **`@Capability`** — semantic params, quantified expects, honest risk labels
4. **`@Event`** — the receipt your write produces, gated by `confirms`
5. **Tests** — offline shapes + a live zero-warning e2e

Reference implementations, in reading order:
[`packages/system/src/wmon.ts`](../packages/system/src/wmon.ts) (deliberately
over-commented), [`packages/erc`](../packages/erc) (dynamic addresses),
[`packages/protocols/kuru`](../packages/protocols/kuru) (reads-before-build,
vendored ABIs, observations).

**Go deeper:** [protocol-onboarding.md](./protocol-onboarding.md) — the full
guide, section by section · [CONTRIBUTING.md](../CONTRIBUTING.md) — the
Definition of Done your PR is reviewed against

## The map

| Layer | Package | One-line charter |
| --- | --- | --- |
| machinery | `@themoss/core` | decorators, Plans, Registry — zero chain data |
| verification | `@themoss/simulator` | trace simulation + effects reconciliation |
| interfaces | `@themoss/erc` | compiled standard ABIs + address-free generic adapters (erc20, erc721, erc1155) |
| instances | `@themoss/system` | Monad token table, chain defaults, WMON |
| protocols | `@themoss/protocol-*` | one package per protocol |
| product | `@themoss/mcp-server` | the four tools, batteries included |

Why it is layered this way: [ADR 0006](./adr/0006-protocol-packages-and-manifests.md)
and [ADR 0009](./adr/0009-erc-interface-layer-and-composition.md). Every other
design decision lives in [docs/adr/](./adr/); the project's vocabulary lives
in [CONTEXT.md](../CONTEXT.md).
