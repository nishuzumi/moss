# MCP tool contracts

This document describes the accepted Moss MCP contract. The TypeScript server is still being migrated to it.

The server exposes exactly four tools and never signs or sends. Its composition root receives one Monad Runtime and the selected Protocol module namespaces. `MOSS_RPC_URL` may choose the endpoint; chain ID is not configurable and must resolve to `143`.

All values crossing MCP are JSON-safe. Chain quantities use decimal strings.

## discover

Find Protocol methods by optional verb, category, tags, or coordinates. Results identify the Protocol, method, whether it is a Capability or Query, and enough metadata to choose what to load.

## load

Return intent, risk labels, and the parameter contract for selected coordinates. Every parameter keeps two descriptions:

- `type`: generated JSON Schema plus a context-free description of representation, units, conversion, constraints, and examples;
- `description`: the field's purpose in this specific Capability or Query.

Zod objects remain inside the process and never cross MCP.

## action

Execute a Query or return one root CapabilityNode for a write. A write result has no independent transaction list.

```ts
type CapabilityNode = {
  kind: "capability";
  protocol: string;
  method: string;
  params: JsonSafeValue;
  receipt: string;
  children: readonly (CapabilityNode | TransactionNode)[];
};

type TransactionNode = {
  kind: "transaction";
  transaction: UnsignedTx;
};
```

Each CapabilityNode must contain exactly one direct TransactionNode. Every other child is a nested CapabilityNode with its own direct transaction and Receipt parser. Core validates the tree and derives execution order by depth-first traversal.

## simulate

Run one root Capability tree against chained Monad state. Successful transactions return top-level Receipts in transaction execution order.

```ts
type Change =
  | { kind: "event"; address: Address; topics: readonly Hex[]; data: Hex }
  | { kind: "nativeTransfer"; from: Address; to: Address; value: string };

interface ReceiptChange {
  kind: "change";
  change: Change;
  data: JsonSafeValue;
  text: string;
}

interface Receipt<TOutcome extends JsonSafeValue> {
  kind: "receipt";
  outcome: TOutcome;
  text: string;
  changes: readonly (ReceiptChange | Receipt<JsonSafeValue>)[];
}
```

The simulator extracts every successful Change in provable execution order, invokes the Receipt parser named by the owning Capability, then recursively verifies exact Change object identity, length, and order. Protocol parsers may nest Receipts but may not mutate, replace, duplicate, omit, or reorder evidence.

A reverted transaction returns no Receipt. Earlier Receipts remain available, the response records a terminal Warning and diagnostics, and later transactions do not execute.

## Warnings

Warnings include transaction reverts, unavailable or unordered trace evidence, Receipt parse failures, missing Outcomes, and incomplete or reordered Change coverage. Every Warning halts the flow; there is no warning-suppression or semantic-matcher stage.
