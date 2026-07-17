---
"@themoss/protocol-kuru": minor
---

Add post-only limit orders and margin-account support to the Kuru CLOB adapter:

- **New Capability `limitOrder`** (with `limitOrderReceipt`): place a post-only resting order on a dynamically discovered market. Prices are encoded exactly like the official Kuru SDK — `humanPrice × pricePrecision`, with `tickSize` enforced as a validity constraint (not a scale factor) and excess decimals rejected instead of silently clipped. Orders are funded from the Kuru margin account; any shortfall is topped up automatically with a nested `depositMargin` Capability, so the tree simulates and executes by itself, native MON included. `postOnly=true` guarantees the order can never take liquidity: a crossing price reverts (`PostOnlyError`) instead of filling, and the Receipt therefore requires exactly one `OrderCreated` and rejects any `Trade`.
- **New Capability `depositMargin`** (with `depositMarginReceipt`): composable margin-account funding for ERC-20 (approve + deposit) and native MON (payable deposit). The margin-account address is discovered from the Router's `marginAccountAddress()`, never hardcoded.
- **New Query `marginBalance`**: read the acting account's Kuru margin balance for any token.
- **New Query `markets`**: list every Router-verified market for a pair with its precision parameters and top of book — the discovery path for the explicit `market` parameter below.
- **New Query `bestBidAsk`**: best bid/ask in the contract's 1e18 fixed-point quote-per-base units (verified against live orders on three mainnet markets); `0`/`MaxUint256` empty-side sentinels map to `null`.
- **New Query `orderStatus`**: look up an order by `market + orderId` (ids are market-local). Status is honestly `open | gone` — Kuru deletes order storage on both full fill and cancel, so the two cannot be distinguished on-chain.
- Pair-addressed methods take an optional Router-verified `market` parameter; an ambiguous pair (several markets) is an error listing the candidates rather than an arbitrary choice.
- `MarketParams` now carries `tickSize`, `minSize`, and `maxSize` from the Router's `verifiedMarket()`; order sizes are validated against the market bounds at build time.
- `KuruMarginAccountAbi` is vendored from the same pinned `@kuru-labs/kuru-sdk` tarball as the existing ABIs.
- Live e2e coverage simulates a funded native-MON limit order end to end (margin deposit → post-only placement) with a zero-warning typed Receipt, and cross-checks the `bestBidAsk` scaling against a live market quote.
