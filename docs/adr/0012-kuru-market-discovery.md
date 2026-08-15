# Kuru markets come from the official filtered API and are verified on-chain

Kuru has no pair-indexed on-chain `getPool`; its official SDK discovers candidate markets through the filtered-markets API. The Kuru Protocol follows that discovery path for direct and via-MON candidates, then verifies every returned market against the Router's on-chain `verifiedMarket` data before quoting or constructing a Capability. The API supplies candidates, never trusted market facts.

The filtered-markets HTTP request is bounded by a timeout, maximum response size, maximum candidate count, and maximum constructed route count. Discovery failure, malformed responses, oversized responses, excessive candidates, and excessive direct or via-MON route combinations stop the Query or Capability before unbounded on-chain verification or quoting fanout.

“Direct” and “via MON” are path classes, not single markets. Kuru quotes every verified direct market and every verified two-market combination through native MON, then selects the best result using the swap-side rules. API response order never determines the selected market; an equal quote still prefers a direct path.

The public quote is advisory. Capability construction repeats discovery and quoting against current state, selects the path itself, and derives current slippage protection. An Agent cannot supply a market address, path, or quote identifier to `swap`; stale or manipulated routing data therefore cannot enter the Capability request.

The reverse search may call a target out of reach on one kind of evidence only: the route priced the largest size its market can be asked for — the `uint96` maximum of the size argument, not a guess — and still fell short. A market refusing a probe is not that evidence. Its arithmetic giving out at one size says nothing about a smaller one, and the opening guess assumes a 1:1 price, so on any route that gains it starts far above where the answer lives. Reading a refusal there as an answer reported an unreachable target for a pair that prices, and beside a worse route that happened to succeed it did something quieter and worse: the failed route left no gap behind, so the expensive answer went out looking like a complete comparison. The search therefore comes down to a size the route will price before concluding anything, unbudgeted where the refusal is viem's and free, bounded where it is the market's and costs a call each time. Running out of that budget reports the route as unmeasured; it never produces an answer.

A comparison that could not be completed is reported, and a write refuses it by default. Some verified routes fail to evaluate on mainnet as a matter of course — an empty revert attributes nothing, and the same three markets do it on every run — so a quote answers with the winner and lists the candidates it could not measure, rather than refusing a pair that prices. A swap is not advisory: `requireExhaustive` defaults to true and stops Capability construction when any candidate went unmeasured, because the route that failed might have been the better one and a write is not the place to guess. A caller who values availability over exhaustiveness opts out explicitly. The reported gap carries a stable category, never the underlying error text, which in viem holds the RPC URL and request body and would publish an endpoint key through an otherwise successful Query.

Quote results stay at the Agent-facing level. Exact-input quotes return the fixed input, estimated output, and minimum output; target-output quotes return the estimated input, maximum input, and minimum target output. Both return the selected token path in human display units, but do not expose raw integers, market addresses, or SDK structures.

The Protocol implements the small HTTP request with the platform `fetch`; it does not depend on the full Kuru SDK, whose ethers v5 and HTTP stack would duplicate Moss's viem-based runtime.

The Kuru package owns the official `https://api.kuru.io` base URL. This protocol-specific service configuration does not enter Core, Runtime, or Capability parameters. Discovery failure, malformed responses, and failed on-chain verification stop quoting and Capability construction with an explicit error; there is no static-market fallback.

The Kuru package also owns its fixed Router deployment and the private zero-address conversion used for native MON. Shared token addresses remain imports from `@themoss/system`; market addresses remain dynamic. The Router constant cites its official source and has an on-chain deployed-bytecode check. The ABI cross-check manifest (`abis.json`, ADR 0007) pins the Router proxy's *implementation* address and the Router-reported market-template implementation for provenance verification only; they never enter runtime routing and do not weaken the dynamic-market rule.

## Considered Options

- **Fail closed everywhere** — rejected because an incomplete comparison is the normal state for a liquid pair on mainnet, so refusing advisory quotes would make it unquotable for a reason no caller can act on.
- **Report the gap and never refuse** — rejected because a Capability spends funds on a route chosen from a subset, and the transaction tree has nowhere to carry the caveat the caller would need.
- **Static market addresses** — rejected because new markets require code releases and the adapter silently supports only an allowlist.
- **Index `MarketRegistered` on every call** — valid and fully on-chain, but duplicates an indexer inside a request path when Kuru already exposes the same candidate lookup used by its SDK.
- **Trust API results directly** — rejected because an unavailable or compromised discovery service must not choose unverified transaction targets.
- **Configure the Kuru API through Runtime** — rejected because a protocol-specific endpoint would couple Core to Kuru without a current need for user configuration.
- **Fall back to bundled markets** — rejected because stale addresses would silently restore the static allowlist this decision removes.
