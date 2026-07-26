# Simple Flow — Verify Moss core flow in 3 minutes

A minimal set of standalone scripts that exercise Moss's core flow without a local fork, private keys, or funded accounts. Ideal for a first-time checkout.

## Scripts

| Script | Command | What it does |
|---|---|---|
| WMON wrap | `pnpm wrap` | Walks through the full `discover → load → action → simulate` cycle. Discovers WMON capabilities, loads parameter contracts, builds a wrap Capability from `@themoss/system`, simulates it, and prints the ordered Receipt texts |
| Kuru quote + swap | `pnpm swap` | Calls `kuru.quote` (a Query returning structured price data) then independently builds and simulates a `kuru.swap` Capability for a MON → USDC trade. The swap Capability constructs its own parameters from scratch — it does not reuse the quote result |
| PancakeSwap V2 swap | `pnpm pancakeswap-v2` | Calls `pancakeswap-v2.quote` (a Query) then independently builds and simulates a `pancakeswap-v2.swap` Capability. Demonstrates that the same pattern works for another AMM Protocol without special framework changes |

## Prerequisites

- Node 22+ and pnpm 11
- A Monad RPC endpoint. The endpoint must serve chain ID 143 and support `debug_traceCall` with prestate and state-override. Set via `MOSS_RPC_URL`, or the default public endpoint is used
- No private key or funded account needed — Moss builds and simulates only, it never signs

## Quick start

```bash
pnpm install
pnpm build

export MOSS_RPC_URL=https://rpc.monad.xyz

# Walk through discover → load → action → simulate
pnpm --filter @themoss/example-simple-flow wrap

# Swap MON to USDC on Kuru
pnpm --filter @themoss/example-simple-flow swap
```

Each script prints its results — Query data (where applicable), the constructed Capability tree, and the full simulation result. If simulation produces Warnings the script stops with a non-zero exit — this is expected behavior demonstrating Moss's safety gate. On a clean run, the ordered Receipt texts are printed after the simulation, so you can compare them against the user's intent before signing.

## How it differs from agent-swap

`agent-swap` is an end-to-end demo that includes a local fork, signing, and sending. `simple-flow` skips the fork and keys — it focuses purely on letting you see the core flow in the shortest possible path.

## Configuration

All scripts accept these environment variables:

- `MOSS_RPC_URL` — custom Monad RPC endpoint (must support chain ID 143 and `debug_traceCall`)
- `MOSS_ACCOUNT` — custom sender address (defaults to `0xcccc...cccc`)
