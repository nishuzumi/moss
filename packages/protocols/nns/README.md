# @themoss/protocol-nns

Moss Query Adapter for Nad Name Service (NNS) on Monad mainnet.

## Challenge description

This adapter adds read-only Nad Name Service identity lookups to Moss. Agents
can discover an address's primary `.nad` name and profile avatar through the
official NNS contract, with JSON-safe results and no signing or transaction
execution.

## Supported Queries

### `primaryName`

Reads the primary NNS name for an EVM address.

Returns `{ address, primaryName }`. The name is an empty string when no primary
name is assigned.

### `profile`

Reads the NNS profile tuple for an EVM address.

Returns `{ address, primaryName, avatar }`. Empty strings are valid for accounts
without a name or avatar.

## Fixed deployment

Monad mainnet NNS contract:

```text
0xcc7a1bff8845573dbf0b3b96e25b9b549d4a2ec7
```

Canonical address source:

```text
https://github.com/monad-crypto/protocols/blob/main/mainnet/nad_name_service.jsonc
```

## ABI provenance

The complete official ABI is vendored at `abis-src/NadNameService.json` from:

```text
https://docs.nad.domains/developers/contracts/contract-abi.md
```

`abis-src/VENDOR.json` pins the source URL, retrieval date, and SHA-256. The
generated `src/abis/nad-name-service.ts` module is reproducible offline:

```bash
pnpm --filter @themoss/protocol-nns gen:abis
```

## Scope and safety

This v1 adapter is query-only. It does not sign or send transactions, expose
the contract's write functions, call an external HTTP resolver, or infer
namehashes. Name resolution is intentionally limited to the contract's direct
address-based read methods.

## Validation

```bash
pnpm --filter @themoss/protocol-nns build
pnpm --filter @themoss/protocol-nns typecheck
pnpm --filter @themoss/protocol-nns test
pnpm exec biome check packages/protocols/nns
```

The package test includes the live Monad mainnet suite. Set `MOSS_SKIP_E2E=1`
to run only offline tests.
