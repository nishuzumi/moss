---
"@themoss/protocol-kuru": patch
---

Pin each quote's verification, probes, and pause evidence to one block. Exclude a
market only when the exact MarketStateError is corroborated by reviewed deployed
runtime bytecode and an explicit soft/hard paused state. Unknown implementations,
active/unknown states, malformed errors, and failed reads remain unavailable, so
swap's default exhaustive comparison remains fail-closed. Refresh deployment
tripwires and record degraded OrderBook verification without claiming an explorer
ABI comparison passed.
