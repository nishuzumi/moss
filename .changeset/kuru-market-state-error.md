---
"@themoss/protocol-kuru": patch
---

Read a Kuru market that reverts with `MarketStateError()` as not trading rather than as an
unmeasured route. The market names itself as the cause and refuses at every size, so its leg now
prices zero: the route is measured, the comparison stays exhaustive, and `swap` no longer refuses
a pair because one of its verified markets has stopped accepting orders. The error is decoded
against the vendored OrderBook ABI; any other revert, with or without data, is still reported as
unavailable. A market that has answered this way is not asked again within the same request, so
the reverse search does not spend its allowance on the same answer.
