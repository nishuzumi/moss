# @themoss/protocol-kintsu

This package contains the self-describing Kintsu sMON liquid-staking Protocol
for Monad mainnet. The default MCP composition includes the module, so
`discover` exposes `kintsu.deposit` under the `stake` verb.

## Capabilities and Queries

- `quoteDeposit` reads the current on-chain MON-to-sMON conversion and returns
  the quoted and slippage-protected share amounts.
- `deposit` builds one payable `deposit(minShares, receiver)` transaction.
- `convertToAssets` converts a raw sMON share amount into MON wei.
- `totalShares` reads the current raw sMON share supply used by Kintsu.

Deposit amounts must be exactly representable with MON's 18 decimals and fit
the contract's `uint96` value range. Slippage defaults to 50 bps and is capped
at 9,999 bps.

Unstaking is intentionally not exposed. Kintsu redemption is an asynchronous
`requestUnlock` -> batch processing -> cooldown -> `redeem` workflow rather
than one atomic transaction. A future unstaking integration needs to model
those stages explicitly instead of presenting them as a single Capability.

## Receipt Evidence

`depositReceipt` parses the ordered native MON transfer,
`VirtualSharesSnapshot`, sMON mint `Transfer`, and `Deposit` event. It validates
the deposited value, receiver, and minted shares while preserving every input
Change by identity and order, including additional protocol-fee mints.
Unsupported or inconsistent evidence fails closed.

## Deployment and ABI Origin

The Adapter uses the StakedMonad proxy and sMON token at
`0xA3227C5969757783154C60bF0bC1944180ed81B9`, as listed in Kintsu's
[official contract addresses](https://docs.kintsu.xyz/the-kintsu-protocol/official-contract-addresses).
The [MonadScan deployment](https://monadscan.com/address/0xA3227C5969757783154C60bF0bC1944180ed81B9)
identifies the Kintsu-labeled proxy and its current implementation. `abis.json`
records the expected EIP-1967 StakedMonadV2 implementation. The committed full
ABI comes from that implementation's verified MonadScan source, not the stale
V1 artifact linked from older Kintsu documentation.

Refresh the ABI from the repository root with:

```bash
MONADSCAN_API_KEY=... pnpm --filter @themoss/protocol-kintsu update:abis
```

The offline provenance test checks deterministic generated output. The
separate keyed online suite checks proxy bytecode, the implementation slot,
the on-chain sMON name/symbol/decimals, and semantic ABI equality.
