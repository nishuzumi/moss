---
"@themoss/protocol-aave": minor
"@themoss/mcp-server": patch
---

Add the Aave v3 lending Protocol for Monad mainnet.

Four Capabilities map onto the lending verbs: `supply`, `withdraw`, `borrow` and
`repay`, each owning one direct Pool transaction, with `supply` and `repay`
nesting one exact-amount ERC-20 approval. Two Queries read an account's health
factor and a reserve's current supply and variable borrow rates. Addresses and
ABIs are vendored from the Aave DAO address book and verified on chain, and the
live Monad suite simulates all four verbs with zero Warnings.
