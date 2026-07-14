# Moss

Moss turns complex on-chain interactions of DApps/protocols into uniform, agent-callable capabilities (discover → load → action → simulate). The system assembles the correct transaction steps; agents never touch raw ABIs, addresses, or multicall plumbing.

## Language

### Protocol layer

**Protocol (adapter)**:
A class that adapts one on-chain protocol (possibly spanning multiple contracts) into Moss capabilities and queries.
_Avoid_: integration, connector, plugin

**Capability**:
A write-intent method on a Protocol that produces a Plan (unsigned transactions). Never signs, never sends.
_Avoid_: action (that's the MCP tool), function, method

**Query**:
A read-only method on a Protocol that returns data (e.g. an APY). No transaction is ever produced.
_Avoid_: view, getter

**Handle**:
The injected, ABI-typed gateway to one contract. Three faces, all powerless to sign or send: encode calldata locally for writes, read on-chain state, and preview a write via simulation (how orderbook quoting works).
_Avoid_: contract instance, client

**Plan**:
The output of a Capability: an ordered list of unsigned transactions (e.g. approve + main call) plus the declared intent, risk labels, and expects. Not signed, not sent. Terminal — Plans never nest or merge; reuse happens at the step level.
_Avoid_: transaction, bundle

**Step builder**:
A plain exported function producing a TxStep plus its expects fragment (e.g. `approveStep`). The unit of cross-protocol logic reuse — protocol classes are never passed into other protocols (ADR 0009).
_Avoid_: helper, mixin

**Expects**:
A Plan's quantified declaration of what may move: assets out (with a max), assets in (with a min), approvals (token, spender, cap), NFTs (collection, token-id count, direction, and an optional ERC-1155 unit cap). Risk labels say what *kind* of danger; expects say exactly *how much* — the machine-comparable side of effects reconciliation.

**Semantic type**:
A parameter type that carries two faces: a human/agent-readable description (`describe`) and a runtime decoder (`decode`) that turns agent-supplied values into on-chain values (e.g. human decimals → base units).

**Risk label**:
A declared tag on a Capability naming a category of danger (e.g. `fundOut`, `approval`, `priceImpact`). Declared at authoring time, verified against simulate effects.
_Avoid_: warning, flag

**Well-known token**:
A token registered in the token table, addressable by symbol ("USDC"). Symbols resolve only through the table — never from on-chain names, which same-symbol fakes can spoof. Unknown symbols fail loudly.
_Avoid_: token list, whitelist

**Token table**:
The per-registry assembly of well-known tokens, seeded by the system manifest and extended by protocol packages. Redefining a symbol to a different address is rejected outright.
_Avoid_: global token registry

**Protocol package**:
The unit of contribution: one npm package per protocol, exporting a manifest. Composition between protocols is an explicit package dependency.
_Avoid_: plugin, extension

**Manifest**:
What a protocol package exports for assembly: its protocols and the tokens it introduces. Registries start empty and are assembled manifest by manifest — nothing registers itself as an import side effect.
_Avoid_: registration hook

**ABI origin**:
The provenance tier of an ABI file: `compiled` (from contract source), `explorer` (verified-contract page), or `vendored` (documented third-party source, behavior verified on-chain). Every ABI declares exactly one.
_Avoid_: provenance (that word is taken by value provenance)

**Provenance**:
Where a returned value's truth comes from: `declared` (author wrote it), `inferred` (derived), `verified` (confirmed on-chain/simulation).

**Verb**:
The user-perspective fund semantic of a Capability, from a small closed set (`swap`, `wrap`, `unwrap`, `supply`, `withdraw`, `borrow`, `repay`, `stake`, `unstake`, `claim`, `mint`, `transfer`). Never the protocol's function name: WMON's `deposit()` has verb `wrap`, not `deposit`.
_Avoid_: action type, operation

**Category**:
The coarse protocol domain a Protocol belongs to, from a closed set (`dex`, `lending`, `staking`, `rewards`, `token`, `nft`).

**Tag**:
Free-form descriptive label on a Capability for long-tail semantics (`clob`, `limit-order`, `lst`). The open-ended complement to the closed verb/category sets.

### MCP layer

**discover**:
MCP tool: find capability/query coordinates (protocol, method, verb, category) matching a need.

**load**:
MCP tool: fetch the intent/params/risk stub for specific coordinates, so the agent knows how to call them.

**action**:
MCP tool: execute a Query (returns data) or build a Capability's Plan (returns unsigned transactions). Assembles only — never signs, never sends.

**simulate**:
MCP tool: run a Plan's unsigned transactions against chain state and return the effects summary, warnings from effects reconciliation, and gas. The gate that turns `declared` into `verified`.

**Observation**:
A protocol-authored, human-rendered statement of what happened in protocol terms during simulation ("swapped 1 MON into 0.02 USDC across 3 fills"). Narrative for intent alignment — never an input to reconciliation.
_Avoid_: event log, receipt data

**Confirmation**:
An observation a capability declares as its expected on-chain receipt. A declared confirmation that fails to appear in simulation halts the flow. Can only tighten the outcome, never satisfy it.

**Dealer**:
A preprocessor a protocol attaches to an observation: receives all matched events before the handler, to filter, enrich, or aggregate them.

**Effects summary**:
The structured result of simulation: assets out, assets in, approvals granted, recipients touched. The clean input for intent alignment — agents never parse raw logs.

**Warning**:
An undeclared difference surfaced by effects reconciliation (e.g. an approval the Plan never declared, funds flowing to an address outside the Plan). Any warning halts the flow.

### Skill layer

**Intent**:
The agent's structured statement of what the user wants (assets out, assets in, target action) before any protocol is chosen.

**Effects reconciliation**:
The mechanical, code-level comparison between what a Plan declared (intent, risk labels) and what simulation actually showed. Runs inside simulate; needs no knowledge of the user. Catches adapter bugs and undeclared protocol behavior.
_Avoid_: intent-vs-effects check (ambiguous — split into this and intent alignment)

**Intent alignment**:
The agent's semantic check that the Plan's declared intent matches what the user actually asked for (right verb, right assets, right amounts). Mandated by the Skill layer; only the agent can do it, because only the agent holds the user's words. On mismatch — or on any warning — the flow stops and nothing is handed to a signer.
