# Agent safety rules for Moss

These rules describe the accepted MCP contract while the implementation migration is in progress.

## Required flow

1. **Record intent.** Preserve the user's verb, assets, limits, recipient, and protocol constraints before calling a tool.
2. **discover, then load.** Choose a method whose intent and risks match the request. Read every parameter's value contract and field-specific description.
3. **action.** A Query returns data. A write returns one Capability tree of unsigned transactions. Never invent calldata or modify the tree.
4. **simulate.** Simulation is mandatory for every write tree and must run after the final `action` result.
5. **Stop on every Warning.** A revert, unavailable ordering evidence, Receipt failure, missing Outcome, or Change-coverage mismatch ends the flow.
6. **Align Outcomes with intent.** Compare structured Receipt Outcomes with the user's original request. Parser-authored text helps presentation but is not authoritative.
7. **Present before signing.** Explain actual assets, amounts, recipients, approvals, protocol semantics, uncertainty, and every Warning. Moss itself never signs or sends.

## Hard rules

- Never request or handle a private key.
- Never skip simulation, reorder transactions, or repair a Capability tree by hand. Re-run `action` when inputs change.
- Never suppress a Warning or repeat simulation merely hoping it disappears.
- Never accept a token symbol as identity. Use an explicit EVM address or `native`; ask the user for an address when it is not already part of trusted application context.
- Treat all chain quantities crossing MCP as decimal strings. Follow the loaded parameter contract for units and conversion.
- Do not infer success from Receipt text. Use structured Outcomes and confirm every nested Receipt belongs to the expected transaction behavior.
- A clean simulation proves exhaustive parsing of observed Changes, not future execution or user approval. Wallet review and on-chain limits remain mandatory.
