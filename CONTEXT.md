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
A serializable node identifying one Capability by protocol + method, with its canonical parameters and ordered children. Registry resolves its Receipt parser from the registered Capability metadata. Exactly one child is its direct TransactionNode; the others are nested CapabilityNodes.

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

**Human token amount**:
A decimal string expressed in a Token reference's display units. A Protocol resolves that Token's decimals and converts the value to chain base units.
_Avoid_: raw amount, wei amount

**Swap amount side**:
The single side of a swap whose Human token amount the user fixed: input (`amountIn`) or output (`amountOut`). A swap never accepts an unqualified `amount`, and exactly one side must be fixed.
_Avoid_: amount, amount mode

**Exact-input swap**:
A swap whose input Human token amount is fixed. Slippage protection limits how far the minimum acceptable output may fall below the quote.

**Target-output swap**:
A swap whose minimum output Human token amount is fixed. The Protocol derives an input amount with slippage headroom; execution may return more than the target but never less.
_Avoid_: exact-output swap

**Best swap path**:
The better of a direct market and a two-market path through native MON at the same quote point. Exact-input swaps maximize output, Target-output swaps minimize input, and equal quotes prefer the direct path.
_Avoid_: shortest path, arbitrary multi-hop path

**Market candidate**:
A dynamic protocol market address returned by that Protocol's discovery source. It is not trusted until its current assets and parameters are verified on-chain.
_Avoid_: built-in pool, hard-coded market

**Runtime**:
The Monad-mainnet execution environment supplied when Moss is assembled. Chain identity is its invariant rather than data repeated throughout Protocols and Capability trees.
_Avoid_: chain map, configurable target chain

**Protocol package**:
A package exporting one or more self-describing Protocols. Its public Protocol exports are its registration surface.
_Avoid_: plugin, extension

**Trusted label**:
A safe 1–32 character payload for a fixed token address selected explicitly by the application composition root and rendered as `Trusted(name)`. Trusted describes catalog provenance only; the text remains untrusted presentation data. Ordinary Protocol exports cannot supply Trusted labels.

**Package label**:
A Protocol-owned local name for a fixed address declared independently of its Handles and rendered as `Package(Title Cased Slug:localName)`. The combined payload inside `Package(...)` is a safe 1–32 character name. A Receipt sees its own Package labels, the Package labels inherited from its parser caller chain, and one unambiguous label from its own declared dependency graph.

**Package boundary**:
Core owns framework contracts; simulator owns trace mechanics; ERC and concrete Protocol packages own ABI semantics, Receipts, and protocol-exclusive deployment addresses; system owns the shared Monad Runtime and shared asset instances; MCP server owns transport. New Protocols affect only their package and the composition root.

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
A pure Protocol method that translates the ordered Changes of one successful transaction into a `ReceiptResult`. Its only evidence is those Changes: it never reconstructs a planned path or fills gaps from external state, and it may delegate intervals to other Receipt parsers. Core attaches the parser's Protocol identity to produce a Receipt.
_Avoid_: Event handler, validator

**Receipt**:
A Core-identified recursive interpretation containing the producing Protocol name, one structured Outcome, presentation text, and ordered ReceiptChange leaves or nested Receipts. Its structured data is authoritative; text is a projection.
_Avoid_: event log

**ReceiptChange**:
A Receipt leaf that retains the exact input Change object and adds JSON-safe protocol data and text.

**Receipt tree**:
The recursive structure formed when a Receipt parser delegates a continuous Change interval to another parser. A delegated Receipt records the dependency parser's Protocol; a grouping created by the current parser inherits its Protocol. Receipts for separate transactions remain separate.

**Receipt label rendering**:
Registry's one presentation-only pass over every Receipt and ReceiptChange text after the root parser returns. At each Receipt, standalone addresses resolve as Trusted, the current Package, nearest-to-farthest caller Package, one unambiguous Package from the current Protocol's direct-or-transitive dependencies, or remain raw. ReceiptChange text inherits its containing Receipt's scope; Outcomes, data, and original Changes are untouched.

**Outcome**:
A JSON-safe structured statement of facts directly supported by simulation Changes. Chain quantities use decimal strings.
_Avoid_: Intent, summary

**discover**:
MCP tool: find capability/query coordinates (protocol, method, verb, category) matching a need.

**load**:
MCP tool: fetch the intent, risk, and JSON-safe Parameter declarations for specific coordinates.

**action**:
MCP tool: execute a Query or return a root Capability tree for a write. Assembles only — never signs, never sends.

**simulate**:
MCP tool: run a Capability tree against chain state and return each transaction's verified Receipt leaf texts in exact Change order plus any Warnings. The library Simulator retains the complete Changes, Receipt trees, data, and Outcomes for SDK consumers. A revert or unprovable Change order stops the remaining flow.

**Warning**:
A simulation failure such as a revert, parse failure, uncovered or reordered Change, or missing Outcome. Any Warning halts the flow.

### Skill layer

**Intent**:
The agent's structured statement of what the user wants (assets out, assets in, target action) before any protocol is chosen.

**Intent alignment**:
The Agent's semantic check that Capability parameters and every ordered Receipt text returned by MCP match the user's words. SDK consumers may perform the same check deterministically with full Receipt Outcomes. A mismatch prevents handoff to a signer.
