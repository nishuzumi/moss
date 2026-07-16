---
"@themoss/protocol-kuru": minor
---

Add limit order support to the Kuru CLOB DEX adapter:

- **New Capability `limitOrder`** (with `limitOrderReceipt`): Place limit buy/sell orders on a dynamically discovered market with human-readable price and amount parameters. Uses verb `swap` + tag `limit` (ADR 0003). Supports ERC-20 input tokens (native MON requires wrapping — deferred to follow-up). The Receipt parses `OrderCreated` (resting order) and `Trade` (immediate fills) events into a typed `KuruLimitOrderOutcome`.
- **New Query `bestBidAsk`**: Fetch the current best bid and ask prices for any supported Kuru market, returned in human-readable quote-per-base units.
- **New Query `orderStatus`**: Look up a limit order by ID to check whether it is still open, filled, or cancelled.
- **MarketParams** now includes `tickSize` from the Router's `verifiedMarket()`, enabling correct Kuru price precision conversion.
