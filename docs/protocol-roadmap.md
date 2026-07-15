# Protocol roadmap

This roadmap explains how Moss should grow beyond the initial WMON, ERC, and Kuru Protocols. It is a contribution triage guide, not a commitment that every named protocol is ready to merge.

Protocol work should preserve the framework contract from [CONTEXT.md](../CONTEXT.md), [ADR 0010](./adr/0010-self-describing-protocols-and-zod-parameters.md), [ADR 0011](./adr/0011-capability-trees-and-exhaustive-receipts.md), and [Protocol onboarding](./protocol-onboarding.md).

## The problem

Protocol adapters are attractive first contributions, but they also create the most long-term maintenance pressure. Without a shared roadmap, contributors can accidentally:

- add protocol-specific synonyms that weaken `discover`;
- force a protocol into the wrong category just to make a PR merge;
- duplicate interface-layer work inside one adapter;
- ship hand-copied ABIs or fixed addresses without provenance;
- parse planned behavior instead of observed Changes;
- add a broad adapter before the framework has the right vocabulary for it.

The goal is to merge adapters in an order that strengthens Moss as a framework, not only expands the package count.

## Current vocabulary

Core currently owns these closed sets:

| Surface | Current values | Review rule |
| --- | --- | --- |
| Verbs | `swap`, `wrap`, `unwrap`, `supply`, `withdraw`, `borrow`, `repay`, `stake`, `unstake`, `claim`, `mint`, `transfer`, `approve` | Add a verb only when a user-facing write cannot be represented by an existing verb plus tags. |
| Categories | `dex`, `lending`, `staking`, `rewards`, `token`, `nft` | Add a category only when `discover` needs a new coarse domain. |
| Risk labels | `fundOut`, `approval`, `priceImpact` | Add a risk only when Agents need a new mechanical warning class before signing. |
| Tags | free-form strings | Use for long-tail detail such as `clob`, `orderbook`, `lst`, `vault`, or `oracle`. |

Do not squeeze an adapter into a misleading category. If a protocol does not fit the current category set, write a design PR or ADR before the adapter PR.

## Merge order

### 1. Shared interface layers

Build reusable interface layers before protocol-specific packages when the interface is a common standard.

Good candidates:

- ERC-1155 multi-token operations;
- ERC-4626 tokenized vault interfaces;
- reusable Receipt helpers for standards that multiple Protocol packages will delegate to.

Why first: a shared layer prevents every later adapter from inventing its own ABI, parameter names, Receipt text, and coverage tests.

### 2. Provenance and template tooling

Adapter throughput should follow ABI/address provenance tooling, not precede it.

Merge these before large adapter waves:

- verified ABI fetch or vendored ABI generation workflows;
- Protocol template improvements;
- review checklists that enforce one direct transaction per Capability;
- examples that show `discover -> load -> action -> simulate` for the new framework.

Why first: tooling makes the safe path the easy path for contributors.

### 3. Low-ambiguity adapters

Start with protocols whose user intent already maps cleanly to current verbs and categories.

Good candidates:

| Domain | Category | Verbs | Notes |
| --- | --- | --- | --- |
| DEX swaps | `dex` | `swap`, sometimes nested `approve` | Requires exact Receipt coverage for transfers, trades, router events, and slippage outcomes. |
| Liquid staking | `staking` | `stake`, `unstake`, `claim` | Good when fixed contracts and receipt events are stable and live simulation is possible. |
| NFT mint/transfer | `nft` | `mint`, `transfer` | Keep mint semantics separate from marketplace or bridge semantics. |
| Token helpers | `token` | `wrap`, `unwrap`, `transfer`, `approve` | Prefer shared interfaces over app-specific wrappers. |

These are useful early because reviewers can judge them against existing vocabulary without opening a taxonomy debate.

### 4. Lending and vault adapters

Lending adapters are strategically important, but they carry more semantic risk than swaps or staking.

Use current verbs where they fit:

- `supply` for depositing collateral or liquidity;
- `withdraw` for redeeming supplied assets;
- `borrow` for increasing debt;
- `repay` for reducing debt;
- nested `approve` when the protocol needs an allowance.

Open design work first when the adapter needs:

- collateral configuration as an independent write;
- health-factor, liquidation, or isolation-mode semantics in Agent-facing text;
- credit delegation or account delegation;
- a vault/yield category that does not fit `lending` or `token`;
- multi-market discovery that depends on off-chain APIs.

