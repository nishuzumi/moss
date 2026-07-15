# Simulation requires debug_traceCall and provably ordered evidence

Monad mainnet does not implement `eth_simulateV1` (verified empirically 2026-07-06: `-32601 Method not found`), so multi-transaction simulation uses `debug_traceCall`. For each TransactionNode derived from a Capability tree, simulation obtains call/log evidence and a `prestateTracer` state diff, then merges that diff into accumulated `stateOverrides` so the next transaction executes on the resulting state. The evidence source must establish the exact interleaving of successful Events and native-value movements; if it cannot prove that total order, simulation fails rather than approximating it.

The trace is raw evidence for protocol-owned Receipt parsing, not a protocol-agnostic effects summary. Reverted internal frames remain diagnostics and never enter the Change array.

## Evidence (Monad mainnet, 2026-07-06 through 2026-07-15)

All four primitives verified live against public endpoints: state overrides are genuinely executed (code override returned the planted constant; per-slot `stateDiff` override honored), `callTracer` returns logs, `prestateTracer` returns pre/post diffs. Endpoint support is uneven: `rpc.monad.xyz`, `rpc4.monad.xyz`, `rpc-mainnet.monadinfra.com`, and `monad-rpc.huginn.tech` pass everything; dRPC free tier, OnFinality public, bloXroute, and even the official `rpc3.monad.xyz` block or limit the `debug` namespace.

A synthetic state-override trace verified exact interleaving on `rpc.monad.xyz`: a parent log before a child call returned `position: 0, index: 0`, the child's log returned `index: 1`, and a parent log after the child returned `position: 1, index: 2`. The extractor therefore emits a successful frame's positive-value native transfer on frame entry, then alternates that frame's logs at each `position` with its ordered child calls. The internal `position` and `index` fields are ordering evidence and are discarded from the public Event after extraction.

Monad retains logs inside a failed child frame even though the frame reports `error`, so the extractor must discard the entire failed subtree rather than assume the tracer has removed reverted logs. A separate synthetic trace confirmed that `SELFDESTRUCT` appears as an ordered child frame carrying `from`, `to`, and `value`; a positive value is therefore a native transfer Change.

## Considered Options

- **`eth_simulateV1`** — not implemented on Monad.
- **Local anvil fork** — works anywhere but adds a foundry binary dependency for every contributor and CI job, and is an order of magnitude slower. Rejected for the current scope; no alternate backend abstraction is maintained speculatively.
- **Third-party simulation APIs (Tenderly-style)** — wrong first dependency for open infrastructure (keys, vendor lock-in).
- **`eth_call` + state overrides as the engine** — rejected: returns only the function return value, without the logs, call tree, and state diff required for exhaustive Change extraction and multi-transaction chaining. Retained only as an auxiliary read/quote primitive.

## Consequences

- The default RPC endpoint is `rpc.monad.xyz` (full support, no key).
- Monad's `debug_traceCall` **enforces sender balance** (discovered 2026-07-07: a 2-MON transfer from an underfunded address is rejected with `insufficient balance`, unlike geth's default). The simulator therefore pre-funds the transaction sender via a balance override — matching `eth_simulateV1`'s validation-off semantics. Simulation answers "what would this transaction do", not "can the account afford it"; affordability is the wallet's question at signing time.
- When `debug_traceCall` is unavailable or cannot supply provably ordered Change evidence, simulate fails loudly — it never silently skips evidence or falls back to an approximate ordering.
- Exact ordering is reconstructed in one recursive pass over call-frame `position` data; no generic effects accumulator, second event pass, or protocol ABI is involved.
- All simulation requests set an explicit, modest `gas` value; provider free tiers reject calls that fall back to the node's block-gas-limit default.
- Trace `gasUsed` appears to report the gas limit rather than actual consumption; gas estimates go through `eth_estimateGas` separately.
