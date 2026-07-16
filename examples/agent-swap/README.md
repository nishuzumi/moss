# Agent swap on a local Monad fork

This example separates construction and verification from signing. Moss never receives a key; a small wallet process signs only a reviewed Capability tree on a disposable local fork.

The three roles are explicit:

- `swap` records intent, builds and simulates a Kuru Capability, compares the structured Outcome, and writes unsigned JSON;
- `wallet` validates the tree and sender, re-simulates on the same local fork, then signs and sends;
- an Agent may drive the same `discover → load → action → simulate` flow through MCP, but must perform intent alignment before invoking the wallet.

## Prerequisites

Install Node 22+, pnpm 11, and the Monad build of Foundry. The Monad `anvil` build provides the gas model and tracing support used by this example.

```bash
curl -L https://foundry.category.xyz | bash
foundryup --network monad
pnpm install
pnpm build
```

The included private key is Anvil's public development account #0. It has value only on the local fork. Never fund or use it on a public network.

## Run the deterministic example

Start a local fork and fund the development account:

```bash
pnpm --filter @themoss/example-agent-swap fork
```

Build, simulate, verify, and write one unsigned Capability tree:

```bash
pnpm --filter @themoss/example-agent-swap swap -- verified-capability.json
```

The script stops on every Warning. It also compares Capability parameters and the final structured Kuru Outcome with the requested sender, assets, amount, and slippage.

Review the printed ordered Receipts and the JSON file. Receipt text is presentation; the structured Outcomes are the evidence.

Only after review, send the transactions on the local fork. The wallet re-simulates before broadcasting and stops if the current fork state produces any Warning, revert, missing Receipt, or result-count mismatch.

```bash
pnpm --filter @themoss/example-agent-swap wallet -- send verified-capability.json
```

## Drive it through MCP

The repository's `.mcp.json` points Moss at `http://127.0.0.1:8545`, the same fork used by the wallet.

Open Claude Code at the repository root after starting the fork, then ask:

> Use moss to swap 1 MON into USDC on Kuru on the local fork.

The [`moss-trader`](../../.claude/agents/moss-trader.md) procedure obtains the wallet address, records balances, and calls the four Moss tools.

It stops on every Warning, compares every ordered Receipt text with the request, and writes the exact Capability JSON.

The Agent must not hand-edit, reconstruct, or reorder the Capability tree. If parameters change, it must call `action` and `simulate` again.

## Inspect the wallet manually

```bash
pnpm --filter @themoss/example-agent-swap wallet -- address
pnpm --filter @themoss/example-agent-swap wallet -- balance
pnpm --filter @themoss/example-agent-swap wallet -- send /absolute/path/to/capability.json
```

The wallet refuses trees for a different sender. It also requires the local RPC to report Monad chain ID `143` and re-simulates the Capability immediately before sending.

## Reset the fork

The fork is disposable local state. Stop it with `pkill anvil`; the next `fork` command starts from the current Monad mainnet tip and funds the development account again.
