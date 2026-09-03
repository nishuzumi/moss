---
name: Protocol onboarding
about: Request or propose a new protocol adapter for the Moss catalog
title: "[protocol] "
labels: protocol
---

## Protocol

- Name / website / docs:
- Deployed on: <!-- Monad mainnet / testnet, addresses -->
- Contract addresses & ABI source: <!-- verified explorer link, GitHub, npm package -->

## Capabilities to support

<!-- Which user actions, using Moss verbs: swap / wrap / unwrap / supply / withdraw / borrow / repay / stake / unstake / claim / mint / transfer / approve / open / close -->

| Verb | What it does | Risk labels |
| ---- | ------------ | ----------- |
|      |              |             |

## Queries to support

<!-- Read-only data worth exposing: APY, positions, quotes, claimable amounts... -->

## Parameter notes

<!-- Defaults and constraints agents should know: slippage, deadlines, min amounts, cooldowns... -->

## Quirks & risks

<!-- Anything non-obvious: fee-on-transfer tokens, cleanup calls (refund/unwrap/sweep), two-step withdrawals, pausable contracts... -->

When no current closed-set RiskLabel accurately applies, document the reviewed operation with
`risk: []`. This is not a substitute for analysis: raise a focused Core vocabulary issue first
when a recurring reusable danger semantic is missing, wait for the maintainer decision, and ask
for Core or maintainer review when uncertain. Replace `[]` if Core later defines an applicable
label. Receipt evidence remains authoritative and must be able to refute a no-outbound claim.

## Are you affiliated with the protocol?

<!-- Team member / community contributor. Team involvement helps us keep the adapter maintained. -->
