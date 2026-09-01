---
"@themoss/simulator": patch
---

Pin one base block per simulate run so per-transaction Change evidence, state
chaining, and gas estimates cannot straddle a block boundary between separate
RPC calls.
