# Agent swap example

This example is temporarily unavailable while its source migrates to the accepted Capability-tree and Receipt contracts. Do not use its current TypeScript files as API documentation.

The migrated example must demonstrate one end-to-end boundary:

1. an Agent records the user's swap intent;
2. `discover`, `load`, and `action` return one root Capability tree;
3. `simulate` returns ordered structured Receipts with zero Warnings;
4. the Agent aligns Receipt Outcomes with the user's words;
5. a separate local-fork wallet receives only the verified unsigned transactions and remains the sole signer.

Moss must never receive a private key or send a transaction. The example will be re-enabled only after the new public contracts, simulator checks, and wallet handoff compile together.
