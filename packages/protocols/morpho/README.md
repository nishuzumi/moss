# @themoss/protocol-morpho

Moss protocol adapter for Morpho vaults on Monad mainnet (chain 143).

A Morpho vault (MetaMorpho V1.1) is an ERC-4626 vault whose curator lends the
deposited asset across Morpho Blue markets. Supplying does more than mint
shares: the vault walks its supply queue and supplies into Morpho Blue, so one
`deposit` call produces vault events, Morpho Blue market events, an interest
rate model update and several ERC-20 transfers. The Receipt parsers here cover
all of it, because Moss requires exact ordered coverage of every Change.

## Surface

| Kind | Name | Verb | What it does |
| --- | --- | --- | --- |
| Capability | `supply` | `supply` | Approve the vault, then deposit assets and receive shares. |
| Capability | `withdraw` | `withdraw` | Burn shares and take the asset back out. |
| Query | `position` | | An owner's shares, their current asset value and what is withdrawable now. |
| Query | `vaultInfo` | | Asset, size, performance fee, the account-scoped deposit capacity and the curation roles. |

Amounts are the vault's **underlying asset** in display units, so `"1"` on an
AUSD vault means one AUSD, not one share. The vault's own share token has 18
decimals regardless of the asset. `mint` and `redeem`, the share-denominated
pair, are out of scope in v1.

