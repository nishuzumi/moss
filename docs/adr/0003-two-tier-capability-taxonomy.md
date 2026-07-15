# Capability taxonomy is two-tier: closed verb/category sets plus free-form tags

`discover` filters on verbs and categories, so every adapter must label capabilities with the same words. Verbs and categories are small closed sets owned by core (adding a word requires a core PR and review); each capability may additionally carry free-form `tags` for long-tail semantics. Verbs describe the user-perspective fund semantic, never the protocol's function name (WMON `deposit()` → verb `wrap`; "deposit" would collide with lending's `supply`).

## Considered Options

- **Free-form strings** — rejected: the catalog decays into `swap`/`exchange`/`trade` synonyms within months and discover stops working.
- **Closed sets only** — rejected: every novel protocol stalls on "no word fits", and vocabulary review becomes the bottleneck for community contributions. Tags are the pressure valve.

## Consequences

- The verb set is deliberately tiny (12 at launch: swap, wrap, unwrap, supply, withdraw, borrow, repay, stake, unstake, claim, mint, transfer) because intent alignment anchors on it — "user asked to swap, Capability's verb is supply" must be a hard, mechanical mismatch.
- Orderbook DEXes do not get their own verb: a market order is `swap` from the user's perspective; `clob`/`orderbook` go in tags.
