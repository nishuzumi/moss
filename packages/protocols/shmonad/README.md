# @themoss/protocol-shmonad

This package contains the self-describing `ShMonad` Protocol for FastLane liquid
staking on Monad mainnet. Staking MON mints shMON, an ERC-4626 vault share that
accrues staking and MEV rewards. The default MCP CLI selects the module
namespace, so `discover` and `load` expose it without import-time registration.

## Capabilities and Queries

- `stake`: deposits native MON and mints shMON to the receiver. MON is forwarded
  as `msg.value` to the ERC-4626 `deposit`; no pre-wrap is needed.
- `unstake`: redeems shMON for MON through ERC-4626 `redeem`.
- `balanceOf`: reads a shMON balance.
- `exchangeRate`: reads the current shMON-to-MON rate from `convertToAssets`.

Amounts are human-readable decimal strings; MON and shMON both use 18 decimals.
The request/complete unbonding flow (`requestUnstake` and related methods) is out
of scope for this version.

## Receipt evidence

`stake` owns `stakeReceipt` and `unstake` owns `unstakeReceipt`. Each parses the
transaction's ordered Changes, retains every input Change by identity and order,
and cross-checks the ERC-4626 event against the native transfer: the Deposit or
Withdraw `assets` must equal the native MON value. ERC-20 Transfer and Approval
events are delegated to the `erc20` dependency. The parsers derive the outcome
only from this evidence and do not call RPC.

## Deployment and ABI origin

`SHMONAD_ADDRESS` is the shMON proxy on Monad mainnet, a
TransparentUpgradeableProxy. Live tests verify its deployed bytecode and the
shMON symbol and decimals.

The ABI is a full explorer-tier artifact (ADR 0007). `getabi` on a proxy returns
the proxy's own ABI, so the ABI is fetched from the ERC-1967 implementation
recorded in `SHMONAD_IMPLEMENTATION_ADDRESS`:

```bash
pnpm --filter @themoss/protocol-shmonad update:abis
```

The command uses `@themoss/abi-tools` and requires `MONADSCAN_API_KEY`.
`test/abis.test.ts` checks the committed artifact against the shared renderer,
and the live e2e reads the proxy's ERC-1967 slot to confirm it still matches the
recorded implementation, so a proxy upgrade turns the suite red.
