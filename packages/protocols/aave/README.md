# @themoss/protocol-aave

Aave v3 lending on Monad mainnet: `supply`, `withdraw`, `borrow` and `repay`,
plus Queries for account health and reserve rates.

## Capabilities

| Capability | Verb | Transactions | Risk |
| --- | --- | --- | --- |
| `supply` | `supply` | nested ERC-20 approval, then `Pool.supply` | `fundOut`, `approval` |
| `withdraw` | `withdraw` | `Pool.withdraw` | `fundOut` |
| `borrow` | `borrow` | `Pool.borrow` | `debt` |
| `repay` | `repay` | nested ERC-20 approval, then `Pool.repay` | `fundOut`, `approval` |

Every Capability owns exactly one direct transaction. `supply` and `repay` need
an allowance because the Pool pulls the underlying with `transferFrom`, so they
nest one ERC-20 approval for the amount the request names, never an unlimited
one. A supply spends all of it. A repay is capped on chain: `BorrowLogic` lowers
`paybackAmount` to the account's current debt before calling `transferFrom`, so
repaying more than is owed spends less than was approved and leaves the
remainder standing. Nothing is signed or sent here.

`borrow` carries `debt` and not `fundOut`. `fundOut` means assets leave the
account in the current transaction, which is true of supply, repay and the
aToken burn in withdraw. A borrow is the other side of that boundary: nothing
leaves, an obligation is added.

`borrow` is inflow-only by design: the asset arrives and nothing leaves, because
the cost is debt rather than an asset. Its Receipt proves the inflow and the
debt-token mint, and refuses anything else.

## Queries

- `accountData(user)` returns market-wide collateral, debt and remaining
  borrowing power **in the market's base currency unit, as the integers the Pool
  returned**, plus `ltv` and `currentLiquidationThreshold` in basis points and
  the health factor with 18 decimals. `healthFactor` is `null` when the account
  has no debt, which is what Aave's `uint256` maximum means.
- `reserve(asset)` returns the reserve's position tokens and its current rates.
  `supplyApr` and `variableBorrowApr` are the on-chain ray rates as fractions
  (`"0.0272"` is 2.72%). The `Apy` fields are derived by compounding that rate
  per second, which is the convention `MathUtils.calculateCompoundedInterest`
  uses on chain: `APY = (1 + APR / 31536000) ^ 31536000 - 1`. The Query also
  re-checks the reserve's aToken and debt token against the Pool's own view.

## Parameters and units

`amount` is a human decimal string in the reserve's display units; the adapter
resolves decimals from `src/tokens.ts` and converts. `asset` is the underlying
reserve address. It is an address rather than a Token reference because the
Monad market lists ERC-20 reserves only: there is no native MON reserve, and
this adapter does not wrap through the WrappedTokenGateway.

There is no `interestRateMode` parameter. Aave v3.2 removed stable-rate
borrowing; every reserve on this deployment reports
`stableDebtTokenAddress = address(0)`, and a `borrow` with mode 1 reverts on
chain. Variable is the only reachable mode, so the adapter pins it instead of
exposing an input an Agent could get wrong.

## Addresses and reserves

Every address comes from the Aave DAO address book (`AaveV3Monad`, `CHAIN_ID`
143), vendored under `abis-src/` and derived into `src/abis/address-book.ts`.
The generator refuses to emit for any other chain id.

`src/tokens.ts` derives the reserve table from that record: symbol, decimals,
underlying, aToken and variable debt token. The Receipt parsers may not read
chain state, so this is what tells them which token addresses are legitimate
emitters. The live Monad suite is the tripwire: it asserts the table equals
`Pool.getReservesList()` and checks each reserve's position tokens and decimals
on chain, so a new governance listing turns the suite red and forces a release
rather than being silently unsupported.

The live suite also verifies deployed bytecode for the Pool and the addresses
provider, the `getPool()` / `ADDRESSES_PROVIDER()` round trip, and the Pool
proxy's ERC-1967 implementation slot against the recorded `POOL_IMPL`.

## ABI origin

Vendored (ADR 0007) from `@aave-dao/aave-address-book` on npm. `abis-src/` holds
the published files byte for byte, including the shared chunk they import and
the source maps they reference, with `VENDOR.json` recording the package
version, the tarball sha256, the vendoring date and the release-age guard.
`pnpm gen:abis` derives `src/abis/` from those committed bytes offline, and
`test/abis.test.ts` asserts the committed output equals that derivation exactly,
so a hand edit anywhere in the chain fails the suite. `pnpm update:abis` is the
network half; it follows upstream's `dist-tags.latest` with a seven-day
release-age guard.

