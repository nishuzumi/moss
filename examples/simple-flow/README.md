# Moss simple-flow examples

This directory contains two small, runnable examples for the current Moss
workflow. They read live Monad mainnet state, but only build and simulate
**unsigned** transactions.

## Before you run

Use Node.js 22+ and pnpm 11+.

```bash
pnpm install
pnpm build
```

The examples use the default Monad RPC unless `MOSS_RPC_URL` is set. You may
optionally set `MOSS_ACCOUNT` to the address whose transactions should be
simulated; otherwise the examples use a placeholder address.

## Run the examples

Run the complete WMON workflow in
[`src/wmon-wrap.ts`](./src/wmon-wrap.ts):

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

Run the Kuru MON-to-USDC quote and swap simulation in
[`src/kuru-swap.ts`](./src/kuru-swap.ts):

```bash
pnpm --filter @themoss/example-simple-flow swap
```

The exact quote, Receipt text, and simulation result can change because the
examples read current Monad mainnet state.

## The workflow

For the WMON example, the recorded user request is:

> Wrap 1.5 MON into WMON for this account.

```text
Recorded user request
        |
        v
discover
Find matching Capability or Query coordinates
        |
        v
load
Read the selected operation contract
        |
        v
action
Run a Query or build an unsigned Capability tree
        |
        v
simulate
Check the Capability against current chain state
        |
        v
Receipt / Warning
```

## Safety boundary

These examples do not ask for a private key, sign a transaction, or send a
transaction. `action` builds an unsigned Capability tree, and `simulate` checks
it before any optional wallet review outside Moss.

A Warning is a stop signal. Do not hand a Capability tree to a signer when
simulation halts or produces any Warning. After a clean simulation, compare the
Receipt with the original user request before considering a signature.

For the full step-by-step Registry API tutorial and detailed workflow
explanations, continue with [Getting started](../../docs/getting-started.md).

