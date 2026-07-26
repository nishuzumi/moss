# Kintsu sMON Adapter Design

## Goal

Add a small, production-shaped Moss Adapter for Kintsu liquid staking on Monad
mainnet. The Adapter lets an Agent quote and deposit native MON into Kintsu's
StakedMonad Vault to receive sMON, while preserving Moss's transaction and
Receipt invariants.

The first version intentionally excludes unstaking. Kintsu redemption is a
multi-step, time-dependent workflow (`requestUnlock` followed by batch
processing, cooldown, and `redeem`) and should be designed separately.

## Verified Protocol Surface

- Protocol: Kintsu liquid staking
- Network: Monad mainnet, chain ID 143
- StakedMonad Vault and sMON token:
  `0xA3227C5969757783154C60bF0bC1944180ed81B9`
- Current verified StakedMonadV2 implementation:
  `0x6A4593baBDF617d5D8D6fbC04b53435d08Baf21f`
- Deposit entry point:
  `deposit(uint96 minShares, address receiver) payable returns (uint96 shares)`
- Read methods:
  `convertToShares(uint96 assets)`, `convertToAssets(uint96 shares)`, and
  `totalShares()`
- Deposit event:
  `Deposit(address indexed staker, uint256 shares, uint256 value)`

Primary sources:

- Kintsu official addresses:
  <https://docs.kintsu.xyz/the-kintsu-protocol/official-contract-addresses>
- Kintsu interface and complete ABI:
  <https://docs.kintsu.xyz/the-kintsu-protocol/architecture-and-integration/monad-lst-architecture/contract-interface-abi-and-functions>
- MonadScan verified proxy:
  <https://monadscan.com/address/0xa3227c5969757783154c60bf0bc1944180ed81b9>
- MonadScan verified StakedMonadV2 implementation:
  <https://monadscan.com/address/0x6a4593babdf617d5d8d6fbc04b53435d08baf21f>

## Package And Composition

Create `packages/protocols/kintsu` as `@themoss/protocol-kintsu`. The package
exports one top-level `@Protocol` class, its verified address constant, and its
generated ABI. It owns the Kintsu-specific address and Receipt semantics.

The MCP server adds the package to its default composition root so the Adapter
is discoverable without manual registration. The root README adds Kintsu to the
supported protocol table.

## Agent Interface

The Protocol name is `kintsu`, category `staking`.

### Query: `quoteDeposit`

Input:

- `amount`: positive decimal MON amount, interpreted with 18 decimals
- `slippage`: integer basis points from 0 through 9,999

Behavior:

1. Parse `amount` to wei and reject values outside `uint96`.
2. Call `convertToShares(amountWei)` at the current RPC state.
3. Compute
   `minimumShares = quotedShares * (10_000 - slippage) / 10_000`.
4. Reject a zero quote or a floor-rounded `minimumShares` of zero.
5. Return JSON-safe decimal strings for the MON amount, quoted sMON shares, and
   minimum shares, plus the requested slippage.

### Capability: `deposit`

Input:

- `amount`: positive decimal MON amount, interpreted with 18 decimals
- `receiver`: address that receives sMON
- `slippage`: integer basis points from 0 through 9,999

Behavior:

1. Parse and range-check the MON amount.
2. Call `convertToShares(amountWei)` at the current RPC state.
3. Apply the same floor-rounded slippage formula as `quoteDeposit`.
4. Return exactly one direct TransactionNode calling
   `deposit(minimumShares, receiver)` with `msg.value = amountWei`.

The Capability has `fundOut` and `priceImpact` risks. A failed quote or a zero
share quote is an explicit error; the Adapter does not silently use zero
minimum shares.

### Queries: `convertToAssets` And `totalShares`

`convertToAssets` accepts a positive raw sMON share quantity as a decimal
integer string and returns the corresponding raw MON wei amount. `totalShares`
has no parameters and returns the current raw share total. Values remain raw
integer strings so no precision is lost.

## Receipt Semantics

The deposit Receipt is pure and accepts only the immutable ordered `Change`
list supplied by Moss.

It recognizes:

- the native MON transfer into the StakedMonad Vault;
- sMON ERC-20 `Transfer` events, delegated to the canonical
  `@themoss/erc` parser;
- the management-fee `VirtualSharesSnapshot` event emitted before minting;
- the Kintsu `Deposit` event emitted by the StakedMonad Vault.

Every input Change appears exactly once in the returned Receipt tree, in the
same order and with the same object identity. The parser rejects unsupported
events from the Kintsu contract, duplicate Deposit events, missing required
evidence, or mismatches between the native transfer, Deposit value, receiver,
and minted shares. Additional valid sMON Transfer events remain represented
and do not replace the Deposit outcome.

The typed outcome contains:

- `operation: "deposit"`
- sender and receiver addresses
- deposited MON wei
- minted sMON shares

## ABI Provenance

Use the complete ABI from MonadScan's verified StakedMonadV2 implementation,
not the stale V1 artifact still linked by Kintsu's documentation and not a
handwritten subset. Commit the generated `as const` TypeScript ABI with the
implementation address and retrieval date. A zero-argument `update:abis`
script uses the official Etherscan V2 API for Monad mainnet.

Offline tests assert that the generated module has the exact standard explorer
provenance form and includes the V2 events observed in a live deposit. An
online ABI test resolves the EIP-1967 implementation behind the pinned proxy,
checks that the expected implementation is still active, and semantically
compares the committed ABI with MonadScan's verified implementation ABI. A
live bytecode check verifies that the fixed Vault address is deployed on Monad
mainnet.

## Testing

Tests cover:

- Protocol discovery and generated metadata;
- quote math, floor rounding, `uint96` bounds, invalid slippage, RPC errors,
  and zero-share quotes;
- exactly one direct deposit transaction, correct calldata, receiver, and
  `msg.value`;
- Receipt success with realistic native transfer, Transfer, and Deposit
  Changes;
- exact Receipt Change identity, order, and coverage;
- rejection of missing, duplicate, mismatched, malformed, and unsupported
  Changes;
- compile-time Handle and Receipt signatures;
- default MCP composition;
- deterministic ABI generation and optional online ABI/address verification.

The package must pass its focused tests, then the repository's build,
typecheck, lint, and offline test suite.

## Pull Request Scope

The Pull Request contains only the Kintsu package, composition wiring,
documentation, dependency lockfile updates, tests, and a changeset. It does not
add unstaking, wallet signing, transaction submission, UI work, or unrelated
refactors.
