---
"@themoss/core": patch
---

Allow Capabilities to explicitly author `risk: []` when no current closed-set RiskLabel applies, while keeping `risk` required and preserving malformed and unknown-label validation. This is an Agent-facing semantic change; Receipt evidence remains authoritative.
