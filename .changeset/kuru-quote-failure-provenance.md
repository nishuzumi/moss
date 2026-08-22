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
