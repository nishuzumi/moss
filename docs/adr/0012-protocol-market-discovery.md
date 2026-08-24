# Discovered markets come from the protocol's official API and are verified on-chain

A protocol whose markets are created permissionlessly has no complete on-chain index to read, so its own SDK discovers them through an official HTTP service. A Protocol in this position follows that same discovery path, then re-derives every fact it acts on from chain state before quoting or constructing a Capability. **The service supplies candidates, never trusted market facts**, and a candidate that fails on-chain verification is dropped rather than used.

Two Protocols implement this today, and a third should follow the same shape rather than inventing another.

**Kuru** has no pair-indexed on-chain `getPool`. It discovers direct and via-MON candidates through the filtered-markets API, then verifies every returned market against the Router's on-chain `verifiedMarket` data.

**Pendle** has no enumerable on-chain market list. It discovers candidates through the official markets API, then verifies each one against the official V6 Factory: `isValidMarket(market)` must hold, the market's own `factory()` must point back at the pinned Factory, and `readTokens` must return non-zero, distinct SY/PT/YT. Verifying none of the nominated candidates is an explicit error, not an empty result.

The filtered-markets HTTP request is bounded by a timeout, maximum response size, maximum candidate count, and maximum constructed route count. Discovery failure, malformed responses, oversized responses, excessive candidates, and excessive direct or via-MON route combinations stop the Query or Capability before unbounded on-chain verification or quoting fanout.

“Direct” and “via MON” are path classes, not single markets. Kuru quotes every verified direct market and every verified two-market combination through native MON, then selects the best result using the swap-side rules. API response order never determines the selected market; an equal quote still prefers a direct path.

The public quote is advisory. Capability construction repeats discovery and quoting against current state and derives current slippage protection. Kuru selects the best path itself, so an Agent cannot supply a market address, path, or quote identifier to its `swap`. Pendle instead accepts one explicit market because each maturity is a different economic product, but construction requires that address to resolve from the freshly discovered and on-chain verified candidate set. In neither Protocol can stale or manipulated routing data enter the Capability request.

Kuru's reverse search may call a target out of reach on one kind of evidence only: the route priced the largest input it can be asked for — derived from the `uint96` maximum of the size argument and the market's own precision, which mainnet markets do not set to their token's decimals — and still fell short. A market refusing a probe is not that evidence. Its arithmetic giving out at one size says nothing about a smaller one, and the opening guess assumes a 1:1 price, so on any route that gains it starts far above where the answer lives. Reading a refusal there as an answer reported an unreachable target for a pair that prices, and beside a worse route that happened to succeed it did something quieter and worse: the failed route left no gap behind, so the expensive answer went out looking like a complete comparison. The search therefore comes down to a size the route will price before concluding anything, unbudgeted where the refusal is viem's and free, bounded where it is the market's and costs a call each time. Running out of that budget reports the route as unmeasured; it never produces an answer.

A Kuru comparison that could not be completed is reported, and a write refuses it by default. Some verified routes fail to evaluate on mainnet as a matter of course — an empty revert attributes nothing, and the same three markets do it on every run — so a quote answers with the winner and lists the candidates it could not measure, rather than refusing a pair that prices. A swap is not advisory: `requireExhaustive` defaults to true and stops Capability construction when any candidate went unmeasured, because the route that failed might have been the better one and a write is not the place to guess. A caller who values availability over exhaustiveness opts out explicitly. The reported gap carries a stable category, never the underlying error text, which in viem holds the RPC URL and request body and would publish an endpoint key through an otherwise successful Query.

That ceiling belongs to the route's first leg, and it holds at any route length: the route's input is the first leg's input, so nothing above that leg's encodable maximum can be asked of the route however many legs follow. Pricing there and falling short is therefore definitive for a two-leg route exactly as it is for one. What is not definitive is a refusal at that size — a later leg giving out proves nothing about the target, only that this route could not be measured, and it stays a gap.

One quote request is bounded in the work it may ask of the chain, not only in the routes it may consider. Routes are evaluated by a fixed number of workers rather than all at once, and calls are counted against a per-route cap and a shared per-request allowance, charged at the leg so a route that priced two legs before a third refused to encode has still spent two. Exhausting either is reported as an unmeasured route under its own reason, never as an answer, so a write refuses it by default rather than trading an unbounded call bill for a comparison. Without this one advisory quote over the 256-route maximum came to roughly ten thousand calls issued in a single 256-wide burst, against whatever endpoint the operator configured.

Kuru quote results stay at the Agent-facing level. Exact-input quotes return the fixed input, estimated output, and minimum output; target-output quotes return the estimated input, maximum input, and minimum target output. Both return the selected token path in human display units, but do not expose raw integers, market addresses, or SDK structures. Pendle exposes its freshly verified market because the Agent selects a maturity, and currently supports exact-input quotes only.

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

These two were weighed for Kuru alone. They turn on comparing several candidates for one swap, which a Protocol that quotes a single explicit market never does.

- **Fail closed everywhere** — rejected because an incomplete comparison is the normal state for a liquid pair on mainnet, so refusing advisory quotes would make it unquotable for a reason no caller can act on.
- **Report the gap and never refuse** — rejected because a Capability spends funds on a route chosen from a subset, and the transaction tree has nowhere to carry the caveat the caller would need.
