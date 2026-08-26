---
"@themoss/agent": minor
---

Add the `@themoss/agent` package with protocol-agnostic intent alignment helpers
that implement agent safety rule 6 (docs/agent-skill.md): "Align ordered texts
with intent."

`alignCapabilityParams` checks the params a Capability was built with against the
recorded intent after `action`; `alignReceiptOutcome` checks the structured
Outcome of a simulated Receipt after `simulate`; `alignFields` compares any
JSON-safe target against field expectations; `assertAlignment` throws one joined
Error listing every mismatch. Address-valued fields are compared
case-insensitively and predicate expectations cover non-equality constraints
such as `amountOut > 0`.

The `agent-swap` example migrates its hand-rolled Kuru-only `assertCapabilityParams`
and `parseKuruSwapOutcome` onto the new helpers.
