# Moss simple-flow examples

This directory contains two small, runnable examples for the current Moss
workflow. They read live Monad mainnet state, but they only build and simulate
**unsigned** transactions.

Moss never asks for a private key, signs a transaction, or sends a transaction.

## Before you run

Use Node.js 22+ and pnpm 11+.

```bash
pnpm install
pnpm build
```

The examples use the default Monad RPC unless `MOSS_RPC_URL` is set. You may
optionally set `MOSS_ACCOUNT` to the address whose transactions should be
simulated; otherwise the examples use a placeholder address.

## Run an example

Run the smallest complete workflow:

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

Run a Kuru MON-to-USDC quote and swap simulation:

```bash
pnpm --filter @themoss/example-simple-flow swap
```

The exact quote, Receipt text, and simulation result can change because the
examples read current Monad mainnet state.

## The workflow

For the WMON example, the recorded user request is:

> Wrap 1.5 MON into WMON for this account.

The examples start after an application or Agent has recorded the user's
request. Moss does not turn natural language into an intent by itself.

```text
Recorded user request
        |
        v
discover
Find matching Capability or Query coordinates
        |
        v
load
Read the selected operation's intent, risks, and parameter contract
        |
        v
action
Run a Query or build an unsigned Capability tree
        |
        v
simulate
Execute the Capability tree against current chain state
        |
        v
Receipt texts and Warnings
        |
        v
User or Agent compares the evidence with the original request
        |
        v
Optional wallet review and signing outside Moss
```

A Warning is a stop signal. Do not hand a Capability tree to a signer when
simulation halts or produces any Warning.

## `wrap`: the complete four-stage example

`src/wmon-wrap.ts` is the smallest example that explicitly shows every Moss
stage.

### 1. Discover

```ts
registry.discover({ verb: "wrap" });
```

`discover` returns small coordinates describing available operations. It helps
the caller select an operation, but does not return a full parameter schema or
construct a transaction.

### 2. Load

```ts
registry.load([{ protocol: "wmon", method: "wrap" }]);
```

`load` returns the selected operation's intent, risk labels, and parameter
declarations. Read these contracts before supplying values to `action`; do not
guess units or field meanings from parameter names.

### 3. Action

```ts
const capability = await registry.action("wmon", "wrap", ACCOUNT, {
  amount: "1.5",
});
```

For a write operation, `action` returns a Capability tree. Each Capability owns
one direct unsigned transaction and one named Receipt parser. The returned tree
is not signed, sent, or safe to edit by hand.

### 4. Simulate

```ts
const outcome = await simulator.simulate(capability);
```

`simulate` executes the Capability tree against current chain state. It returns
transaction results, Warnings, and verified Receipts.

A clean result requires both of the following:

- `outcome.halted` is not set;
- every result has an empty `warnings` array.

Only then should an Agent or user compare the ordered Receipt text with the
original request before optional wallet review.

## `swap`: quote, Capability, and simulation

`src/kuru-swap.ts` demonstrates a Kuru MON-to-USDC flow.

It first runs a read-only Query:

```ts
const quote = await registry.action("kuru", "quote", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
});
```

A Query returns data immediately and never creates a transaction.

The example then builds a swap Capability:

```ts
const capability = await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  slippage: 50,
});
```

Finally, it simulates that Capability and stops if a Warning appears.

This script starts from a known Kuru method to keep the code small. To see
`discover` and `load` used with the Kuru swap itself, continue with the
[Getting started guide](../../docs/getting-started.md).

## Expected console structure

The wrap example prints these stages:

```text
1. discover
2. load
3. action
4. simulate
```

After a clean simulation, it prints Receipt text and reminds the caller to
compare the Receipt with the user's intent before signing.

The swap example prints:

```text
quote
capability
simulation
```

Neither output means that a transaction was sent. They describe a simulated
result only.

## Continue learning

- [Getting started](../../docs/getting-started.md) rebuilds the full workflow one stage at a time.
- [MCP tools reference](../../docs/mcp-tools.md) documents `discover`, `load`, `action`, and `simulate`.
- [Agent safety rules](../../docs/agent-skill.md) explains mandatory simulation, Warning handling, and intent alignment.
