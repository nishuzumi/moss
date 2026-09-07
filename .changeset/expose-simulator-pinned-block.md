---
"@themoss/simulator": patch
---

Report the base block a simulate run resolved and pinned for every trace, diff, and gas estimate as `SimulateOutcome.simulatorPinnedBlock`, so a caller can identify the exact state a Live outcome was proven against without re-deriving it from a stage RPC observation or from log inference.
