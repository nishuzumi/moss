---
"@themoss/protocol-apriori": minor
---

Add aPriori aprMON liquid staking adapter for Monad. Exposes `stake`
(`deposit(uint256 assets, address receiver)` payable), `unstake`
(`requestRedeem(uint256 shares, address receiver)`), and `claim`
(`redeem(uint256[] requestIds, address receiver)`) Capabilities against
aPriori's native-asset ERC4626 vault with an async withdrawal queue.

This revision fixes the initial PR #104 implementation: corrects the proxy
status (non-EIP-7702, implementation pinned explicitly), preserves the full
`requestIds[]` array in `claimReceipt`, removes the misleading `priceImpact`
risk label from `stake`/`unstake`, delegates ERC-20 `Transfer`/`Approval`
events to `@themoss/erc`, and adds live mainnet `simulate` happy-path coverage
for `stake` plus an online explorer cross-check test for the implementation
ABI.

Contract addresses and entrypoint selectors verified on-chain.
