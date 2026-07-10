# agent-swap — a real agent trading on a local Monad mainnet fork

The other examples simulate and stop. This one closes the loop: a Claude Code
subagent (`moss-trader`) drives the Moss MCP tools end to end — `discover →
load → action → simulate` — and, only when simulation comes back clean, hands
the unsigned Plan to a tiny local wallet script that signs and sends it. The
trade lands on a **local anvil fork of Monad mainnet**, so real orderbook
state, zero real funds, zero configuration, zero secrets.

The split is the point:

- **Moss** (the MCP server) builds and verifies. It never signs.
- **The wallet** (`src/wallet.ts`, ~100 lines of viem) signs and sends. It
  never builds. It refuses Plans for other chains or other accounts.
- **The agent** is the only thing that knows what the user asked for — it
  simulates, checks the warnings, aligns effects with intent, then and only
  then crosses the trust boundary.

## Prerequisites

- Node ≥ 22, pnpm, and [Claude Code](https://claude.com/claude-code)
- The **Monad flavor of Foundry** — its anvil forks mainnet with Monad's gas
  model, opcode pricing, and `debug_traceCall` support (which Moss simulation
  requires; the hosted fork services we tried don't expose geth-style tracers):

  ```bash
  curl -L https://foundry.category.xyz | bash
  foundryup --network monad
  ```

## Run it

```bash
pnpm install && pnpm build

claude   # open Claude Code at the repo root; approve the `moss` MCP server
```

Then just ask:

> Use moss to swap 1 MON into USDC on Kuru.

The `moss-trader` subagent (defined in [`.claude/agents/moss-trader.md`](../../.claude/agents/moss-trader.md),
wired to the `moss` MCP server declared in [`.mcp.json`](../../.mcp.json) —
nothing to configure by hand) will:

1. run `pnpm --filter @mossxyz/example-agent-swap fork` — idempotently starts
   `anvil --fork-url https://rpc.monad.xyz` on `127.0.0.1:8545` and funds the
   demo wallet with 1,000,000 MON via `anvil_setBalance`;
2. call `discover` / `load` / `action` to build the Plan for the wallet's
   address, then `simulate` it — **any warning stops the flow before a
   signature exists**;
3. write the verified Plan to a temp file and run
   `pnpm --filter @mossxyz/example-agent-swap wallet send <plan.json>`;
4. report transaction hashes and the wallet's balances before and after.

## The wallet, by hand

Everything the agent does you can do yourself:

```bash
pnpm --filter @mossxyz/example-agent-swap fork      # start + fund (idempotent)
pnpm --filter @mossxyz/example-agent-swap wallet address
pnpm --filter @mossxyz/example-agent-swap wallet balance
pnpm --filter @mossxyz/example-agent-swap wallet send /path/to/plan.json
```

The key inside `src/dev-wallet.ts` is anvil's dev account #0 — publicly known
by every anvil user on earth, valuable only on your local fork. Never fund it
anywhere real.

## Notes

- The fork is disposable state on your machine. Kill it with `pkill anvil`;
  the next `fork` run starts fresh from the current mainnet tip.
- The `moss` MCP server in `.mcp.json` points at `127.0.0.1:8545`, so
  `simulate` verifies against exactly the state the trade will execute on.
