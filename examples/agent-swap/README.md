# Agent swap example

This example keeps planning/simulation and signing in separate processes:

1. `pnpm --filter @themoss/example-agent-swap fork`
2. `pnpm --filter @themoss/example-agent-swap swap -- verified-capability.json`
3. Review the Capability and the ordered Receipt printed by step 2.
4. `pnpm --filter @themoss/example-agent-swap wallet -- send verified-capability.json`

`swap` loads Kuru, records the requested assets, amount, slippage, and sender, builds one Capability tree, simulates every transaction, rejects any Warning, and compares the final structured Receipt outcome with that intent before writing the unsigned tree. Receipt text is displayed for review but is not used as evidence. `wallet` owns the public local-fork development key, validates the tree and sender, and is the only process that signs or sends.

Never use the included development key on a public network.
