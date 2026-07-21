# @themoss/protocol-fastlane

## 0.1.0

### Minor Changes

- FastLane shMONAD liquid staking adapter for Monad mainnet. Provides five
  Capabilities, five Queries, and typed Receipt parsers with ERC-20 dependency
  delegation.

  - **Capabilities:** `deposit` (stake MON for shMON shares), `redeem` (atomic
    ERC-4626 exit, may include exit fee), `requestUnstake` + `completeUnstake`
    (delayed epoch-gated exit, no fee), `boostYield` (transfer shMON to a yield
    originator).
  - **Queries:** `balanceOf`, `totalSupply`, `previewDeposit`, `previewRedeem`,
    `convertToAssets`. Static metadata (`name`/`symbol`/`decimals`) exported as
    `SHMON_NAME`/`SHMON_SYMBOL`/`SHMON_DECIMALS` compile-time constants.
  - **Receipts:** pure functions with exhaustive Change coverage, identity/
    length/order preservation, and `Deposit.assets === nativeTransfer.value` /
    `Withdraw.assets === nativeTransfer.value` cross-checks. Mint/burn Transfer
    events delegated to the injected `ERC20` Protocol dependency.
  - **Capability naming:** name = contract method name (auditor-facing);
    `verb` = user-perspective semantic (UI-facing). Entry: `deposit` with
    `verb: "stake"`. Exit: `redeem` (atomic) and `requestUnstake`/
    `completeUnstake` (delayed), all with `verb: "unstake"`.
  - **Verification:** ABI explorer cross-check (`test-online/abi-explorer.test.ts`)
    verifying proxy address, EIP-1967 implementation slot, and semantic
    equivalence with the explorer-verified ABI; live Monad mainnet e2e tests
    covering every Capability path; compile-time type fixtures with positive and
    `@ts-expect-error` negative cases.

### Notes

- ABI tier: Explorer (ADR 0007) from monadscan.com.
- Staking proxy: `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c`
- EIP-1967 implementation: `0x856a4019228c265dee336df705277607c4a18e1b`
- The staking vault itself implements the ERC-20 interface for shMON shares
  (no separate token contract).

### Patch Changes

- Updated dependencies
  - @themoss/core@0.1.0
  - @themoss/erc@0.1.0
