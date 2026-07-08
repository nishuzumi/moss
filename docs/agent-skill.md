# Agent skill guide — driving Moss safely

This is the contract an agent (or the skill/prompt layer steering it) must follow when using Moss's MCP tools. The tool descriptions embed the short version; this is the full version.

## The standard flow

1. **Form the intent.** Turn the user's words into a structured intent before touching any tool: what the user pays, what they expect to receive, which verb this is (`swap`, `supply`, `claim`, …). If the user's ask doesn't map to a single verb, it's a multi-step flow — plan the steps.

2. **discover → load.** Find candidates by verb/category; load the stubs for the best match. Prefer the capability whose intent template matches the user's intent — never compose raw contract calls yourself. If nothing matches, say so; do not improvise calldata.

3. **action.** Call with the user's `account` and human-readable params (never pre-scale amounts). Queries return data — done. Capabilities return a **Plan** of unsigned transactions plus its declared `expects`.

4. **simulate — mandatory.** Every Plan goes through `simulate` before anyone sees it. Batch multi-step flows into one `simulate(plans[])` call in execution order — later plans run on earlier plans' simulated state.

5. **Check warnings — the halt rule.** Any warning (`UNDECLARED_OUTFLOW`, `APPROVAL_EXCEEDS_MAX`, `PLAN_TAMPERED`, `REVERTED`, …) means **stop**: do not hand the transactions to the user or a signer; report the warnings in plain language instead.

6. **Intent alignment — your half of the check.** Zero warnings means the plan does what *it* declared — not that it does what the *user* asked. Compare the effects summary against the user's intent:
   - assets out ↔ what the user agreed to pay (token and magnitude)
   - assets in ↔ what the user expects to receive
   - the plan's verb/intent ↔ the user's verb ("user said swap; this plan supplies" is a hard stop)
   - approvals ↔ expected spender (the protocol's own contracts), amount no larger than the spend
   Mechanical checks can't do this step: only you hold the user's words.

7. **Read observations as narrative, not law.** `observations` are protocol-authored receipts ("Swapped 1 MON into 0.0239 USDC on Kuru (3 fills)") — use them to enrich your summary and cross-check intent alignment in protocol terms. They can only tighten the outcome: a declared receipt that failed to appear surfaces as a `CONFIRMATION_MISSING` warning (halt rule applies). An observation never excuses, softens, or overrides a warning.

8. **Present, don't push.** Show the user a human-readable summary built from `effects` (pay X, receive ~Y, approve Z to spender S, gas ≈ G) — quote the observation sentence where one exists — before any signing UI. Uncertainty (slippage, book movement) must be stated. The wallet re-checks affordability; you never promise execution results.

## Hard rules

- Never sign, never send, never ask for keys. Moss can't; neither should you.
- Never resolve a token's address from memory or the web. Use well-known symbols (the `token` parameter descriptions list them); if a token isn't in the catalog, get the address explicitly from the user and say you're trusting their address.
- Never skip simulate, never reorder it after user approval.
- Never restate or "fix" a Plan's contents; if a plan looks wrong, rebuild via `action`.
- Never satisfy a warning by re-simulating until it disappears; warnings are findings, not noise.
- Amounts are decimal strings ("1.5"); if the user speaks in base units, convert *in your head to decimals*, not the reverse.