Receipt tests must prove the adapter reports actual observed asset movements and protocol events, not only intended supply or borrow parameters.

### 5. Query-heavy protocols

Some protocols are mostly Queries: oracles, analytics feeds, rate models, reserve metadata, or market discovery.

Do not create a misleading write Capability just to make a Protocol feel complete. A Query-only Protocol is acceptable only if its category is honest and its output provenance is clear.

Open design work first when:

- the protocol needs an `oracle`, `analytics`, or `risk` category that does not exist today;
- query data may influence transaction construction in another Protocol;
- values come from an off-chain service rather than on-chain state;
- freshness, block number, round ID, or source identity must be exposed for Agent review.

Query outputs can guide an Agent, but they are not simulation evidence. Only `simulate` Receipts prove write behavior.

### 6. Advanced protocol families

Yield trading, perpetuals, cross-margin systems, intent routers, bridge-like systems, and aggregators need design before implementation.

Require a design PR or ADR before code when a protocol introduces any of these:

- new user-facing verbs or categories;
- signed order placement, cancellation, or settlement semantics;
- asynchronous fills or partial fills;
- positions whose risk cannot be summarized by current `fundOut`, `approval`, or `priceImpact` labels;
- cross-protocol routing where the route is discovered off-chain;
- non-local state that cannot be verified with the existing `debug_traceCall` evidence model.

These adapters should not be first-time Protocol contributions.

## Adapter intake checklist

Before starting an adapter PR, answer these questions.

| Question | If yes | If no |
| --- | --- | --- |
| Does the user-facing write fit an existing verb? | Use that verb and tags for detail. | Open a taxonomy design PR before implementation. |
| Does the Protocol fit an existing category? | Use the category honestly. | Do not force it; open category design first. |
| Is there a shared standard interface? | Build or reuse the interface layer first. | Keep the adapter package self-contained. |
| Are ABIs and fixed addresses sourced? | Document the origin and add tests. | Stop until provenance is established. |
| Can the happy path be simulated on Monad mainnet? | Add live e2e with zero Warnings. | Keep the PR draft or explain the chain-state blocker. |
| Can every observed Change be covered in order? | Add unit tests and live Receipt verification. | Do not merge the adapter. |
| Does the adapter rely on an off-chain API? | Treat API data as candidates and verify on-chain. | Keep construction on-chain or static with provenance. |

## Priority map

Use this order when choosing what to build next.

1. Framework and safety guardrails that many adapters depend on.
2. Shared interface layers and ABI/address provenance tooling.
3. Low-ambiguity adapters that fit current verbs/categories and can run live e2e.
4. Lending and vault adapters with explicit health/risk text.
5. Query-heavy protocols after category and provenance decisions.
6. Advanced protocol families after ADR-level design.

## Review expectations by domain

| Domain | Minimum evidence | Common blockers |
| --- | --- | --- |
| DEX | Router address provenance, ABI provenance, transfer/trade/router Receipt coverage, live swap simulation. | Hand-copied ABIs, stale quotes, route data not reverified on-chain. |
| Staking | Contract provenance, stake/unstake/claim Receipts, token movement coverage, live simulation. | Confusing liquid staking token mint/burn with native staking semantics. |
| Lending | Pool/provider provenance, supply/withdraw/borrow/repay Receipts, health/risk query docs, live simulation when markets are active. | Markets not initialized, missing collateral/debt semantics, planned balances used as evidence. |
| NFT | Standard interface reuse, Transfer/mint Receipt coverage, fixed mint contract provenance. | Mint side effects beyond NFT transfer, allowlist or payable logic not represented in text. |
| Oracle/query | Source identity, freshness fields, block/round information when available. | No honest category, off-chain data treated as verified execution evidence. |
| Advanced derivatives | ADR or design PR, position lifecycle model, risk label review, simulation evidence plan. | Asynchronous fills, partial fills, leverage risk, or settlement paths not represented by current framework. |

## Related

- [Protocol onboarding](./protocol-onboarding.md)
- [Capability taxonomy ADR](./adr/0003-two-tier-capability-taxonomy.md)
- [Self-describing Protocol ADR](./adr/0010-self-describing-protocols-and-zod-parameters.md)
- [Capability and Receipt ADR](./adr/0011-capability-trees-and-exhaustive-receipts.md)
- [Domain language](../CONTEXT.md)
