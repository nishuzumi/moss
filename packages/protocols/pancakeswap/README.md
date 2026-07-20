# @themoss/protocol-pancakeswap

This package contains the self-describing PancakeSwap V2 and V3 Protocols for
Monad mainnet. It exports `PancakeSwapV2` for V2 constant-product swaps and
`PancakeSwap` for V3 single-hop swaps. The default MCP CLI selects the module
namespace, so `discover` and `load` expose both without import-time
registration.

## Capabilities and Queries

- `quote`: quotes either a fixed human-readable `amountIn` or minimum
  `amountOut`.
- `swap`: builds one Router transaction. ERC-20 inputs add the explicitly
  declared `ERC20.approve` dependency as a nested Capability.
- direct and single-WMON-hop candidates are compared at the same quote point;
  equal quotes select the direct path.
- exact-input swaps maximize output. Target-output swaps minimize quoted input
  and add the selected slippage as maximum-input headroom.

Parameters use explicit token addresses or `native`; token symbols are not
accepted. Slippage defaults to 50 bps and is capped at 5,000 bps. Transactions
use a 20-minute deadline. Fee-on-transfer tokens are not supported.

## Receipt evidence

Each swap owns one `swapReceipt`. It exhaustively parses the direct
transaction's ordered native transfers, WMON Deposit/Withdrawal events,
ERC-20 Transfers, and dynamic Pair Sync/Swap events. Every input Change is
retained by identity and order. The structured outcome derives the actual
input/output assets and amounts only from this evidence; it does not read the
planned route or call RPC.

## Deployment and ABI origins

The Router and Factory addresses come from PancakeSwap's official Monad v2
deployment list. Live tests verify Router bytecode plus `factory()` and
`WETH()` results. Router and Pair ABIs are full explorer-tier artifacts from
verified MonadScan pages. The package's source table covers the V2 and V3
contracts and regenerates every explorer artifact through the shared ABI tool:

```bash
pnpm --filter @themoss/protocol-pancakeswap update:abis
```

The command uses `@themoss/abi-tools` and requires `MONADSCAN_API_KEY`.
`test/abis.test.ts` deterministically checks every committed artifact against
the shared renderer.

Run the end-to-end example from the repository root with
`pnpm --filter @themoss/example-simple-flow pancakeswap-v2`.
