# Capability taxonomy is two-tier: closed verb/category sets plus free-form tags

`discover` filters on verbs and categories, so every adapter must label capabilities with the same words. Verbs and categories are small closed sets owned by core (adding a word requires a core PR and review); each capability may additionally carry free-form `tags` for long-tail semantics. Verbs describe the user-perspective write semantic, never the protocol's function name (WMON `deposit()` → verb `wrap`; "deposit" would collide with lending's `supply`).

## Considered Options

- **Free-form strings** — rejected: the catalog decays into `swap`/`exchange`/`trade` synonyms within months and discover stops working.
- **Closed sets only** — rejected: every novel protocol stalls on "no word fits", and vocabulary review becomes the bottleneck for community contributions. Tags are the pressure valve.

## Perpetuals, the first extension (2026-07-26)

Perps were the first domain the launch vocabulary could not express at all, so they are the worked example of how the closed sets grow.

- **Category `perps`, not `dex` plus a `perps` tag.** `discover(category)` is how an Agent narrows the protocol domain before it reads a single intent string, and a leveraged position a third party can force-close does not belong in the same domain answer as a spot swap. A tag cannot carry that weight: tags are additive detail on one Capability, while category is the Protocol's coarse domain.
- **Verbs `open` and `close`; direction is a parameter.** A position's lifecycle is two writes, not four — closing a long and closing a short are one user-perspective semantic. Direction rides the closed `PositionSide` parameter, which core owns in `semantics.ts` alongside `Address` and `BasisPoints` and which spells the direction as the literals `"long"` or `"short"`. The verb collapse would leak the synonym decay it prevents if each adapter chose its own spelling (`LONG`/`SHORT`, `buy`/`sell`), so the direction value is closed with the verbs, matching the precedent that a swap's fixed side is a parameter rather than two verbs. `long`/`short` as verbs would force `closeLong`/`closeShort` and reintroduce exactly the synonym decay the closed set exists to prevent.
- **Margin reuses `supply` and `withdraw`.** Collateral entering and leaving a margin account is the same user-perspective semantic as lending's, so `marginAdd`/`marginRemove` would be synonyms of the kind the closed set rejects. `category: "perps"` plus the Capability's own parameters carry the distinction.
- **Risk labels `leverage` and `liquidation`.** `fundOut` says funds leave; neither it nor `approval`/`priceImpact` can say that exposure exceeds the collateral posted, or that a third party may seize that collateral without further user action. Partial closes and collateral withdrawals carry `liquidation` too, because both move account health.
- **Reconciliation needs no new mechanism.** "A position is not a token flow" was an objection to author-declared expectations, which ADR 0011 already replaced with exhaustive Receipts. A Receipt covers Changes, and a perp that updates a position emits Changes. An `open` Receipt's Outcome states market, side, size, and collateral only where its own Changes support them; a protocol whose position updates leave no trace cannot state a position, and per ADR 0011 does not get an `open` Capability at all.

## Consequences

- The verb set is deliberately tiny (15: swap, wrap, unwrap, supply, withdraw, borrow, repay, stake, unstake, claim, mint, transfer, approve, open, close) because intent alignment anchors on it — "user asked to swap, Capability's verb is supply" must be a hard, mechanical mismatch. `approve` is explicit because allowance changes are independently executable writes with their own Receipt and approval risk.
- Orderbook DEXes do not get their own verb: a market order is `swap` from the user's perspective; `clob`/`orderbook` go in tags.
- `open` and `close` are position-lifecycle verbs, not perps-only ones: any Protocol whose write opens or closes a persistent position carrying its own liquidation surface may use them, while the collateral that backs the position stays on `supply`/`withdraw`. Both verbs take their direction from the closed `PositionSide` parameter, so an `open`/`close` Capability cannot express direction in any other spelling.
- A word enters a closed set with a stated reason and every doc that enumerates the set updated in the same change: this ADR, the `CONTEXT.md` glossary, the `.github/ISSUE_TEMPLATE/protocol_onboarding.md` template (the first place a contributor reads the verbs), and the `discover` schema derived from `VERBS`/`CATEGORIES`/`RISK_LABELS`.