`IAToken` also carries the `IScaledBalanceToken` `Mint` and `Burn` events that
variable debt tokens emit, and the address book publishes no separate debt-token
module, so one scaled-token ABI covers both sides of a position. The live suite
confirms that on chain by finding every selector the adapter calls in the
deployed Pool implementation and every Pool event topic in the Supply and Borrow
logic libraries the Pool delegatecalls.

`pnpm test:abi:online` is the independent explorer anchor ADR 0007 asks for
where the chain provides one. `abis.json` pins the Pool proxy and its
implementation, the suite re-reads the proxy's ERC-1967 slot so an Aave upgrade
turns it red, and it compares the ABI of the explorer-verified implementation
against the vendored artifact over exactly the surface this adapter uses: the
eight functions it calls and the seven events its Receipts decode, listed once
in `test/surface.ts` and shared with the live bytecode check. It is keyed on
`MONADSCAN_API_KEY`, fails rather than skips without one, and is not part of the
default `pnpm test`.

The comparison is scoped to that surface because the vendored `IPool` interface
is genuinely not the deployed implementation everywhere else. Measured on
2026-08-02 against the explorer-verified implementation (Exact Match, solc
0.8.27), a whole-ABI comparison reports 27 differences: `configureEModeCategory`
takes an extra `bool`, `dropReserve`, `resetIsolationModeTotalDebt` and the
`IsolationModeTotalDebtUpdated` event are absent, five logic getters differ in
`stateMutability` (`view` against `pure`), and the deployment adds
`POOL_REVISION`, `UMBRELLA`, `multicall`, `initialize`,
`configureEModeCategoryIsolated`, `getIsEModeCategoryIsolated` and eleven custom
errors. An allowlist covering real differences hides later drift rather than
catching it, and none of those differences touch the surface above, which is
field for field identical: 15 items on each side, zero issues, no allowlist.

## Receipts

One Receipt parser per Capability, each pure and each anchored on the Pool's own
event. A parser accepts only:

- exactly one `Supply`, `Withdraw`, `Borrow` or `Repay` emitted by the Pool
  itself, plus `ReserveDataUpdated` and at most one collateral flag;
- exactly one scaled-balance `Mint` or `Burn` emitted by that reserve's own
  aToken or variable debt token, naming on both indexed arguments the accounts
  the Pool named;
- exactly one underlying transfer, matched on both ends and on the exact amount
  the Pool reported, in the order Aave's logic libraries produce it;
- ERC-20 `Transfer` and `Approval` records, delegated to `@themoss/erc`, and
  only on the reserve's two tokens.

Anything else fails the Receipt, which halts simulation with a Warning.

Both optional shapes are bound to the operation rather than merely recognised. A
supply accepts a collateral flag only as `Enabled` for its own reserve and its
own `onBehalfOf`, a withdraw only as `Disabled` for its own reserve and `user`,
and a borrow or a repay accepts none, because Aave changes collateral use on a
borrow never and on a repay only in the aToken branch this Capability refuses.
The position event is bound from the same execution path: `SupplyLogic` mints the
aToken with the `Supply` event's `user` as caller, `BorrowLogic` mints the debt
token with the `Borrow` event's `user` as caller, an aToken `Burn` names the
`Withdraw` event's `user` and `to`, and a debt-token `Burn` names the `Repay`
event's `user` with a zero target, since clearing debt delivers no underlying.

A withdraw or a repay usually burns the position token, but `_burnScaled` mints
the difference when accrued interest exceeds the amount removed, so those two
accept either. The scaled amount is recorded rather than equated to the Pool's
amount, because Aave rounds it through the reserve index.

## Verify

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

`pnpm test` includes the live Monad mainnet suite, which simulates all four
verbs against real positions. It is free: Moss never signs and never sends.
Use `pnpm test:offline` when the chain is unreachable.

`pnpm test:abi:online` is the keyed explorer cross-check. It needs
`MONADSCAN_API_KEY`, is not part of `pnpm test`, and runs in CI on `main` and
weekly through the ABI cross-check workflow.

## Known limitations

- Withdrawing or repaying the full balance needs `uint256` maximum, which this
  adapter does not expose yet; pass an explicit amount.
- Repaying more than the outstanding debt leaves the unspent part of the
  approval in place; the adapter does not revoke it.
- `supplyWithPermit` and `repayWithATokens` are not exposed. Signature flows are
  out of scope for Moss, and repaying with aTokens is a different user intent.
- `setUserUseReserveAsCollateral` and e-mode are not exposed.
- Positions are always opened for the calling account. Aave's `onBehalfOf` is
  not exposed, so an Agent cannot supply or repay into somebody else's position.
