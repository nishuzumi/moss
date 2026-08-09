---
"@themoss/protocol-kuru": patch
---

Distinguish Kuru quote failures instead of collapsing them into one message. Exports
`KuruQuoteError` with a stable `code` (`NO_VERIFIED_ROUTE`, `NO_POSITIVE_QUOTE`,
`ROUTE_QUOTE_UNAVAILABLE`, `TARGET_OUTPUT_UNSATISFIABLE`), the request side, and each evaluation
that did not complete with the token path of the route it belonged to. A successful quote now
carries the same provenance in `unavailable`, so a partial comparison is no longer indistinguishable
from an exhaustive one.
