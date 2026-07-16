# Moss

**English** | [中文](./README.zh-CN.md)

Moss turns Monad protocol interactions into Agent-callable Capabilities through `discover → load → action → simulate`. It builds and verifies unsigned transactions; it never signs or sends them.

> [!WARNING]
> Moss is unaudited alpha software. Do not use it with production funds.

## Why Moss

- **Agents call Protocol-owned operations.** Protocol packages own addresses, ABIs, calldata construction, parameter rules, and Receipt parsing.
- **Simulation produces evidence.** Each successful transaction yields ordered raw Changes and a structured Receipt that must cover every Change exactly once and in order.
- **Signing stays separate.** MCP Agents compare every ordered Receipt text with the user's request; SDK consumers may use structured Outcomes before a wallet sees the unsigned transactions.

## Supported Protocols

Moss currently targets Monad mainnet, chain ID `143`.

| Protocol | Package | Capabilities | Queries |
| --- | --- | --- | --- |
| WMON | `@themoss/system` | `wrap`, `unwrap` | `balanceOf` |
| ERC-20 and native MON | `@themoss/erc` | `transfer`, `approve` | `balanceOf`, `allowance`, `metadata` |
| ERC-721 | `@themoss/erc` | `transfer` | `ownerOf`, `balanceOf` |
| ERC-1155 | `@themoss/erc` | `transfer` | `balanceOf`, `isApprovedForAll`, `uri` |
| Kuru | `@themoss/protocol-kuru` | `swap` | `quote` |

## Quickstart

Requires Node 22 or newer and pnpm 11. The examples use live Monad state but need no key or funded account because Moss only simulates.

```bash
git clone https://github.com/nishuzumi/moss
cd moss
pnpm install
pnpm build

# discover → load → action → simulate a WMON wrap
pnpm --filter @themoss/example-simple-flow wrap

# quote and simulate a Kuru MON → USDC swap
pnpm --filter @themoss/example-simple-flow swap
```

Run the test suite without live RPC calls:

```bash
MOSS_SKIP_E2E=1 pnpm test
```

The full tutorial is [Getting started](./docs/getting-started.md). It opens every stage, configures MCP, and finishes by creating a Protocol package.

### Use as an MCP server

Build the repo, then add the stdio server to an MCP client:

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

The server exposes exactly `discover`, `load`, `action`, and `simulate`. See [MCP tool contracts](./docs/mcp-tools.md).

### Use as a library

```ts
import { NATIVE, Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";

const runtime = await monadRuntime();
const registry = new Registry(runtime).use(system, erc, kuru);
const account = "0xcccccccccccccccccccccccccccccccccccccccc";
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});

const result = await registry.action("kuru", "swap", account, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  slippage: 50,
});
if (result.kind !== "capability") throw new Error("expected a Capability");

const simulation = await simulator.simulate(result);
if (simulation.halted || simulation.results.some((item) => item.warnings.length)) {
  throw new Error("simulation failed; do not sign");
}
```

## How verification works

Every Capability owns one direct unsigned transaction and one named typed Receipt parser. Additional transactions belong to nested Capabilities, which core validates and flattens in deterministic depth-first order.

Simulation records successful Events and native MON transfers as immutable Changes in exact execution order. Receipt leaves must retain the original Change objects with identical length and order.

Any revert, trace failure, Receipt failure, or coverage mismatch is a terminal Warning. The library exposes complete Receipt trees and structured Outcomes; MCP returns only their verified ordered leaf texts and Warnings to Agents.

## Repository layout

| Package | Responsibility |
| --- | --- |
| `@themoss/core` | Decorators, Registry, parameter contracts, Capability trees, Receipt validation |
| `@themoss/simulator` | `debug_traceCall`, state chaining, ordered Change extraction |
| `@themoss/erc` | Address-free ERC Protocols, ABIs, and Receipt semantics |
| `@themoss/system` | Monad Runtime, official constants, and system Protocols |
| `@themoss/protocol-*` | Protocol-specific ABIs, Capabilities, Queries, and Receipts |
| `@themoss/mcp-server` | MCP transport and application composition |

## Development

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Build must precede typecheck because workspace packages resolve generated declarations. Use `MOSS_SKIP_E2E=1 pnpm test` when offline.

## Documentation

| Guide | Purpose |
| --- | --- |
| [Getting started](./docs/getting-started.md) ([中文](./docs/getting-started.zh-CN.md)) | Run and develop with Moss step by step |
| [MCP tool contracts](./docs/mcp-tools.md) | Inputs and outputs of the four MCP tools |
| [Protocol onboarding](./docs/protocol-onboarding.md) | Build and submit a Protocol package |
| [Agent safety rules](./docs/agent-skill.md) | Mandatory simulation and intent-alignment rules |
| [Agent swap example](./examples/agent-swap/README.md) | Separate Agent and signer on a local Monad fork |
| [Architecture decisions](./docs/adr/) | Current design decisions and trade-offs |
| [Domain language](./CONTEXT.md) | Shared framework vocabulary |

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md). Protocol additions start from [`packages/protocols/_template`](./packages/protocols/_template) and follow [Protocol onboarding](./docs/protocol-onboarding.md).

## Security

Read [SECURITY.md](./SECURITY.md) for guarantees, limits, and private vulnerability reporting.

## License

[MIT](./LICENSE)
