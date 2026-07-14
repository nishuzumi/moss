# Plans carry quantified expectations (`expects`) alongside risk labels

Effects reconciliation must detect *undeclared* approvals and fund flows, which requires a machine-comparable declaration of what was expected. Risk labels (`fundOut`, `approval`) are unquantified — they can say a Plan involves an approval, but not to whom or how much, so a rogue 10× approval to an unknown spender would pass a label-only check. Every Plan therefore carries an `expects` block: fungible flows `{token, amountMax | amountMin}`, approvals `{token, spender, amountMax}`, and NFTs `{collection, count, direction, amountMax?}`. `count` bounds the number of token ids; ERC-1155 outflows additionally use decimal-string `amountMax` to bound the exact number of units without losing uint256 precision. Token ids themselves remain omitted because they may be unknowable before mint.

## Consequences

- Warnings fire only on **undeclared differences**. A declared outflow with nothing coming back is legitimate (perp margin, unstake cooldown requests) — the rule is "nothing undeclared", not "every out has an in".
- Capability authors build `expects` in `plan()` from their decoded params (for a swap it is nearly a restatement of the params); core auto-generates the approval expectation for approve steps it assembles itself.
- Risk labels are not replaced: they serve discover/load-time danger classification; expects serve simulation-time reconciliation.
- Native MON flows do not emit Transfer events, so effects extraction reads call-frame `value` fields and balance diffs in addition to logs — otherwise WMON's own `deposit` would be invisible to reconciliation.
- `simulate` accepts an ordered list of Plans, chaining simulated state across them (cross-protocol composition: withdraw → swap → supply) and reconciling each Plan's expects independently.
