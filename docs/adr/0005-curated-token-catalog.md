# Token identity resolves only through a curated catalog

Agents were required to pass raw token addresses to capabilities (`tokenOut: "0x7547…"`), which contradicts Moss's core promise — the agent would have to learn addresses from memory or the web, exactly the error-prone step Moss exists to remove. The system layer ships the curated well-known token data (`@themoss/system`'s `MONAD_TOKENS`, registered into the core-provided token table via `systemManifest`), and the `token` semantic type accepts symbols ("USDC"), addresses, or "native".

The security rule that makes this safe: **symbol → address resolution happens only against the catalog and never falls back to on-chain `symbol()` lookups.** Anyone can deploy a token named "USDC"; same-symbol fakes are the oldest scam in DeFi. An unknown symbol is a loud error listing the catalog — the agent then either uses an explicit address (deliberate, visible) or asks the user.

## Consequences

- Catalog entries require on-chain verification (bytecode, symbol, decimals) plus a canonical source, noted in the PR. Launch set: MON (native), WMON, USDC, AUSD — all verified live 2026-07-06/07.
- The catalog is the single source of truth for canonical addresses: adapters derive their token constants from it (`knownTokenAddress("USDC")`).
- Catalogued tokens skip the on-chain metadata RPC (decimals/symbol ship with the entry).
- Intent strings become human-readable for free: the template fills from the agent's raw input, so "Swap 1 MON into USDC" instead of an address dump.
- **No chain-id parameters anywhere in the authoring surface** (catalog lookups, contract `addr`): Moss v1 is deliberately single-chain (Monad mainnet), and chain identity lives in the runtime alone. Multichain, if it comes, reintroduces per-chain data behind these same call signatures — the decision recorded here is that v1 refuses to pre-pay that complexity.