Risk labels come from Core's closed set. `fundOut` means assets leave the
account in this transaction, so `supply` is `["fundOut", "approval"]` (it grants
the vault an allowance and then sends the asset) and `withdraw` is `["fundOut"]`
(it burns the caller's shares). Neither carries `debt`: a vault depositor lends.
The vault borrows in Morpho Blue markets on its own behalf, never on the
depositor's, so no repayment obligation is created.

## Vault identity

The vault is a parameter, and `supply`, `withdraw`, `position` and `vaultInfo`
all refuse an address unless the canonical MetaMorpho V1.1 factory reports
`isMetaMorpho(vault) == true` on chain. Morpho vaults are created
permissionlessly, so a hardcoded catalog would be stale within a week, and the
factory is an on-chain authority rather than an off-chain snapshot.

Factory provenance is not curation: anyone can deploy a vault through the
factory and point it at markets of their choosing. `vaultInfo` returns the
owner, curator, guardian, timelock and fee so an Agent or a person can judge a
vault they were handed. `GROVE_STEAKHOUSE_AUSD_VAULT` is exported as a
documented starting point, the one Monad vault Morpho's own interface listed on
2026-08-01, and it is what the live test targets.

## Addresses

Fixed deployments come from the canonical Monad protocol registry,
<https://github.com/monad-crypto/protocols/blob/main/mainnet/morpho.jsonc>
(retrieved 2026-08-01):

| Constant | Address |
| --- | --- |
| `MORPHO_BLUE_ADDRESS` | `0xD5D960E8C380B724a48AC59E2DfF1b2CB4a1eAee` |
| `METAMORPHO_V1_1_FACTORY_ADDRESS` | `0x33f20973275B2F574488b18929cd7DCBf1AbF275` |
| `ADAPTIVE_CURVE_IRM_ADDRESS` | `0x09475a3D6eA8c314c592b1a3799bDE044E2F400F` |

The live test checks deployed bytecode for each, and checks that the factory's
own `MORPHO()` returns the Morpho Blue address above, so the two constants are
cross-checked against each other on chain rather than only against the registry
file.

## ABI provenance (ADR 0007)

Two origins, one per artifact, both recorded in the generated file's header.

**Compiled** (`src/abis/metamorpho-v1-1.ts`): the vault, factory and vault
event ABIs are compiled from Morpho's own Solidity, vendored verbatim under
`contracts/src/` at a pinned commit of `morpho-org/metamorpho-v1.1` with a
sha256 per file in `contracts/SOURCES.json`.

This is compiled rather than vendored from the SDK for a concrete reason: the
`metaMorphoAbi` Morpho publishes in `@morpho-org/morpho-ts` is the MetaMorpho
**V1.0** artifact, and it does not contain `UpdateLostAssets`. Every V1.1 vault
on Monad emits that event on deposit and on withdrawal, and a Receipt has to
cover every Change, so the missing entry is load-bearing rather than cosmetic.
No published Morpho package carries a V1.1 ABI, so the ABI comes from solc.

**Vendored** (`src/abis/morpho.ts`): the Morpho Blue and Adaptive Curve IRM
ABIs are derived from `@morpho-org/blue-sdk-viem` and `@morpho-org/morpho-ts`,
committed verbatim under `abis-src/` with tarball digests in
`abis-src/VENDOR.json`. Both contracts are immutable single-version
deployments, so the published artifact cannot drift from the deployed code.

```bash
pnpm gen:abis            # offline: re-derive src/abis/morpho.ts from abis-src/
pnpm update:abis         # network: re-vendor the SDK modules, then re-derive
pnpm gen:contract-abis   # needs foundry: recompile contracts/ (only when it changes)
pnpm update:contracts    # network: re-fetch Morpho's Solidity, then recompile
```

`test/abis.test.ts` enforces both chains offline: the vendored module must match
the deterministic generator byte for byte, and every vendored Solidity file must
still match its recorded digest.

## Verification

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
MOSS_SKIP_E2E=1 pnpm test    # skip the Monad-mainnet checks
```

The Monad-mainnet test simulates a real supply on a live vault through
`debug_traceCall`, requires zero Warnings, and asserts that the Receipt covers
every Change the trace produced. Nothing is signed or sent, and the simulation
needs no funds and no keys. Because the simulator overrides only the sender's
native balance, the simulated supplier has to hold the vault's asset for real;
the test uses Morpho Blue, which custodies every asset the vault has supplied
into its markets, so its balance is there for as long as the vault has
deposits.

## Known limitations

- Vault APY is not computed. Deriving it on chain means reading every market in
  the vault's withdraw queue, each market's rate from its IRM and Morpho's WAD
  share math. That is a separate change with its own numeric verification
  against Morpho's published figures, not a footnote on this one.
- `supply` and `withdraw` only. Share-denominated `mint` and `redeem`, the
  public allocator, reward claims and Morpho Vaults V2 are all out of scope.
- Vault events are bound to whichever address emitted the ERC-4626 event and
  the MetaMorpho bookkeeping events together. Morpho Blue and IRM events are
  bound to their fixed deployments as well as to the flow itself: a market event
  has to be the direction the operation produces and has to name the vault as
  its participant, so market activity belonging to another account fails the
  Receipt instead of being reported as this operation's evidence. A market
  running a non-canonical IRM fails it too, loudly, rather than being accepted
  unexplained.
- The ERC-4626 caller has to be the share owner, which is the only shape
  `supply` and `withdraw` build. OpenZeppelin v5 spends a share allowance
  without emitting anything, so a third-party caller leaves nothing in the log
  to check it against. A receiver that is not the owner is fine on withdraw
  because the asset transfer proves it, and the Outcome names it.
- ERC-20 evidence is correlated by candidate set rather than by first match. The
  parser collects every Transfer that fits the operation's share shape and every
  Transfer that fits its asset shape, then requires exactly one of each. A
  Receipt parser cannot read the vault's `asset()`, and vault assets are
  permissionless, so a Transfer with the right endpoints and amount does not
  prove which token moved. A decoy token or a duplicated movement makes the set
  ambiguous. The Receipt then fails closed and names the candidates it found
  instead of attributing the operation to one of them. Transfers that fit
  neither shape stay ordinary ERC-20 evidence through the dependency Receipt.
- `vaultInfo` reports `depositCapacityForAccount` next to
  `depositCapacityAccount`. ERC-4626 scopes `maxDeposit` to a receiver, so that
  number is one account's ceiling and not a vault-global cap.
