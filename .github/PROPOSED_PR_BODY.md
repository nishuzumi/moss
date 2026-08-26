feat: add `@themoss/agent` protocol-agnostic intent-alignment helpers

## What and why

Closes the execution gap identified in issue #97 (and follow-up PRs #99, #105).

[docs/agent-skill.md rule 6](https://github.com/nishuzumi/moss/blob/main/docs/agent-skill.md) already requires
every consuming Agent to align the built Capability params and the simulated Receipt outcome with the
recorded user intent before crossing the signer boundary. Those PRs proposed the intent check as a
*prescriptive checklist in docs*, but maintainers declined because "Moss can neither execute nor test
such a checklist, and declarations alone are not evidence."

This PR implements the checklist as **executable helpers** in a new `@themoss/agent` package, with
full Vitest coverage, and migrates the existing `examples/agent-swap` flow from its hand-rolled
Kuru-only `assertCapabilityParams` + `parseKuruSwapOutcome` onto the shared helpers. The result is a
protocol-agnostic alignment library that any Adapter (lending, staking, perps, swaps) can reuse
without rewriting the same field comparisons.

Changes:

- Add a new workspace package `@themoss/agent` with four exports:
  - `alignCapabilityParams(capability, expectations)` — compare `action` output vs. recorded intent.
  - `alignReceiptOutcome(receipt, expectations)` — compare `simulate` Receipt outcome vs. recorded intent.
  - `alignFields(target, expectations)` — generic JSON-path comparison engine, with case-insensitive
    address equality, predicate expectations (e.g. `amountOut > 0`), and structured mismatches.
  - `assertAlignment(mismatches)` — stop at the signer boundary if any field diverges.
- Add 16 Vitest cases covering equality, address case-folding, predicate satisfaction, missing-field
  reporting, nested dotted paths, non-object target fallthrough, throwing predicates, multi-mismatch
  ordering, and the typed `Capability`/`Receipt` wrappers.
- Register `@themoss/agent` in the changeset linked version group (`packages` + all protocol adapters).
- Add a minor changeset describing the new package.
- Migrate `examples/agent-swap/src/swap.ts` off its local Kuru-specific helpers and onto
  `alignCapabilityParams` + `alignReceiptOutcome` with structured expectations.

## Type of change

- [ ] Protocol / Capability / Query
- [x] Core / simulator / MCP server
- [ ] Bug fix
- [ ] Documentation / example
- [x] Tooling / dependency

## Framework and package impact

- **New package boundary**: `@themoss/agent` at `packages/agent/`, depended on only by `examples/agent-swap`.
  Zero existing runtime packages (`core`, `simulator`, `erc`, `system`, `protocols/*`, `mcp-server`)
  take a new dependency, so this change is fully additive and does not touch the Capability tree,
  Change semantics, Receipt coverage, or MCP tool contracts.
- **Public types** exported from `@themoss/agent`:
  - `IntentMismatch { path, reason: "value" | "missing" | "predicate", expected, actual }`
  - `IntentEqualityExpectation { path, expected: JsonSafeValue }`
  - `IntentPredicateExpectation { path, predicate: (v) => boolean, description }`
  - union `IntentFieldExpectation`, and the four helpers above.
- The `CapabilityNode` and `Receipt` typed wrappers are consumed as read-only inputs; no mutation.

## Verification

- [ ] `pnpm build`
- [x] `pnpm typecheck` — `packages/agent` (strict, against `@themoss/core` source) and
  `examples/agent-swap/src/swap.ts` (full workspace path map) both run `tsc --noEmit` with zero
  diagnostics. Verified in isolated Vitest alias environment before opening PR; full workspace build
  handed to CI.
- [ ] `pnpm lint`
- [x] `pnpm test` — `packages/agent/test/alignment.test.ts` runs 16/16 Vitest cases passing
  (equality / address case-insensitivity / value / missing / nested paths / non-object short-circuit
  / predicates / throwing predicates / ordered multi-mismatch / typed `alignCapabilityParams` &
  `alignReceiptOutcome` / `assertAlignment` no-throw and joined-error). Evidence available on
  request; full suite handed to CI.
- [x] User-facing package changes include a changeset — `.changeset/agent-intent-alignment.md`.
- [x] Docs and examples match the implemented API — `examples/agent-swap/src/swap.ts` is the
  reference consumer and imports exactly the four helpers exported from `src/index.ts`.

### Protocol changes

N/A (no Protocol Adapter modifications).

- [ ] Parameters separate reusable Zod value types from field-purpose descriptions
- [ ] Every Capability owns one direct TransactionNode and one typed Receipt
- [ ] Receipt tests preserve every original Change object in exact length and order
- [ ] Positive and `@ts-expect-error` fixtures cover exported type behavior
- [ ] Fixed addresses and ABIs include sources and verification
- [ ] A live Monad happy path returns zero Warnings

## Evidence

```text
❯ node node_modules/vitest/vitest.mjs run packages/agent/test/alignment.test.ts
 ✓ packages/agent/test/alignment.test.ts (16)
   · alignFields returns no mismatches when every equality field matches
   · alignFields compares address-valued fields case-insensitively
   · alignFields keeps non-address strings strict
   · alignFields reports a value mismatch with expected and actual
   · alignFields reports a missing field as missing
   · alignFields reads dotted paths through nested plain objects
   · alignFields stops descending at a non-object node
   · alignFields satisfies a predicate expectation and reports a failed one
   · alignFields treats a throwing predicate as unsatisfied
   · alignFields returns one mismatch per failing expectation in order
   · alignCapabilityParams reads fields from the capability's params
   · alignCapabilityParams reports every field a non-object params lacks
   · alignReceiptOutcome reads fields from the receipt's outcome
   · alignReceiptOutcome flags a sender mismatch and an unverified operation
   · assertAlignment does not throw when there are no mismatches
   · assertAlignment throws one Error joining every mismatch

Test Files  1 passed (1)
     Tests  16 passed (16)
```

Local-isolated `tsc --noEmit` for both `packages/agent` and the migrated
`examples/agent-swap/src/swap.ts`: zero diagnostics.

Full `pnpm build` + full-suite `pnpm lint` + full-suite `pnpm test` are delegated to the repository
GitHub Actions CI runners.
