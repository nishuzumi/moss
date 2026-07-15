# Moss Protocol package template

This package is being migrated to the accepted self-describing Protocol contract. Copy it only after its source matches the checklist below.

## Checklist

- [ ] Rename the package and replace all placeholder Protocol metadata.
- [ ] Put every ABI in `src/abis/` with a compiled, explorer, or vendored origin header. Vendored output must be the full upstream artifact.
- [ ] Record a canonical source for every fixed address and add bytecode and metadata checks.
- [ ] Export public `@Protocol` classes directly from `src/index.ts`; do not add a separate registration object or import side effect.
- [ ] Declare Protocol dependencies explicitly and use injected typed instances for cross-Protocol Capabilities and Queries.
- [ ] Define each Capability and Query field as `{ type, description }` with a context-free Zod value contract and field-specific purpose.
- [ ] Give every Capability exactly one direct TransactionNode and one typed Receipt parser. Put additional transactions in nested Capabilities.
- [ ] Make every Receipt parser pure and preserve exact Change object identity, length, and order.
- [ ] Add positive and `@ts-expect-error` negative compile-time fixtures.
- [ ] Add unit tests for metadata, tree validation, Receipt coverage, and failure cases.
- [ ] Add a live Monad-mainnet happy-path simulation with zero Warnings.
- [ ] Export only stable Protocols from the package entry point; experimental classes stay internal.

Read [Protocol onboarding](../../../docs/protocol-onboarding.md), [CONTEXT.md](../../../CONTEXT.md), and the current ADRs before writing source.
