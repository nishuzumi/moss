# Moss

Moss turns complex on-chain interactions of DApps/protocols into uniform, agent-callable capabilities (discover → load → action → simulate). The system assembles the correct transaction steps; agents may supply explicit token addresses but never handle raw ABIs or multicall plumbing.

## Language

### Protocol layer

**Protocol (adapter)**:
A self-describing class that adapts one on-chain protocol, possibly spanning multiple contracts, into Moss Capabilities and Queries. A Protocol may declare other Protocols as dependencies.
_Avoid_: integration, connector, plugin

**Protocol dependency**:
A Protocol explicitly required by another Protocol. Its Capabilities compose into the caller's Capability tree, while its Queries return data directly.
_Avoid_: global service locator, import side effect

**Capability**:
A Protocol's write intent, owning exactly one direct unsigned transaction and one Receipt parser. Additional transactions belong to nested Capabilities; a Capability never signs or sends.
_Avoid_: action (that's the MCP tool), function, method

**Query**:
A read-only method on a Protocol that returns data (e.g. an APY). No transaction is ever produced.
_Avoid_: view, getter

**Handle**:
An ABI-typed gateway to one contract that can encode an unsigned transaction, read state, or preview a write without sending it.
_Avoid_: contract instance, client

**Capability tree**:
The sole executable structure for a write: an ordered tree of CapabilityNode composition nodes and TransactionNode leaves. There is no independent transaction list.
_Avoid_: Plan, transaction bundle

**CapabilityNode**:
A serializable node identifying one Capability, its canonical parameters, Receipt parser, and ordered children. Exactly one child is its direct TransactionNode; the others are nested CapabilityNodes.

**TransactionNode**:
A Capability-tree leaf containing one unsigned transaction. A contract-level multicall is still one TransactionNode.

**Parameter type**:
A reusable, context-free value contract carrying validation, transformation, defaults, and a description of representation, units, conversion, constraints, and examples. It never describes a field's use in one Capability or Query.

**Parameter declaration**:
A Capability or Query input field pairing a Parameter type with a separate description of that field's specific role.

**Risk label**:
A Capability tag naming a category of danger, such as `fundOut`, `approval`, or `priceImpact`. It is authoring metadata, not runtime evidence.
_Avoid_: warning, flag

**Protocol trust boundary**:
Registered Protocol packages are trusted executable code protected by provenance, review, and tests. Moss verifies their observable output but does not claim to detect a Protocol that maliciously authors both a transaction and its parser.

**Token reference**:
Either an explicit EVM token address or `native`; symbols are not Token references. Fixed official addresses come from the system layer, while dynamic addresses come from chain state.
_Avoid_: symbol, token registry entry

**Runtime**:
The Monad-mainnet execution environment supplied when Moss is assembled. Chain identity is its invariant rather than data repeated throughout Protocols and Capability trees.
_Avoid_: chain map, configurable target chain

**Protocol package**:
A package exporting one or more self-describing Protocols. Its public Protocol exports are its registration surface.
_Avoid_: plugin, extension

**Package boundary**:
Core owns framework contracts; simulator owns trace mechanics; ERC and concrete Protocol packages own ABI semantics and Receipts; system owns Monad instances; MCP server owns transport. New Protocols affect only their package and the composition root.

**ABI origin**:
The provenance tier of an ABI file: `compiled` (from contract source), `explorer` (verified-contract page), or `vendored` (documented third-party source, behavior verified on-chain). Every ABI declares exactly one.
_Avoid_: provenance (that word is taken by value provenance)

**Provenance**:
Where a returned value's truth comes from: `declared` (author wrote it), `inferred` (derived), `verified` (confirmed on-chain/simulation).

**Verb**:
The user-perspective write semantic of a Capability, from a small closed set (`swap`, `wrap`, `unwrap`, `supply`, `withdraw`, `borrow`, `repay`, `stake`, `unstake`, `claim`, `mint`, `transfer`, `approve`). Never the protocol's function name: WMON's `deposit()` has verb `wrap`, not `deposit`.
_Avoid_: action type, operation

**Category**:
The coarse protocol domain a Protocol belongs to, from a closed set (`dex`, `lending`, `staking`, `rewards`, `token`, `nft`).

**Tag**:
Free-form descriptive label on a Capability for long-tail semantics (`clob`, `limit-order`, `lst`). The open-ended complement to the closed verb/category sets.

### MCP layer

**Event**:
A raw on-chain log carrying only its address, topics, and data. It is the `event` kind of Change; ABI decoding and semantic interpretation belong to the Capability's Receipt.
_Avoid_: Receipt

**Native MON transfer**:
A raw native-value movement carrying only its sender, recipient, and decimal-string value. It is the `nativeTransfer` kind of Change and covers movements anywhere in a successful transaction, including top-level value and positive value carried by `CALL`, `CREATE`, `CREATE2`, or `SELFDESTRUCT`; reverted and non-value-moving frames are excluded.
_Avoid_: balance effect, user transfer

**Change**:
An immutable Event or native MON transfer from successful execution, kept in exact execution order. Reverted records are diagnostics, not Changes.
_Avoid_: Outcome, effect summary

**Receipt parser**:
A pure Protocol method that interprets the ordered Changes of one successful transaction into a Receipt. Its only evidence is those Changes, and it may delegate intervals to other Receipt parsers.
_Avoid_: Event handler, validator

**Receipt**:
A recursive interpretation containing one structured Outcome, presentation text, and ordered ReceiptChange leaves or nested Receipts. Its structured data is authoritative; text is a projection.
_Avoid_: event log

**ReceiptChange**:
A Receipt leaf that retains the exact input Change object and adds JSON-safe protocol data and text.

**Receipt tree**:
The recursive structure formed when a Receipt parser delegates a continuous Change interval to another parser. Receipts for separate transactions remain separate.

**Outcome**:
A JSON-safe structured statement of what a Receipt parser found in simulation evidence. Chain quantities use decimal strings.
_Avoid_: Intent, summary

**discover**:
MCP tool: find capability/query coordinates (protocol, method, verb, category) matching a need.

**load**:
MCP tool: fetch the intent, risk, and JSON-safe Parameter declarations for specific coordinates.

**action**:
MCP tool: execute a Query or return a root Capability tree for a write. Assembles only — never signs, never sends.

**simulate**:
MCP tool: run a Capability tree against chain state and return verified Receipts for its successful transactions. A revert or unprovable Change order stops the remaining flow.

**Warning**:
A simulation failure such as a revert, parse failure, uncovered or reordered Change, or missing Outcome. Any Warning halts the flow.

### Skill layer

**Intent**:
The agent's structured statement of what the user wants (assets out, assets in, target action) before any protocol is chosen.

**Intent alignment**:
The Agent's semantic check that Capability parameters and verified Receipt Outcomes match the user's words. A mismatch prevents handoff to a signer.
