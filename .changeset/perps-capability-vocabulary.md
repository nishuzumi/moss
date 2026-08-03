---
"@themoss/core": minor
---

Extend the closed Capability vocabulary for perpetuals (ADR 0003): category `perps`, position-lifecycle verbs `open` and `close` with direction carried by the new closed `PositionSide` parameter (`"long"` or `"short"`), and risk labels `leverage` and `liquidation`. Margin and collateral flows stay on `supply`/`withdraw`.
