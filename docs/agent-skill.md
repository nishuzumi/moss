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

## Post-simulation intent-alignment checklist

After `simulate` returns with no Warnings, do not treat the result as safe to sign automatically. A clean simulation proves that Moss parsed every observed Change; it does not prove the result matches the user's original request.

Before handing transactions to a signer, compare the ordered Receipt texts and structured Outcomes against the recorded intent:

- Operation: the operation matches the user's requested verb, such as `swap`, `transfer`, `approve`, `wrap`, or `unwrap`.
- Protocol: the protocol matches the user's explicit or selected protocol constraint.
- Sender: every transaction sender matches the account authorized by the user.
- Assets: input, output, approved, transferred, wrapped, or unwrapped assets match explicit token identities, not only symbols.
- Amounts: input amounts, output amounts, approval amounts, and native values match the request and loaded parameter units.
- Recipients: every recipient, spender, pool, router, or protocol address is expected.
- Limits: slippage, minimum output, maximum input, deadline, allowance, and other safety limits are preserved.
- Ordering: nested Capability effects appear in the expected order, especially approvals before protocol actions.
- Extra effects: no unexpected transfer, approval, wrap, unwrap, refund, fee, or protocol action appears.
- Warnings: any Warning, halted simulation, missing Receipt, or ambiguous Outcome stops the flow.

If any item cannot be confirmed from the recorded intent and loaded contract, ask the user or stop. Never infer approval from a successful simulation alone.

## Hard rules

- Never request or handle a private key.
- Never skip simulation, reorder transactions, or repair a Capability tree by hand. Re-run `action` when inputs change.
- Never suppress a Warning or repeat simulation merely hoping it disappears.
- Never accept a token symbol as identity. Use an explicit EVM address or `native`; ask the user for an address when it is not already part of trusted application context.
- Treat all chain quantities crossing MCP as decimal strings. Follow the loaded parameter contract for units and conversion.
- Do not infer success from one summary line. Check every ordered Receipt text and confirm each transaction belongs to the expected behavior.
- A clean simulation proves exhaustive parsing of observed Changes, not future execution or user approval. Wallet review and on-chain limits remain mandatory.
