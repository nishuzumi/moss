# New framework migration

The accepted target is defined by `CONTEXT.md`, ADR 0010, and ADR 0011. Completed historical implementation notes were removed because they describe a superseded architecture.

## Documentation

- [x] Record the self-describing Protocol, package-boundary, parameter, Capability-tree, Change, and Receipt decisions.
- [x] Add Codex review rules for public types, compile-time fixtures, architecture boundaries, chain identity, and fixed addresses.
- [x] Remove superseded ADRs and update public, contributor, Agent, and template documentation.

## Core

- [ ] Add reusable Zod Parameter types, `{ type, description }` declarations, inference helpers, and JSON-safe schema generation.
- [ ] Add self-describing Protocol metadata, top-level module registration, recursive dependency injection, and runtime validation.
- [ ] Add CapabilityNode, TransactionNode, Change, ReceiptChange, and typed Receipt contracts.
- [ ] Enforce exactly one direct transaction and one valid Receipt binding per Capability.
- [ ] Add positive and negative compile-time fixtures for exported decorators and inference.
- [ ] Remove superseded authoring, catalog, observation, and reconciliation modules after all callers migrate.

## Simulator

- [ ] Extract ordered Event and native-transfer Changes in one recursive call-tree pass using trace positions.
- [ ] Exclude failed frame subtrees and include positive-value `SELFDESTRUCT` transfers.
- [ ] Dispatch pure Receipt parsers and verify exact Change identity, length, and order.
- [ ] Preserve earlier Receipts, report diagnostics, and halt after a reverted transaction.
- [ ] Remove protocol ABI interpretation and generic semantic summaries from the simulator.

## Protocol packages

- [ ] Migrate ERC, system, Kuru, and the package template to self-describing exports and declared dependencies.
- [ ] Move fixed Monad constants and their verification into system; keep ERC address-free.
- [ ] Replace protocol event narration with typed pure Receipts and structured Outcomes.
- [ ] Update ABI generation to use complete vendored artifacts.

## MCP and examples

- [ ] Make the generic server accept Runtime and selected Protocol module namespaces at the composition root.
- [ ] Expose JSON-safe load, action, and simulate contracts without duplicating core validation.
- [ ] Reject an RPC whose reported chain ID is not `143`; remove configurable target-chain input.
- [ ] Migrate examples and wallet handoff only after the new public contracts compile and pass simulation tests.

## Release gate

- [ ] `pnpm build`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] Review all exported types and run a final Standards + Spec code review.
