# @themoss/protocol-uniswap

This package contains the self-describing Uniswap v4 Protocol for Monad
mainnet. It exports `Uniswap` for exact-in single-hop swaps through the
Universal Router with quoting via the canonical V4Quoter. The default MCP CLI
selects the module namespace, so `discover` and `load` expose it without
import-time registration.

## Capabilities and Queries

- `quote`: quotes a fixed human-readable `amountIn` across the canonical
  hookless fee tiers (100, 500, 3000, 10000 pips) and returns the best
  tier's estimated and slippage-protected minimum output.
- `swap`: builds one Universal Router `execute` transaction carrying the
  V4_SWAP command with the SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL action
  sequence. Capability construction repeats the tier quoting against current
  state; an Agent cannot supply a pool id, fee tier, or quote.
- `permit2Approve`: grants the Universal Router a Permit2 allowance with an
  explicit expiration, as a plain on-chain transaction.

Native MON is a first-class v4 currency: `address(0)` in the PoolKey, sent as
`msg.value` on the way in and paid directly by the PoolManager on the way
out. No WMON wrap or unwrap is involved.

ERC-20 input settles through Permit2, the only pull path the Universal Router
supports. Moss excludes signature flows (SECURITY.md), so `swap` nests two
plain approvals for exactly `amountIn`: an `ERC20.approve` to Permit2 and a
`permit2Approve` to the router whose expiration is the swap deadline.

Parameters use explicit token addresses or `native`; token symbols are not
accepted. Slippage defaults to 50 bps and is capped at 5,000 bps.
Transactions use a 20-minute deadline. Multi-hop paths, exact-output swaps,
hooked pools and fee-on-transfer tokens are out of scope for v1.

## Receipt evidence

`swapReceipt` exhaustively parses the direct transaction's ordered Changes:
the PoolManager `Swap` event (checked to be sent by the Universal Router),
the input settlement into the PoolManager, and the output payment out of the
PoolManager, delegating ERC-20 and native transfer classification to the
declared `ERC20` dependency. The settled input and taken output are
cross-checked against the `Swap` event deltas; a mismatch fails the Receipt.
`permit2ApproveReceipt` requires exactly one Permit2 `Approval` event whose
spender is the Universal Router.

## Deployment and ABI origins

Addresses come from Uniswap's official deployment record (`Uniswap/docs`
`content/protocols/v4/deployments.mdx`, "Monad: 143"). These deployments are
direct (non-proxy); `abis.json` pins each address with the keccak256 of its
deployed runtime bytecode, and the live test recomputes the hashes and
asserts every selector and event topic the adapter uses is present in the
deployed bytecode.

ABIs are vendored (ADR 0007) from the npm releases matching the deployed
contracts: `@uniswap/universal-router@2.0.0` (whose tarball also carries the
PoolManager and Permit2 interface artifacts it was built against) and
`@uniswap/v4-periphery@1.0.3` for the V4Quoter. The deployed router predates
the 2.1 line: its bytecode carries the full 2.0.0 surface and none of the
2.1-only additions, which is why the pin is deployment-matched instead of
dist-tags.latest. Regenerate with:

```bash
pnpm --filter @themoss/protocol-uniswap update:abis
```

`test/abis.test.ts` deterministically checks the committed artifact against
the generator output.
