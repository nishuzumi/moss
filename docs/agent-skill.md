# Agent safety rules for Moss

These rules apply to every Agent that uses the Moss MCP tools.

## Required flow

1. **Record intent.** Preserve the user's verb, assets, limits, recipient, and protocol constraints before calling a tool.
2. **discover, then load.** Choose a method whose intent and risks match the request. Read every parameter's value contract and field-specific description.
3. **action.** A Query returns data. A write returns one Capability tree of unsigned transactions. Never invent calldata or modify the tree.
4. **simulate.** Simulation is mandatory for every write tree and must run after the final `action` result.
5. **Stop on every Warning.** A revert, unavailable ordering evidence, Receipt failure, missing Outcome, or Change-coverage mismatch ends the flow.
6. **Align ordered texts with intent.** Compare every Receipt text returned by MCP, in order, with the user's original request. These texts are exposed only after the underlying complete Receipt passes coverage verification.
7. **Present before signing.** Explain actual assets, amounts, recipients, approvals, protocol semantics, uncertainty, and every Warning. Moss itself never signs or sends.

## Hard rules

- Never request or handle a private key.
- Never skip simulation, reorder transactions, or repair a Capability tree by hand. Re-run `action` when inputs change.
- Never suppress a Warning or repeat simulation merely hoping it disappears.
- Never accept a token symbol as identity. Use an explicit EVM address or `native`; ask the user for an address when it is not already part of trusted application context.
- Treat all chain quantities crossing MCP as decimal strings. Follow the loaded parameter contract for units and conversion.
- Do not infer success from one summary line. Check every ordered Receipt text and confirm each transaction belongs to the expected behavior.
- A clean simulation proves exhaustive parsing of observed Changes, not future execution or user approval. Wallet review and on-chain limits remain mandatory.
