---
"@themoss/protocol-ai-explorer": minor
"@themoss/core": minor
---

Add the AI Explorer analysis-registry adapter (Capability `submit`, Queries
`getAnalysis` / `totalAnalyses`) against the pinned AnalysisRegistry contract
and extend the closed capability taxonomy (ADR 0003) with the `submit` verb,
`tool` category, and `gasOnly` risk label for gas-only record-submission
protocols. The adapter authenticates Receipt emitters against the fixed
registry address, validates exact 32-byte transaction hashes and a 512-char
summary bound, and keeps its wording inside the assertion-only provenance
boundary. The ABI is vendored (ADR 0007) from the pinned Foundry artifact
with a derivation test against the committed fixture.

NOTE: the pinned deployment is Monad Testnet only; the package must not ship
until a reviewed mainnet deployment exists (tracked in the package README).
