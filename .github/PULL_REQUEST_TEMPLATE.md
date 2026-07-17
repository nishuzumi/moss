## What and why

<!-- What does this PR change, and what user or Protocol problem does it solve? Link the issue when one exists. -->

## Type of change

- [ ] Protocol / Capability / Query
- [ ] Core / simulator / MCP server
- [ ] Bug fix
- [ ] Documentation / example
- [ ] Tooling / dependency

## Framework and package impact

<!-- Public types, package boundaries, Capability tree, Change/Receipt behavior, or "none". -->

## Verification

- [ ] `pnpm build`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] If live Monad RPC is unavailable: `pnpm test:offline`, with skipped live checks noted
- [ ] User-facing package changes include a changeset
- [ ] Docs and examples match the implemented API

### Protocol changes

<!-- Mark N/A for non-Protocol PRs. -->

- [ ] Parameters separate reusable Zod value types from field-purpose descriptions
- [ ] Every Capability owns one direct TransactionNode and one typed Receipt
- [ ] Receipt tests preserve every original Change object in exact length and order
- [ ] Positive and `@ts-expect-error` fixtures cover exported type behavior
- [ ] Fixed addresses and ABIs include sources and verification
- [ ] A live Monad happy path returns zero Warnings

## Evidence

<!-- Relevant output, structured Receipt Outcomes, screenshots, or reproduction steps. -->
