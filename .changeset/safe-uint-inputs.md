---
"@themoss/core": patch
---

Reject unsafe JavaScript number inputs for uint parameters before precision can be lost. Pass large uint values as decimal strings for exact decoding.
