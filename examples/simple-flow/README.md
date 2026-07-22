# Simple Flow — Verify Moss core flow in 3 minutes

A minimal set of standalone scripts that exercise Moss's core flow without a local fork, private keys, or funded accounts. Ideal for a first-time checkout.

## Scripts

| Script | Command | What it does |
|---|---|---|
| WMON wrap | `pnpm wrap` | Wraps native MON into WMON (ERC-20). Calls the WMON Capability from `@themoss/system`, simulates, and prints the receipt |
| Kuru quote + swap | `pnpm swap` | Requests a MON → USDC quote from Kuru CLOB DEX (Query), then builds and simulates a Swap Capability using the quoted price |
| PancakeSwap V2 swap | `pnpm pancakeswap-v2` | Routes a MON → USDC swap through PancakeSwap V2 and simulates — demonstrates Capability reuse across Protocols |

## Prerequisites

- Node 22+ and pnpm 11
- A Monad RPC URL. Set via `MOSS_RPC_URL`, or the default public endpoint is used
- No private key or funded account needed — Moss builds and simulates only, it never signs

## Quick start

```bash
pnpm install
pnpm build

export MOSS_RPC_URL=https://rpc.monad.xyz

# Wrap native MON to WMON
pnpm --filter @themoss/example-simple-flow wrap

# Swap MON to USDC on Kuru
pnpm --filter @themoss/example-simple-flow swap
```

Every run prints the Query result, the constructed Capability tree, and the simulation Outcome (Changes and Receipt texts). If simulation produces Warnings the script stops with a non-zero exit — this is expected behavior demonstrating Moss's safety gate.

## How it differs from agent-swap

`agent-swap` is an end-to-end demo that includes a local fork, signing, and sending. `simple-flow` skips the fork and keys — it focuses purely on letting you see `discover → load → action → simulate` in the shortest possible path.

## Configuration

All scripts accept these environment variables:

- `MOSS_RPC_URL` — custom Monad RPC endpoint
- `MOSS_ACCOUNT` — custom sender address (defaults to `0xcccc...cccc`)
