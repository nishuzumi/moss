# Plans carry quantified expectations (`expects`) alongside risk labels

Effects reconciliation must detect *undeclared* approvals and fund flows, which requires a machine-comparable declaration of what was expected. Risk labels (`fundOut`, `approval`) are unquantified — they can say a Plan involves an approval, but not to whom or how much, so a rogue 10× approval to an unknown spender would pass a label-only check. Every Plan therefore carries an `expects` block: fungible flows `{token, amountMax | amountMin}`, approvals `{token, spender, amountMax}`, and NFTs `{collection, count, direction, items?}` where each item is `{tokenId, amountMax?}`. `count` is a distinct-id maximum for outflows and minimum for inflows. Outflows must enumerate their ids; each ERC-1155 outflow item also carries a decimal-string unit cap, preserving uint256 precision and preventing value from shifting between ids. An inflow may omit `items` when a mint's ids cannot be known before simulation or provide only the ids known in advance; known inflow ids and the aggregate minimum count per collection are reconciled after simulation.

## Consequences

- Warnings fire only on **undeclared differences**. A declared outflow with nothing coming back is legitimate (perp margin, unstake cooldown requests) — the rule is "nothing undeclared", not "every out has an in".
- Capability authors build `expects` in `plan()` from their decoded params (for a swap it is nearly a restatement of the params); core auto-generates the approval expectation for approve steps it assembles itself.
- Risk labels are not replaced: they serve discover/load-time danger classification; expects serve simulation-time reconciliation.
- Native MON flows do not emit Transfer events, so effects extraction reads call-frame `value` fields and balance diffs in addition to logs — otherwise WMON's own `deposit` would be invisible to reconciliation.
- `simulate` accepts an ordered list of Plans, chaining simulated state across them (cross-protocol composition: withdraw → swap → supply) and reconciling each Plan's expects independently.
