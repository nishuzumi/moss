# Discovered markets come from the protocol's official API and are verified on-chain

A protocol whose markets are created permissionlessly has no complete on-chain index to read, so its own SDK discovers them through an official HTTP service. A Protocol in this position follows that same discovery path, then re-derives every fact it acts on from chain state before quoting or constructing a Capability. **The service supplies candidates, never trusted market facts**, and a candidate that fails on-chain verification is dropped rather than used.

Two Protocols implement this today, and a third should follow the same shape rather than inventing another.

**Kuru** has no pair-indexed on-chain `getPool`. It discovers direct and via-MON candidates through the filtered-markets API, then verifies every returned market against the Router's on-chain `verifiedMarket` data.

**Pendle** has no enumerable on-chain market list. It discovers candidates through the official markets API, then verifies each one against the official V6 Factory: `isValidMarket(market)` must hold, the market's own `factory()` must point back at the pinned Factory, and `readTokens` must return non-zero, distinct SY/PT/YT. Verifying none of the nominated candidates is an explicit error, not an empty result.

The filtered-markets HTTP request is bounded by a timeout, maximum response size, maximum candidate count, and maximum constructed route count. Discovery failure, malformed responses, oversized responses, excessive candidates, and excessive direct or via-MON route combinations stop the Query or Capability before unbounded on-chain verification or quoting fanout.

“Direct” and “via MON” are path classes, not single markets. Kuru quotes every verified direct market and every verified two-market combination through native MON, then selects the best result using the swap-side rules. API response order never determines the selected market; an equal quote still prefers a direct path.

The public quote is advisory. Capability construction repeats discovery and quoting against current state, selects the path itself, and derives current slippage protection. An Agent cannot supply a market address, path, or quote identifier to `swap`; stale or manipulated routing data therefore cannot enter the Capability request.

Quote results stay at the Agent-facing level. Exact-input quotes return the fixed input, estimated output, and minimum output; target-output quotes return the estimated input, maximum input, and minimum target output. Both return the selected token path in human display units, but do not expose raw integers, market addresses, or SDK structures.

The Protocol implements the small HTTP request with the platform `fetch`; it does not depend on the full Kuru SDK, whose ethers v5 and HTTP stack would duplicate Moss's viem-based runtime.

The Kuru package owns the official `https://api.kuru.io` base URL. This protocol-specific service configuration does not enter Core, Runtime, or Capability parameters. Discovery failure, malformed responses, and failed on-chain verification stop quoting and Capability construction with an explicit error; there is no static-market fallback.

The Kuru package also owns its fixed Router deployment and the private zero-address conversion used for native MON. Shared token addresses remain imports from `@themoss/system`; market addresses remain dynamic. The Router constant cites its official source and has an on-chain deployed-bytecode check. The ABI cross-check manifest (`abis.json`, ADR 0007) pins the Router proxy's *implementation* address and the Router-reported market-template implementation for provenance verification only; they never enter runtime routing and do not weaken the dynamic-market rule.

Each Protocol owns its own service URL, request bounds, and verification predicate; those differ per protocol and do not generalize. What does not vary is the shape: candidates from the service, facts from the chain, explicit failure when verification cannot be performed, and no static fallback.

## Considered Options

These were weighed for Kuru and apply unchanged to any Protocol reaching this decision.

- **Static market addresses** — rejected because new markets require code releases and the adapter silently supports only an allowlist.
- **Index `MarketRegistered` on every call** — valid and fully on-chain, but duplicates an indexer inside a request path when Kuru already exposes the same candidate lookup used by its SDK.
- **Trust API results directly** — rejected because an unavailable or compromised discovery service must not choose unverified transaction targets.
- **Configure the Kuru API through Runtime** — rejected because a protocol-specific endpoint would couple Core to Kuru without a current need for user configuration.
- **Fall back to bundled markets** — rejected because stale addresses would silently restore the static allowlist this decision removes.
