# MCP tools reference

The Moss MCP server exposes exactly four tools. It is **stateless**: everything `simulate` needs travels inside the Plan object `action` returned. Nothing in this server signs or sends transactions.

Server binary: `packages/mcp-server` → `moss-mcp` (stdio). Configuration via env: `MOSS_RPC_URL` (default `https://rpc.monad.xyz`), `MOSS_CHAIN_ID` (default `143`).

## discover

```
discover(verb?, category?, protocol?) → Coordinate[]
```

Finds capabilities (writes) and queries (reads) across registered protocols.

- `verb` — user-perspective fund semantic, closed set: `swap wrap unwrap supply withdraw borrow repay stake unstake claim mint transfer`. Verbs never mirror protocol function names (WMON's `deposit()` is verb `wrap`).
- `category` — protocol domain, closed set: `dex lending staking rewards token nft`.
- Long-tail semantics (`clob`, `lst`, …) appear in each coordinate's free-form `tags`.

Returns coordinates: `{ protocol, method, kind: "capability"|"query", verb?, category, tags, summary }`.

## load

```
load(items: {protocol, method}[]) → Stub[]
```

Fetches the calling contract for coordinates: the intent template, per-parameter semantics, and risk labels.

Parameter descriptions are written for agents. Two conventions matter most:

- **Amounts are human-readable decimals** ("1.5"), never pre-scaled base units — the runtime applies token decimals. Contextual parameters (an amount whose token is another parameter) resolve automatically.
- **Tokens go by well-known symbol** ("MON", "WMON", "USDC", "AUSD") wherever possible; symbols resolve only through the curated catalog, never from on-chain names (spoofable). An address is accepted for tokens outside the catalog; unknown symbols error loudly with the catalog list.

## action

```
action(protocol, method, account, params) → QueryResult | Plan
```

- `account` — the user's address; it becomes the sender of every transaction in a Plan. Standardized here so no protocol invents its own `user`/`recipient`/`owner` parameter.
- Queries return data immediately: `{ kind: "query", data }`.
- Capabilities return a **Plan**:

```jsonc
{
  "kind": "plan",
  "protocol": "kuru",
  "method": "swap",
  "verb": "swap",
  "chainId": 143,
  "account": "0x…",
  "intent": "Swap 1 native into 0x…USDC at market on Kuru, tolerating 100 bps slippage",
  "declaredRisk": ["fundOut", "approval", "priceImpact"],
  "expects": {
    "out":       [{ "token": "native", "amountMax": "1000000000000000000" }],
    "in":        [{ "token": "0x…USDC", "amountMin": "23933" }],
    "approvals": [ /* {token, spender, amountMax} */ ],
    "nfts":      [ /* {collection, count, direction, amountMax?} */ ]
  },
  "confirms": ["swapResult"],   // receipts this write must produce in simulation
  "txs": [ { "from": "0x…", "to": "0x…", "data": "0x…", "value": "0x0" } ],
  "planHash": "0x…"   // keccak256 over {chainId, account, txs, expects, confirms}
}
```

The Plan is self-contained by design — pass it around freely; `simulate` re-derives `planHash` and flags tampering.

**Rule: a Plan must go through `simulate` before it is shown to a user or signer.**

## simulate

```
simulate(plans: Plan[]) → { ok, guidance, results: PlanSimResult[], halted? }
```

Simulates plans **in order with state chained across them** — plan B sees plan A's effects. Use one call for multi-step flows (claim → swap → supply); each plan is still reconciled against its own `expects`.

Per-plan result:

- `effects` — the structured summary for intent alignment: `assetsOut`, `assetsIn`, `approvals`, `nftApprovals`, `nftsOut/In`, `recipients`. Includes native MON flows, wrapped-native mints/burns, and ERC-1155 `TransferSingle`/`TransferBatch` movements. NFT `count` is the number of token ids; ERC-1155 entries additionally carry exact decimal-string `amount`/`amountMax` units so uint256 values never lose precision.
- `warnings` — effects reconciliation output. Codes: `REVERTED`, `PLAN_TAMPERED`, `UNDECLARED_OUTFLOW`, `OUTFLOW_EXCEEDS_MAX`, `UNDECLARED_APPROVAL`, `APPROVAL_EXCEEDS_MAX`, `MIN_INFLOW_NOT_MET`, `UNDECLARED_NFT_OUT`, `NFT_OUT_EXCEEDS_MAX`, `NFT_OPERATOR_GRANTED`, `CONFIRMATION_MISSING` (a receipt the plan's `confirms` declared did not appear). Warnings fire only on **undeclared differences** — a declared outflow with nothing back (an unstake request, margin posting) is legitimate.
- `observations` — protocol-authored receipts ([ADR 0008](./adr/0008-observation-plane.md)): `{ protocol, name, intent, data }`, where `intent` is a rendered human sentence ("Swapped 1 MON into 0.0239 USDC on Kuru (3 fills)"). **Narrative, not law**: use them to enrich the summary shown to the user; they never override `warnings`, and reconciliation never reads them.
- `gasPerTx` — via `eth_estimateGas`; `null` where the endpoint rejects override-based estimation.
- `planHashValid` — false means the plan was modified after `action` built it.

Top level: `ok` is true iff every plan has zero warnings; `halted` reports where a revert stopped the chain.

**Rules: any warning → stop, report, never sign. Zero warnings → still perform intent alignment (compare `effects` with what the user actually asked for) before proceeding.**

## Endpoint requirements

Simulation needs `debug_traceCall` with `callTracer` (+`withLog`) and `prestateTracer` (+`diffMode`), honoring `stateOverrides`. Verified working: `rpc.monad.xyz`, `rpc4.monad.xyz`, `rpc-mainnet.monadinfra.com`, `monad-rpc.huginn.tech`. Several third-party free tiers block the `debug` namespace; Moss fails loudly with this list rather than skipping simulation. Details and evidence: [ADR 0002](./adr/0002-simulation-via-debug-tracecall.md).
