# @themoss/protocol-apriori

Moss protocol adapter for **aPriori** MON liquid staking on Monad (aprMON).

## What it does

Three Capabilities mapping aPriori's native-asset vault with an async
withdrawal queue:

- `stake` — `deposit(uint256 assets, address receiver)` payable: stake MON, mint aprMON
- `unstake` — `requestRedeem(uint256 shares, address controller, address owner)`: escrow
  aprMON into the withdrawal queue; returns a request ID claimable by `controller`
- `claim` — `redeem(uint256[] requestIDs, address receiver)`: after the unbonding delay
  (roughly 12–18 hours), burn the escrowed shares and pay MON to `receiver`, net of the
  vault's withdrawal fee

## Contracts (Monad mainnet)

| Contract | Address | Status |
|----------|---------|--------|
| aprMON (proxy, token + vault) | `0x0c65A0BC65a5D819235B71F554D210D3F80E0852` | [Verified TransparentUpgradeableProxy on MonadScan](https://monadscan.com/address/0x0c65A0BC65a5D819235B71F554D210D3F80E0852), labeled "aPriori: aprMON Token" |
| Implementation (EIP-1967) | `0x7D2F8dc5a67CA1911bb1A2429552CDf507d106F2` | Source unverified on MonadScan; set at block 40,124,891 per the proxy's upgrade history |

Canonical deployment source: [aPriori's official integration docs](https://apriori-docs.gitbook.io/apriori-docs/aprmon/smart-contract-integration),
which publish the mainnet address and the exact function/event signatures.

## ABI provenance (ADR 0007, vendored tier)

The implementation contract is **not** explorer-verified (MonadScan shows raw
bytecode only; Sourcify has no match), so no explorer artifact exists to fetch
or compare. The ABI in `src/abis/apriori.ts` is instead vendored verbatim from
the official docs, restricted to entries whose signatures are machine-verifiable,
and the derivation is test-enforced rather than asserted:

- `abis.json` records the proxy/implementation pair.
- `test-online/abi-explorer.test.ts` (keyless, RPC-only) verifies on chain that
  the proxy's EIP-1967 slot still resolves to the recorded implementation, that
  both addresses have deployed bytecode, that **every** vendored function
  selector and event topic hash recomputed from the artifact appears in the
  implementation bytecode, that on-chain `name`/`symbol`/`decimals` match the
  exported `APRMON_*` constants, and that `convertToShares`/`convertToAssets`
  round-trip at a sane exchange rate.
- An aPriori upgrade flips the linkage test red, forcing human re-verification
  of the vendored ABI. If aPriori verifies the implementation, this package
  should switch to the keyed `fetchAbi` + `compareDeployedAbi` explorer
  cross-check used by `@themoss/protocol-kuru`.

## Receipts

Receipt parsers only accept events emitted by the aprMON contract and verify
the full observed asset flow, throwing on partial or mismatched evidence:

- `stake`: `Deposit` + the caller→vault native MON transfer + the zero→owner
  aprMON mint, with amounts cross-checked.
- `unstake`: `RedeemRequest` + the owner→vault aprMON escrow transfer (the
  vault escrows shares at request time; the burn happens at claim).
- `claim`: one `Redeem` per claimed request ID + the vault→zero burn Transfers
  + the vault→receiver native payout, aggregated and cross-checked
  (`Redeem.assets` is net of `Redeem.fee`; observed fee rate ~0.1% of gross).

ERC-20 Transfer evidence is delegated unchanged to `@themoss/erc` as nested
Receipts (ADR 0011).

## Parameters

- `stake`: `amount` (MON, 18 decimals), `receiver` (address)
- `unstake`: `shares` (aprMON, 18 decimals), `controller` (address that owns
  and can claim the request; the acting account is passed as `owner`)
- `claim`: `requestId` (uint256), `receiver` (address)

Amounts with more than 18 decimal places are rejected instead of silently
rounded.

## Notes

- MON is native, so `deposit` is payable with `msg.value == assets`; no ERC20 approve needed.
- `unstake` only queues a withdrawal; `claim` completes it after the unbonding delay.
- `claim` is inflow-only, but core's Registry rejects an empty `risk` list and
  the closed label set has no inflow/obligation label yet, so it carries
  `fundOut` until #114 lands a correct minimal set.
