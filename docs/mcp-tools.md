# MCP tools reference

The Moss stdio server exposes exactly four tools: `discover`, `load`, `action`, and `simulate`. It builds and verifies unsigned transactions and never signs or sends them.

Build the server before configuring a client:

```bash
pnpm build
```

```jsonc
{
  "mcpServers": {
    "moss": {
      "command": "node",
      "args": ["<path-to-moss>/packages/mcp-server/dist/cli.js"],
      "env": { "MOSS_RPC_URL": "https://rpc.monad.xyz" }
    }
  }
}
```

The RPC must report Monad mainnet chain ID `143`. All MCP values are JSON-safe; chain quantities in structured data use decimal strings.

## discover

Find Capabilities and Queries before loading their full calling contracts.

### Input

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `verb` | closed string | no | User operation such as `swap`, `wrap`, `transfer`, or `approve` |
| `category` | closed string | no | Protocol domain such as `dex`, `token`, or `nft` |
| `protocol` | string | no | Exact Protocol slug |

```json
{ "verb": "swap" }
```

### Output

```ts
type Coordinate = {
  protocol: string;
  method: string;
  kind: "capability" | "query";
  verb?: Verb;
  category: Category;
  tags: string[];
  summary: string;
};
```

Pass the selected `{ protocol, method }` coordinates to `load`. Do not call `action` from a guessed method name.

## load

Load intent, risk labels, and parameter contracts for one or more coordinates.

### Input

```json
{
  "items": [
    { "protocol": "kuru", "method": "swap" },
    { "protocol": "kuru", "method": "quote" }
  ]
}
```

### Output

```ts
type Stub = {
  protocol: string;
  method: string;
  kind: "capability" | "query";
  intent: string;
  verb?: Verb;
  category: Category;
  risk: RiskLabel[];
  tags: string[];
  params: Record<string, {
    type: JsonSafeValue;
    description: string;
  }>;
};
```

`risk` uses Core's closed set. `fundOut` means assets leave the account in the current transaction and does not cover future repayment obligations. `debt` means the Capability increases the account's repayment obligations, even when no asset leaves the account in the transaction. Free-form `tags` may add description, but do not replace risk classification.

Each parameter contains two independent explanations:

- `type` is generated JSON Schema plus the reusable representation, units, constraints, conversion, and examples;
- `description` explains what the field controls in this Capability or Query.

Read both. For example, a basis-points type explains that `1 bps = 0.01%`; the field description explains that the value limits swap slippage.

## action

Execute a Query or build one root Capability tree.

### Input

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `protocol` | string | yes | Protocol slug returned by `discover` |
| `method` | string | yes | Method returned by `discover` |
| `account` | address | yes | Sender of every transaction in the resulting tree |
| `params` | object | no | Values described by `load`; defaults to `{}` |

Query example:

```json
{
  "protocol": "kuru",
  "method": "quote",
  "account": "0xcccccccccccccccccccccccccccccccccccccccc",
  "params": {
    "tokenIn": "native",
    "tokenOut": "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    "amountIn": "1"
  }
}
```

A Query returns immediately:

```ts
type QueryResult = {
  kind: "query";
  protocol: string;
  method: string;
  data: JsonSafeValue;
};
```

A write returns one recursive Capability:

```ts
type CapabilityNode = {
  kind: "capability";
  protocol: string;
  method: string;
  params: JsonSafeValue;
  children: readonly (CapabilityNode | TransactionNode)[];
};

type TransactionNode = {
  kind: "transaction";
  transaction: {
    from: Address;
    to: Address;
    data: Hex;
    value: Hex;
  };
};
```

Every Capability has exactly one direct TransactionNode. The typed Receipt parser is resolved by Registry from the registered `protocol + method`; callers do not provide a Receipt name. Extra transactions belong to nested Capabilities. Never edit or reorder the returned tree; call `action` again when inputs change.

## simulate

Execute one root Capability tree against Monad state and parse each successful transaction.

### Input

```jsonc
{
  "capability": { /* exact CapabilityNode returned by action */ }
}
```

Simulation traverses nested Capabilities in depth-first order and carries state forward. MCP projects the verified Receipt leaves into the small Agent-facing response:

```ts
type AgentSimulation = {
  ok: boolean;
  guidance: string;
  halted?: { transactionIndex: number; reason: string };
  results: Array<{
    protocol: string;
    method: string;
    texts: string[];
    warnings: Warning[];
  }>;
};
```

`texts` contains exactly one entry per Receipt leaf, recursively flattened in the original Change order. For example:

```json
{
  "ok": true,
  "guidance": "Compare every ordered Receipt text with the user's intent before handing transactions to a signer.",
  "results": [
    {
      "protocol": "erc20",
      "method": "approve",
      "texts": ["ERC20 Approval: ..."],
      "warnings": []
    },
    {
      "protocol": "kuru",
      "method": "swap",
      "texts": [
        "ERC20 Transfer: ...",
        "Trade Event: ...",
        "Kuru Swap: ..."
      ],
      "warnings": []
    }
  ]
}
```

The MCP wire response deliberately omits transactions, gas, raw Changes, Receipt trees, leaf data, and structured Outcomes; `action` already returned the Capability tree. SDK consumers calling the library Simulator directly retain the complete result:

```ts
type TransactionSimulation = {
  protocol: string;
  method: string;
  transaction: UnsignedTx;
  reverted: boolean;
  revertReason?: string;
  receipt?: Receipt;
  changes?: readonly Change[];
  warnings: Warning[];
  gas: string | null;
};
```

Core produces the MCP texts only after the complete recursive Receipt retains every exact input Change object with identical length and order. After a clean simulation, compare every ordered text with the user's original operation, assets, amounts, recipients, limits, approvals, and Protocol choice.

## Warnings

| Code | Meaning |
| --- | --- |
| `REVERTED` | The transaction reverted |
| `TRACE_FAILED` | The RPC could not produce trace evidence |
| `CHANGE_ORDER_UNAVAILABLE` | Exact Event/native-transfer ordering could not be proven |
| `RECEIPT_FAILED` | The Protocol could not parse the Changes into a valid Receipt |
| `CHANGE_COVERAGE_MISMATCH` | Receipt leaves omitted, duplicated, replaced, or reordered Changes |
| `STATE_CHAIN_FAILED` | State for a later transaction could not be derived |

Any Warning halts execution. Earlier successful Receipts may remain for diagnosis, but later transactions do not run and nothing may be handed to a signer.

## Endpoint requirements

Simulation needs `debug_traceCall` with call/log evidence, a `prestateTracer` diff, and state overrides. The default `https://rpc.monad.xyz` supports these methods.

When an endpoint lacks required evidence, Moss returns a Warning and stops. It never falls back to approximate ordering or skips Receipt verification. See [ADR 0002](./adr/0002-simulation-via-debug-tracecall.md).
