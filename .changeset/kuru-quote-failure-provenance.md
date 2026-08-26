---
"@themoss/protocol-kuru": patch
---

Distinguish Kuru quote failures instead of collapsing them into one message. Exports
`KuruQuoteError` with a stable `code` (`NO_VERIFIED_ROUTE`, `NO_POSITIVE_QUOTE`,
`ROUTE_QUOTE_UNAVAILABLE`, `TARGET_OUTPUT_UNSATISFIABLE`), the request side, and each evaluation
that did not complete with the token path of the route it belonged to. A successful quote carries
the same provenance in `unavailable`, as a stable category rather than the underlying error text,
which in viem holds the RPC endpoint and request body. Discovery failures are sanitized the same
way, and the live errors kept for programmatic inspection are non-enumerable.

The reverse search now concludes a target is out of reach only after pricing the largest input the
market can be asked for, derived from the `uint96` size argument and the market's own precision. A refusal from the market itself, or from a leg the search never sized,
is reported as an unmeasured route instead — previously either could produce a definitive answer,
and beside a route that happened to price it produced a worse quote that looked exhaustive.

`swap` gains `requireExhaustive`, defaulting to true: a write refuses an incomplete comparison
unless the caller opts out. A target that rounds below the token's smallest unit is refused rather
than quoted with a zero floor.

One quote request is now bounded in the chain work it may spend, not only in the routes it may
consider. Routes are evaluated by a fixed number of workers instead of all at once, and calls are
counted against a per-route cap and a shared per-request allowance, charged at the leg so a route
that priced two legs before a third refused to encode has still spent two. `KuruUnavailableReason`
gains `budget-exhausted` for a route stopped that way, so a caller can tell a limit this adapter
imposed from a market that would not answer.

A multi-leg route that prices at its first leg's encodable maximum and still falls short is now
`TARGET_OUTPUT_UNSATISFIABLE` rather than an unmeasured route: the route's input is the first leg's
input at any length, so nothing larger can be asked for. A refusal at that size is still a gap.
