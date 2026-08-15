---
"@themoss/simulator": patch
---

Expose the authoritative pinned simulation base block on each `SimulateOutcome` as `simulatorPinnedBlock`, scoped to the run that produced it: filled from the block the run already resolved (no extra chain query), absent when base-block resolution fails, and retained even when the run later reverts or halts.
