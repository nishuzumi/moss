# Security

Moss builds and verifies unsigned transactions. It never signs, sends, stores keys, or replaces wallet review.

## Verification model

1. A write is an ordered Capability tree. Every Capability owns exactly one direct transaction and one Receipt parser.
2. Simulation executes transactions in depth-first order against chained Monad state.
3. Each successful transaction produces an immutable ordered Change array containing every raw Event and native MON transfer, including positive value moved by `CALL`, `CREATE`, `CREATE2`, or `SELFDESTRUCT`.
4. The owning Protocol parses those Changes into a structured Receipt. Nested Receipts may interpret continuous intervals through another Protocol.
5. Core recursively flattens Receipt leaves and requires exact original-object identity, length, and order. Missing, duplicated, replaced, or reordered Changes halt the flow.
6. The Agent compares structured Outcomes with the user's original intent before handing transactions to a signer.

A reverted transaction has no Receipt. Simulation preserves Receipts from earlier successful transactions, records revert diagnostics, and does not execute later transactions. A failed internal frame is excluded with its entire subtree, even when an RPC returns logs for that frame.

Any Warning is terminal. Receipt text never overrides structured evidence.

## Trust boundaries

- Registered Protocol packages are trusted executable code. Protect them with package provenance, review, compile-time fixtures, runtime validation, and live tests.
- Receipt parsing is pure: it receives only the successful transaction's Changes and may not read Runtime, Handle, Query, or RPC state.
- An unauthenticated hash is not tamper protection. A future signer attestation would require an authenticated signature and verifier.
- Runtime verifies that its RPC reports Monad mainnet chain ID `143`. Moss v1 rejects every other chain.
- Fixed official addresses require a canonical source, deployed bytecode verification, and expected token metadata where applicable. Dynamic addresses must be derived and validated from chain state.

## Deliberate limits

- Simulation is a snapshot, not a promise of later execution. On-chain slippage and authorization checks remain mandatory.
- Cross-chain outcomes cannot be verified by a Monad-only simulation.
- Protocol upgrades can change behavior after a package release; address provenance and live tests reduce but do not remove that risk.
- Unsupported trace evidence fails closed. Moss never invents Change order or silently skips unavailable evidence.

## Reporting a vulnerability

Use GitHub private vulnerability reporting. Do not disclose a vulnerability in a public issue. We aim to acknowledge reports within 72 hours.
