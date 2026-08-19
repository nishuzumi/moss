# @themoss/protocol-ai-explorer

Moss protocol adapter for the AI Monad Explorer on-chain analysis registry.

The registry (`AnalysisRegistry.sol`) stores caller-supplied records about
transaction hashes: `submitAnalysis(txHash, aiSummary)` appends a record
keyed by `msg.sender`, and getters read records back. The adapter exposes
`submit` (Capability), `getAnalysis`, and `totalAnalyses` (Queries).

## Provenance boundary

This package records **assertions, not verified facts**. The contract stores
whatever strings callers submit; an on-chain record proves only that someone
submitted that text for that hash at that timestamp. It does NOT prove the
hash exists, that the text was AI-generated, or that either is trustworthy.
The adapter's wording and Receipt outcomes stay inside that boundary.

- ABI: vendored from the pinned Foundry artifact
  `github.com/Chichuzxy/ai-monad-explorer@8757c1a613e3fde9678c1eab892502ba7e199dc8`
  (ADR 0007). `test/abis.test.ts` enforces exact derivation from the
  committed fixture and pins the complete public surface (including the
  `analyses` and `userAnalyses` getters).
- Receipts authenticate the emitter: only events from the fixed
  `ANALYSIS_REGISTRY_ADDRESS` are evidence; same-signature events from any
  other contract are rejected.
- Submit parameters are validated: `txHash` must be an exact 32-byte hash
  and `aiSummary` is capped at `MAX_SUMMARY_LENGTH` (512) chars.

## Deployment status

**Testnet only.** The pinned address
`0x82344C1BD7720cfddbD5aec33E99571DC6628EA5` is a Monad Testnet (10143)
deployment, bytecode-verified against the pinned artifact. Moss Runtime only
accepts Monad mainnet (143) RPCs, so this package **must not ship** until a
reviewed mainnet deployment exists. There is deliberately no chain map or
testnet escape hatch.

## Capabilities

| kind       | method          | verb     | category | risk      | notes                       |
| ---------- | --------------- | -------- | -------- | --------- | --------------------------- |
| Capability | submitAnalysis  | submit   | tool     | gasOnly   | writes one record           |
| Query      | getAnalysis     | —        | —        | —         | reads one record by ID      |
| Query      | totalAnalyses   | —        | —        | —         | reads the record count      |

## Checks

```bash
pnpm --filter @themoss/protocol-ai-explorer build
pnpm --filter @themoss/protocol-ai-explorer typecheck
pnpm --filter @themoss/protocol-ai-explorer test
```

## Follow-ups before this can ship

- [ ] Deploy `AnalysisRegistry` on Monad mainnet (143) and get it reviewed.
- [ ] Update `ANALYSIS_REGISTRY_ADDRESS` and the ABI provenance header.
- [ ] Add `test-online` bytecode/live coverage (needs mainnet deployment).
