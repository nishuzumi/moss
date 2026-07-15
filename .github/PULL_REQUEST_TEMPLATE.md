## Motivation

<!-- What user or Protocol problem does this solve? -->

## Framework impact

<!-- Public contracts, package boundaries, Capability tree, Change/Receipt behavior. -->

## Verification

- [ ] Every Capability owns exactly one direct TransactionNode and one typed Receipt
- [ ] Every parameter separates its context-free Zod type from its field description
- [ ] Receipt tests retain every original Change object in exact length and order
- [ ] Positive and `@ts-expect-error` fixtures cover exported type behavior
- [ ] Fixed addresses and ABIs have provenance and verification
- [ ] `pnpm build`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`

<!-- Include relevant test output and, for live behavior, ordered Receipt outcomes. -->
