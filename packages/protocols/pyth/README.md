# @themoss/protocol-pyth

This package contains the self-describing Pyth Protocol adapter for Monad
mainnet. It exposes one read-only Query:

- `price`: reads an official Pyth feed and rejects values older than the
  caller-selected freshness limit.

The result returns Pyth's integer `price`, `confidence`, `exponent`, and Unix
`publishTime` as JSON-safe values. Interpret the price as
`price * 10^exponent`. The adapter does not update feeds, create transactions,
or expose unsafe price reads.

## Safety boundary

Callers select a feed by name, such as `MON_USD`, rather than supplying an
arbitrary contract or feed ID. The 60 accepted names and IDs come from Monad's
official protocol registry. `maxAgeSeconds` defaults to 3600 and is passed to
Pyth's `getPriceNoOlderThan`; the contract reverts when the price is too old.

## Deployment and source origin

The PriceFeed contract is deployed at
`0x2880aB155794e7179c9eE2e38200202908C17B43`. Its address and feed IDs are
vendored from the pinned
[Monad protocol registry](https://github.com/monad-crypto/protocols/blob/9fc1f09766739570f6e77f68bee0383d68cfeb66/mainnet/pyth.jsonc).

The complete IPyth ABI is vendored from
[`@pythnetwork/pyth-sdk-solidity@4.3.1`](https://www.npmjs.com/package/@pythnetwork/pyth-sdk-solidity/v/4.3.1).
`sources/VENDOR.json` records immutable versions, hashes, and URLs.

Regenerate committed TypeScript offline:

```bash
pnpm --filter @themoss/protocol-pyth gen:sources
```

Re-fetch the pinned upstream files and verify their hashes:

```bash
pnpm --filter @themoss/protocol-pyth update:sources
```

The test suite verifies byte-for-byte source derivation, parameter validation,
JSON-safe output, deployed bytecode, Monad chain ID, and a live MON/USD read.
