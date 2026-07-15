# Getting started with the new Moss framework

The architecture below is accepted. Source packages and examples are still being migrated, so this guide explains the contract without presenting stale runnable code.

## 1. Start from user intent

Record the verb, assets, limits, recipient, and any protocol constraint in the user's own terms. Moss does not infer this intent from transactions; the Agent keeps it for the final comparison.

## 2. discover and load

Use `discover` to find candidate Capabilities and Queries. Use `load` before calling one.

For each input, `load` returns a reusable value contract and a separate field-purpose description. For example, a basis-points type explains that `1 bps = 0.01%` and its numeric range; the field description explains that this particular value limits swap slippage.

Token inputs are an explicit EVM address or `native`. Moss does not resolve user-supplied symbols.

## 3. action

A Query returns data immediately. A write returns one root Capability tree.

Every Capability in the tree owns one direct unsigned transaction and one named Receipt parser. If a swap needs an ERC approval, the approval is a nested ERC Capability with its own transaction and Receipt; it is not an unowned extra transaction.

Core validates the tree. Neither the Agent nor MCP server reconstructs or reorders it.

## 4. simulate

Simulation executes the tree's transactions in depth-first order and carries state forward between them. For every successful transaction it records all raw Events and native MON transfers in exact execution order.

The owning Protocol parses those immutable Changes into a structured Receipt. It may delegate a continuous interval to another Protocol's pure Receipt parser, but it cannot read live chain state or use the Capability parameters as an answer key.

Core accepts a Receipt only when its leaves retain every exact input Change object once and in order.

## 5. Stop on every Warning

A revert, unprovable Change order, parsing failure, missing Outcome, or coverage mismatch is terminal. Earlier successful Receipts may still be shown for diagnosis, but no later transaction executes and nothing is handed to a signer.

## 6. Align Outcomes with intent

Read structured Outcomes, not only parser-authored text. Compare actual assets, amounts, recipients, approvals, and protocol semantics with the user's original request. A clean simulation proves complete parsing of observed behavior; only the Agent can decide whether that behavior answers the user.

## 7. Understand the boundaries

- Moss v1 accepts only Monad mainnet. Runtime verifies RPC chain ID `143` at startup.
- Protocol packages are trusted executable code and require provenance, review, type fixtures, and live tests.
- Simulation reflects one state snapshot. Wallet review and on-chain protections remain mandatory.
- Moss never signs or sends.

Continue with [MCP tool contracts](./mcp-tools.md), [Protocol onboarding](./protocol-onboarding.md), and the [Agent safety rules](./agent-skill.md).
