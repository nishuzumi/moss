# Moss

**English** | [中文](./README.zh-CN.md)

Moss turns complex interactions on Monad into protocol-owned, Agent-callable Capabilities through one flow: `discover → load → action → simulate`. Moss builds and verifies unsigned transactions; it never signs or sends them.

> [!WARNING]
> Moss is alpha software and has not been audited. Do not use it with production funds.

## Framework contract

- `discover` finds Capabilities and Queries by protocol coordinates and user-facing semantics.
- `load` returns intent, risk, and a JSON-safe parameter contract. Reusable value semantics and field-specific descriptions remain separate.
- `action` executes a Query or returns one root Capability tree for a write.
- `simulate` executes that tree against Monad state and returns verified Receipts for successful transactions.

Every Capability owns exactly one direct unsigned transaction and exactly one typed Receipt parser. Additional transactions belong to nested Capabilities, so core can validate and flatten the whole tree in deterministic depth-first order.

Simulation records every successful raw Event and native MON transfer in exact execution order. The owning Protocol parses those immutable Changes into a structured Receipt; core accepts the result only when the original Change objects are covered once, in the same order. A revert, parse failure, missing Outcome, reordered Change, or uncovered Change is a Warning, and any Warning stops the flow.

Receipt text is presentation only. The structured Outcome is what an Agent compares with the user's original request before anything reaches a signer.

## Protocol composition

A Protocol package's registration surface is its top-level self-describing `@Protocol` class exports. The composition root chooses module namespaces; Registry scans those exports, ignores ABIs and helpers, recursively registers declared Protocol dependencies, and injects typed instances without import-time registration.

Cross-Protocol writes call an injected Capability and become nested Capability nodes. Cross-Protocol Queries execute directly. Fixed Monad constants live in `@themoss/system`; dynamic token and pool addresses come from chain state. Capability inputs use explicit token addresses or `native`, never symbols.

Moss v1 targets Monad mainnet only. Runtime accepts an RPC endpoint, verifies that it reports chain ID `143`, and rejects every other chain; chain identity is not repeated in Protocol metadata, address constants, or Capability nodes.

## Package boundaries

| Package | Responsibility |
| --- | --- |
| `@themoss/core` | Decorators, Registry, framework types, Capability-tree and Receipt validation |
| `@themoss/simulator` | `debug_traceCall`, state chaining, ordered Change extraction, Receipt dispatch |
| `@themoss/erc` | Address-free standard ABIs, ERC Protocols, and ERC Receipt semantics |
| `@themoss/system` | Monad Runtime, verified official constants, and Monad system Protocols |
| `@themoss/protocol-*` | Protocol ABIs, Capabilities, Queries, dependencies, and Receipts |
| `@themoss/mcp-server` | MCP transport and application composition only |

Adding a Protocol changes its package and the explicit composition root, not core, simulator, or the generic MCP server.

## Development

Requires Node 22 or newer and pnpm 11.

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Runnable examples:

- `pnpm --filter @themoss/example-simple-flow wrap`
- `pnpm --filter @themoss/example-simple-flow swap`
- [`examples/agent-swap`](./examples/agent-swap) for a separate Agent/signer flow on a local Monad fork

## Documentation

- [Getting started](./docs/getting-started.md) ([中文](./docs/getting-started.zh-CN.md))
- [MCP tool contracts](./docs/mcp-tools.md)
- [Protocol onboarding](./docs/protocol-onboarding.md)
- [Agent safety rules](./docs/agent-skill.md)
- [Architecture decisions](./docs/adr/)
- [Domain language](./CONTEXT.md)
- [Security model](./SECURITY.md)

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the current ADRs before changing an exported contract. Protocol additions start from [`packages/protocols/_template`](./packages/protocols/_template).

## License

[MIT](./LICENSE)
