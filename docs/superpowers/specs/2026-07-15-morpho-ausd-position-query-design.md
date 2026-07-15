# MetaMorpho AUSD Position Query Design

## Status

Approved scope for a small, partial contribution toward GitHub issue #9. This design does not complete or close the issue.

## Objective

Add a read-only Moss query that reports an owner's position in one curated MetaMorpho V1.1 vault on Monad mainnet: Grove x Steakhouse High Yield AUSD.

The contribution establishes the smallest useful Morpho package without adding transaction construction, an off-chain APY dependency, or generic ERC-4626 infrastructure.

## Scope

Included:

- A new `@themoss/protocol-morpho` package and explicit `morphoManifest`.
- One statically declared MetaMorpho V1.1 vault.
- One `position` query.
- ABI and address provenance required by Moss.
- Offline discover, load, and query tests.
- A live Monad-mainnet read test.
- MCP server registration, package documentation, and a changeset.

Excluded:

- `supply` and `withdraw` capabilities.
- APY queries or Morpho API integration.
- Bundler3 and GeneralAdapter1.
- `@Event` receipts and simulation tests, because this contribution creates no Plan.
- Additional Morpho vaults or a runtime vault parameter.
- Generic ERC-4626 interfaces, adapters, or changes to ADR 0009.

## Curated Deployment

The package supports only:

- Vault: Grove x Steakhouse High Yield AUSD
- Vault address: `0x32841A8511D5c2c5b253f45668780B99139e476D`
- Vault share symbol: `grove-bbqAUSD`
- Vault share decimals: `18`
- Underlying asset: AUSD
- AUSD address: `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`
- AUSD decimals: `6`
- MetaMorpho V1.1 factory: `0x33f20973275B2F574488b18929cd7DCBf1AbF275`

The source must record both forms of evidence required by ADR 0005:

1. Morpho's official [Monad deployment records](https://docs.morpho.org/developers/contracts/addresses/) and [vault API](https://docs.morpho.org/developers/api/morpho-vaults/).
2. Live Monad verification: non-empty bytecode, factory membership, and matching `asset`, `name`, `symbol`, and `decimals` values.

AUSD is already supplied by `@themoss/system`; the Morpho manifest introduces no token entry.

## Package Architecture

`@Protocol` declares one static, ABI-typed `vault` Handle. The protocol coordinate is `morpho`, its category is `lending`, and the package exposes only the `position` query.

The package uses the fixed deployment rather than a caller-provided vault address. This keeps the token identity and contract trust decision in maintained code, avoids the unresolved ADR 0009 instantiation question, and makes adding another vault an explicit future review.

The MetaMorpho ABI lives under `src/abis/` as a complete explorer-origin artifact from the [verified Monad contract](https://monadscan.com/address/0x32841A8511D5c2c5b253f45668780B99139e476D#code). The full explorer ABI is converted mechanically to const TypeScript; its header records the verified-contract URL and retrieval date as required by ADR 0007. Generated ABI data is not hand-edited.

## Query Contract

Coordinate:

- Protocol: `morpho`
- Method: `position`
- Kind: `query`
- Category: `lending`
- Tags: `vault`, `erc4626`

Input:

- `owner`: an EVM address decoded by Moss's standard `address` semantic type.

Intent:

`Position of {owner} in the Grove x Steakhouse High Yield AUSD vault`

The query performs two on-chain reads in order:

1. `balanceOf(owner)` obtains the owner's vault-share balance.
2. `convertToAssets(shares)` obtains the current AUSD-equivalent value of those shares.

The result is JSON-safe and uses integer base-unit strings rather than floating-point numbers:

```json
{
  "owner": "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC",
  "vault": "0x32841A8511D5c2c5b253f45668780B99139e476D",
  "vaultName": "Grove x Steakhouse High Yield AUSD",
  "shareSymbol": "grove-bbqAUSD",
  "shareDecimals": 18,
  "shares": "1000000000000000000",
  "asset": "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
  "assetSymbol": "AUSD",
  "assetDecimals": 6,
  "assets": "1025000"
}
```

The metadata is curated package data and verified in the live test. Callers can format `shares` and `assets` using their accompanying decimals without losing precision.

## Error Handling

- An invalid owner fails during semantic decoding before any RPC call.
- A failed `balanceOf` or `convertToAssets` read fails the query; the adapter does not return a fabricated zero or stale value.
- A valid zero-share position returns `"0"` shares and `"0"` assets.
- The query does not catch an RPC error merely to replace it with a less specific generic error.

## Testing

Offline tests cover:

- Manifest registration.
- `discover` output for the `position` query.
- `load` intent, parameter description, category, and tags.
- Query output with mocked share and asset values.
- JSON-safe string serialization and the zero-position case.

The live Monad-mainnet test covers:

- Non-empty vault bytecode.
- On-chain vault metadata and canonical AUSD asset identity.
- A successful `position` query against a valid owner address.
- The returned `assets` value matching `convertToAssets(balanceOf(owner))` at the tested block.

The live test is skipped only through the repository's existing `MOSS_SKIP_E2E` convention. It needs no funds and no keys. A zero-warning simulation assertion is not applicable because a Query returns data rather than a Plan.

## Repository Integration

- Export `morphoManifest` from the new package.
- Add the package as an MCP server dependency and include its manifest in the server's explicit `use()` array.
- Document the supported vault, return units, address sources, and current exclusions.
- Add a changeset for the new user-facing query.
- Run lint, build, typecheck, offline tests, and the full live test suite before handoff.

## Pull Request Boundary

The pull request title should describe only the delivered query, for example:

`feat(protocols): add MetaMorpho AUSD position query`

The pull request references issue #9 as partial progress. It must not use `Closes #9`, `Fixes #9`, or otherwise claim that supply, withdraw, or APY support is implemented.

No branch is pushed and no pull request is opened until the user reviews the local diff and test evidence.
