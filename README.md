# Moss

**English** | [中文](./README.zh-CN.md)

Moss turns complex DApp/protocol interactions on [Monad](https://monad.xyz) into uniform, agent-callable capabilities — `discover → load → action → simulate` — with the system, not the agent, responsible for assembling correct transactions.

- **Agents stop hand-rolling calldata.** No ABIs, no contract addresses, no multicall/cleanup plumbing, no decimals arithmetic — capabilities take human-readable parameters and return ready-built unsigned transactions.
- **Every write is verified before it reaches a signer.** A built Plan declares exactly what may move (`expects`); simulation replays it against live chain state and warns on any undeclared difference.
- **Moss never signs and never sends.** It builds and verifies. Keys stay in the wallet; the last word stays with the user.

## Why

Consider a "simple" swap on a typical DEX: router addresses, exact-in vs exact-out variants, wrapping and unwrapping the native token, refund and sweep cleanup calls, slippage math in the right decimals. An agent that assembles this by reading ABIs will eventually get one of those wrong — and an agent-built transaction that is *almost* right is how funds get lost.

Moss moves that complexity behind a uniform capability layer maintained per protocol, and adds a mechanical safety gate in front of every signature.

## Core flow

```
discover(verb?, category?)   → find capabilities across protocols
load(coordinates)            → intent, parameters, risk labels
action(protocol, method,     → queries: data
       account, params)      → capabilities: a Plan of UNSIGNED txs + declared expects
simulate(plans[])            → actual effects + warnings (declared vs actual reconciliation)
```

Two safety rules, enforced in different places:

1. **Effects reconciliation** (in the server, mechanical): simulation extracts what actually happens — assets out/in, approvals, recipients, including native MON flows and wrapped-token mints that emit no Transfer events — and warns on anything the Plan didn't declare. Any warning: stop.
2. **Intent alignment** (in the agent): compare the effects summary against what the user actually asked for. Only the agent holds the user's words.

`simulate` accepts an ordered list of Plans and chains state across them — plan B can spend tokens that only exist because plan A produced them. That is the primitive multi-step flows (claim → swap → supply) build on.

## Status

Alpha. Monad mainnet (chain id 143). Moss builds and simulates transactions; it never signs or sends them.

| Protocol | Package | Capabilities | Queries |
| --- | --- | --- | --- |
| WMON (canonical wrapped MON) | `@mossxyz/system` | `wrap`, `unwrap` | `balanceOf` |
| erc20 (generic — any token, native MON included) | `@mossxyz/erc` | `transfer` | `balanceOf`, `allowance` |
| [Kuru](https://kuru.io) (on-chain CLOB DEX) | `@mossxyz/protocol-kuru` | `swap` (market orders, MON/USDC & MON/AUSD) | `quote`, `markets` |

One protocol = one package. Registries assemble explicitly from package manifests — nothing registers itself by import; the MCP server lists its served catalog in one array in `server.ts` ([ADR 0006](./docs/adr/0006-protocol-packages-and-manifests.md)).

Not supported yet, by design: Permit/typed-data signature flows, cross-chain bridging (destination-chain effects are unverifiable by simulation), flash-loan atomic composition. See [SECURITY.md](./SECURITY.md).

## Quickstart

Requires Node ≥ 22 and pnpm. Everything below runs with **zero funds and zero keys** — simulation is free.

```bash
git clone https://github.com/nishuzumi/moss && cd moss
pnpm install
pnpm build

# the canonical flow: discover → load → action → simulate
pnpm --filter @mossxyz/example-simple-flow wrap

# cross-plan composition on a live orderbook: MON → USDC → MON
pnpm --filter @mossxyz/example-simple-flow swap
```

New here? [docs/getting-started.md](./docs/getting-started.md) walks the whole
system one layer at a time — run first, then open each stage up.

### Use as an MCP server

```jsonc
// e.g. in your MCP client config
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

The agent gets four tools: `discover`, `load`, `action`, `simulate`. Tool descriptions encode the safety rules; the full agent-facing contract is in [docs/agent-skill.md](./docs/agent-skill.md).

> The default endpoint `https://rpc.monad.xyz` supports the `debug_traceCall` simulation Moss needs. Roughly half of third-party free tiers do not — if simulation fails loudly, switch endpoints (see [ADR 0002](./docs/adr/0002-simulation-via-debug-tracecall.md)).

### Use as a library

```ts
import { Registry } from "@mossxyz/core";
import { erc20MetadataSource, ercManifest } from "@mossxyz/erc";
import { kuruManifest } from "@mossxyz/protocol-kuru";
import { createTraceSimulator } from "@mossxyz/simulator";
import { monadRuntime, systemManifest } from "@mossxyz/system";

const runtime = monadRuntime();
const registry = new Registry(runtime, { tokenFallback: erc20MetadataSource(runtime.client) });
for (const m of [systemManifest, ercManifest, kuruManifest]) registry.use(m); // only what you want

const plan = await registry.action("kuru", "swap", account, {
  tokenIn: "MON", tokenOut: "USDC", amount: "1",  // symbols resolve via the curated catalog
});
const { results } = await createTraceSimulator(runtime).simulate([plan]);
// results[0].effects, results[0].warnings
```

## Repository layout

Machinery at the bottom, standards above it, instances above that, the product surface at the top — each package boundary keeps a dependency out of somewhere it doesn't belong ([ADR 0006](./docs/adr/0006-protocol-packages-and-manifests.md)):

| Package | Role | Depends on |
| --- | --- | --- |
| `@mossxyz/core` | Pure machinery — zero chain data, zero ABIs. Only dependency: viem | — |
| `@mossxyz/simulator` | The verification engine: `debug_traceCall` simulation, effects extraction, expects reconciliation | core |
| `@mossxyz/erc` | The interface layer: compiled standard ABIs (`ERC20Abi`, `WETH9Abi`), address-free generic behavior (`erc20` protocol, `approveStep`) — [ADR 0009](./docs/adr/0009-erc-interface-layer-and-composition.md) | core |
| `@mossxyz/system` | Monad instances: token data, chain defaults (`monadRuntime`), address-bearing system adapters (WMON) | core, erc |
| `@mossxyz/protocol-*` | One package per protocol (`packages/protocols/*`; start from `_template`) | core (+ erc/system as needed) |
| `@mossxyz/mcp-server` | The four MCP tools over stdio, batteries included — assembles the served catalog itself | all of the above |

## Contributing

Protocol adapters are the heart of Moss and are designed to be contributed — one protocol, one package. Copy the self-verifying template ([`packages/protocols/_template`](./packages/protocols/_template)) and follow its checklist; the reference adapter is [`packages/system/src/wmon.ts`](./packages/system/src/wmon.ts) (deliberately over-commented). Full guide: [docs/protocol-onboarding.md](./docs/protocol-onboarding.md); workflow: [CONTRIBUTING.md](./CONTRIBUTING.md).

Want a protocol supported but don't want to write it? Open a [protocol onboarding issue](./.github/ISSUE_TEMPLATE/protocol_onboarding.md).

## Security

Moss's guarantees, boundaries, and how to report vulnerabilities: [SECURITY.md](./SECURITY.md). Design decisions with their trade-offs are recorded in [docs/adr/](./docs/adr/).

## License

[MIT](./LICENSE)
