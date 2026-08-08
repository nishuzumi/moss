---
"@themoss/protocol-beets": minor
"@themoss/mcp-server": minor
---

Add the Beets Balancer V3 DEX adapter for Monad mainnet and compose it into
the MCP server. Exposes `swap` (`swapSingleTokenExactIn` /
`swapSingleTokenExactOut`), `addLiquidity` (`addLiquidityUnbalanced`), and
`removeLiquidity` (`removeLiquiditySingleTokenExactIn`) Capabilities against
the canonical Balancer v3 Router with native MON wrap/unwrap, plus `quote`,
`quoteAddLiquidity`, `quoteRemoveLiquidity`, and `pool` queries. ABIs are
vendored from balancer/balancer-deployments at a pinned commit with SHA-256
provenance and on-chain derivation checks (`pnpm test:abi:online`).
