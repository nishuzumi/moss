# @themoss/protocol-monad-cards

This package contains the self-describing Monad Cards Protocol for Monad
mainnet. It exposes one read-only Query:

- `totalMinted`: returns the collection's cumulative minted supply as a
  JSON-safe decimal string.

The Query accepts no parameters. This package does not expose minting,
claiming, transfers, Capabilities, or Receipt parsers.

## Deployment and ABI origin

Monad Cards is deployed at
`0x0000CA12D5c07085022eBC74867157449919Fd67`. The address is recorded in
[Monad's official protocol registry](https://github.com/monad-crypto/protocols/blob/main/mainnet/monad_cards.jsonc).

The committed ABI is the complete explorer-tier artifact from the
[verified MonadScan contract](https://monadscan.com/address/0x0000CA12D5c07085022eBC74867157449919Fd67#code).
Regenerate it with:

```bash
MONADSCAN_API_KEY=... pnpm --filter @themoss/protocol-monad-cards update:abis
```

`test/abis.test.ts` verifies the committed module is exactly the shared ABI
renderer output for the recorded address and retrieval date.
