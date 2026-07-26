---
"@themoss/protocol-apriori": minor
"@themoss/mcp-server": minor
---

Add the aPriori aprMON liquid staking adapter for Monad and compose it into
the MCP server. Exposes `stake` (`deposit(uint256 assets, address receiver)`
payable), `unstake` (`requestRedeem(uint256 shares, address controller,
address owner)`), and `claim` (`redeem(uint256[] requestIDs, address
receiver)`) Capabilities against aPriori's native-asset vault with an async
withdrawal queue.

The ABI is vendored verbatim from aPriori's official integration docs (the
EIP-1967 implementation is unverified on MonadScan, so no explorer artifact
exists) and its derivation is test-enforced on chain: proxy→implementation
linkage, bytecode selector/topic presence for every vendored entry, and token
metadata. Receipt parsers authenticate the aprMON emitter and cross-check the
full observed asset flow (native deposit + mint for `stake`, escrow transfer
for `unstake`, burn + native payout per request ID for `claim`), delegating
ERC-20 Transfer evidence to `@themoss/erc` as nested Receipts. Amount params
reject more than 18 decimal places instead of silently rounding.
