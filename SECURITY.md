# Security

## The model

Moss builds and verifies transactions; it **never signs and never sends**. There are no keys anywhere in this codebase. The final gate is always the wallet and its user.

Within that boundary, Moss enforces a verification pipeline in front of every signature:

1. A capability's Plan carries **quantified expectations** (`expects`): which assets may leave (with maximums), which must arrive (with minimums), which approvals may be granted (token, spender, cap), and which NFT ids may leave or must arrive (with per-id ERC-1155 outflow caps). Risk labels classify the danger; expects bind it numerically ([ADR 0004](./docs/adr/0004-quantified-expects-in-plans.md)).
2. **Simulation** replays the unsigned transactions against live chain state via `debug_traceCall` (dual tracers, state chained across transactions and across plans — [ADR 0002](./docs/adr/0002-simulation-via-debug-tracecall.md)) and extracts actual effects: ERC-20/721/1155 transfers, approvals, operator grants, **native MON flows from call frames** (they emit no events), wrapped-native mints/burns.
3. **Effects reconciliation** warns on any *undeclared* difference: undeclared outflow, outflow above the declared max, undeclared or over-cap approval, unmet minimum inflow, undeclared NFT id or per-id ERC-1155 amount, missing NFT inflow, any NFT operator grant, plan tampering (`planHash` mismatch), reverts.
4. **The halt rule**: any warning means the transactions must not be handed to a signer. This is encoded in the MCP tool contract and the [agent skill guide](./docs/agent-skill.md).
5. **Intent alignment** stays with the agent: even a warning-free plan must be compared against what the user actually asked for. Moss cannot see the user's words; the agent must not skip this.

Simulation pre-funds the account with virtual balance (like `eth_simulateV1` with validation off): it answers *"what would this plan do"*, not *"can the account afford it"* — affordability is re-checked by the wallet at signing time.

## Boundaries (v1) — deliberately unsupported

- **Permit / EIP-2612 / typed-data signature flows.** Plans contain transactions only. A future `steps` extension may add sign-typed-data steps (still never signed by Moss).
- **Cross-chain bridging.** Destination-chain effects cannot be verified by simulation; "declared" could never become "verified".
- **Flash loans / atomic multi-protocol composition inside one transaction.** Requires deployed executor contracts, outside the "agent assembles transactions" model. Multi-*transaction* composition is supported and verified via chained simulation.

6. **Token identity is catalog-resolved.** Symbols ("USDC") resolve only against the curated well-known token catalog — never via on-chain `symbol()` lookups, which same-symbol scam tokens spoof trivially. Unknown symbols fail loudly; out-of-catalog tokens require an explicit address ([ADR 0005](./docs/adr/0005-curated-token-catalog.md)).

## Known caveats

- Simulation runs against **latest** state; the chain moves. A plan that simulated clean can still land differently (e.g. orderbook fills). On-chain protections (like `minAmountOut`) are therefore part of every plan the adapters build — the simulation is a preview, the on-chain check is the guarantee.
- `debug_traceCall` availability varies by RPC provider. When unavailable, Moss fails loudly with endpoint suggestions — it never silently skips simulation.
- Protocol contracts may be upgradeable proxies (Kuru's are). Adapters pin behavior with live e2e tests, but upgrades between releases can change semantics.

## Reporting a vulnerability

Please use GitHub **private vulnerability reporting** on this repository (Security → Report a vulnerability). Do not open public issues for security reports. We aim to acknowledge within 72 hours.
