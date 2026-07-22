# @themoss/protocol-clober

Moss Protocol package for exact-input market swaps on the Clober V2 on-chain orderbook on Monad mainnet.

## Operations

- `quote`: derives the canonical single-book market, verifies its `BookKey` on-chain, and returns the requested input, estimated amount spent, and expected/minimum output in human token units.
- `swap`: repeats the current quote and verification, safely prepares ERC-20 allowance when needed, and builds one direct `Controller.spend` transaction.

Inputs use explicit token addresses or `native`, a human-readable `amountIn`, and slippage in basis points (default `50`, or 0.5%). The package does not accept a caller-supplied BookId or transaction target.

## Trust and provenance

Monad mainnet deployments come from the official Clober V2 SDK address book:

| Contract | Address |
| --- | --- |
| Controller | `0x19b68a2b909D96c05B623050C276FBD457De8e83` |
| BookManager | `0x6657d192273731C3cAc646cc82D5F28D0CBE8CCC` |
| BookViewer | `0xe424c211e2Ed8a5B6d1C57FA493C41715568D238` |

Source: [Clober V2 SDK addresses](https://github.com/clober-dex/v2-sdk/blob/affcd7661ed6df93c4a0f7617efe066fcb965959/src/constants/chain-configs/addresses.ts), retrieved 2026-07-16. Live tests verify deployed bytecode and contract relationships.

ABIs are vendored verbatim from the guarded `@clober/v2-sdk` npm tarball and deterministically regenerated into `src/abis/clober.ts`. `test/abis.test.ts` enforces the source-to-generated chain. `test-online/abi-explorer.test.ts` uses the shared `@themoss/abi-tools` pipeline to cross-check those vendored ABIs against Monadscan-verified deployed contracts. Controller and BookManager are pinned as non-proxy contracts; BookViewer is pinned as an ERC-1967 proxy whose current implementation is `0x3dc8156a2524d524e5825e7d73250fD0Aa4D8828`.

## Supported market catalog

The v1 catalog deliberately contains only the two independently verified directions below:

| Input | Output | Input decimals | Output decimals |
| --- | --- | ---: | ---: |
| native MON | USDC (`0x754704Bc059F8C67012fEd69BC8A327a5aafb603`) | 18 | 6 |
| USDC | native MON | 6 | 18 |

An unlisted pair is rejected before any token or Clober contract read, even if a default-shaped book happens to exist. Every listed direction is still validated on-chain before every quote and swap, so catalog membership does not replace BookKey verification. Additional markets require an explicit catalog change plus live quote/simulation evidence.

## Safety model

The BookId is the low 192 bits of `keccak256(abi.encode(BookKey))`, matching [Clober V2 core](https://github.com/clober-dex/v2-core/blob/984774e3336d0bac0a4118c0441fb08557349787/src/libraries/BookId.sol#L10-L13) and the [official SDK](https://github.com/clober-dex/v2-sdk/blob/affcd7661ed6df93c4a0f7617efe066fcb965959/src/entities/book/utils/book-id.ts#L9-L35). The catalog uses zero hooks, Monad's default packed maker/taker policies (`8_888_608`/`8_888_708`), and the SDK [unit-size rule](https://github.com/clober-dex/v2-sdk/blob/affcd7661ed6df93c4a0f7617efe066fcb965959/src/utils/unit-size.ts#L7-L12). The returned `BookKey` must exactly match all derived values before quoting or constructing a Capability.

Quotes intentionally use `BookViewer.getExpectedOutput`. [`Controller.spend` has no return value](https://github.com/clober-dex/v2-periphery/blob/c694288121496dbae0bfc268114384895d0ac5bd/src/interfaces/IController.sol), so simulating it can validate execution but cannot itself return a quote. The [official SDK follows the same Viewer-to-Controller path](https://github.com/clober-dex/v2-sdk/blob/affcd7661ed6df93c4a0f7617efe066fcb965959/src/calls/market/market.ts), and Clober's [upstream Controller test](https://github.com/clober-dex/v2-periphery/blob/c694288121496dbae0bfc268114384895d0ac5bd/test/unit/controller/ControllerSpendOrder.t.sol#L56-L65) checks Viewer values against executed balance changes. Moss additionally simulates the real `Controller.spend` path on Monad with zero slippage and requires the settled output to meet the Viewer quote with zero warnings.

Moss accepts a quote only when `spentAmountIn >= ceil(amountIn × 9,990 / 10,000)`, equivalently when unspent input is at most `floor(amountIn / 1,000)`. This is a conservative adapter policy, not a Clober fill guarantee or a unit-aware dust test. Clober executes only whole quote units; unspent ERC-20 input is not pulled, while unspent prefunded native input is refunded. An otherwise executable quote with non-zero output may therefore still be rejected, especially for small native MON → USDC trades. The boundary can vary non-monotonically with input size, book price, output unit size, and direction. The adapter intentionally fails closed until a future policy can reliably distinguish unit rounding from genuine liquidity exhaustion. Swap transactions use the official SDK's [20-minute deadline window](https://github.com/clober-dex/v2-sdk/blob/affcd7661ed6df93c4a0f7617efe066fcb965959/src/utils/time.ts).

Input amounts must be exactly representable in the catalogued token's smallest unit; excess non-zero decimal precision is rejected instead of silently rounded. Clober does not call optional ERC-20 `name()` or `symbol()` metadata. ERC-20 allowance is read before construction: zero allowance produces `approve(amountIn)`, a non-zero insufficient allowance produces `approve(0)` then `approve(amountIn)` for zero-reset tokens, and sufficient allowance skips approval.

The Receipt parser uses only ordered simulation Changes. It maps the `Take` BookId back to one curated direction, requires non-zero fill and settlement amounts, and rejects unexpected tokens or participants. For MON → USDC it requires `user → Controller → BookManager` native input settlement, `BookManager → user` USDC output, and permits at most one balanced native refund from Controller to that user. For USDC → MON it requires `user → BookManager` USDC input and `BookManager → user` native output. These paths mirror the pinned [`Controller._settleTokens`](https://github.com/clober-dex/v2-periphery/blob/c694288121496dbae0bfc268114384895d0ac5bd/src/Controller.sol#L408-L438) implementation. Native/ERC-20 settlement Changes are delegated to the ERC Protocol while preserving every original Change object in order.

The current Moss Receipt contract does not pass Capability parameters or the transaction sender into a parser, so the user is inferred from the required input debit. The parser still relies on the Simulator to supply the complete, correctly attributed Change set; it performs no external reads or trace reconstruction. It deliberately rejects an extra sweep caused by assets that were already present on Controller, because those funds cannot be attributed to the current swap.

## Current scope

- Monad mainnet only.
- Curated native MON/USDC markets only.
- Exact-input, single-book market orders only.
- No target-output swaps, multi-book routing, limit orders, custom hooks, permits, or caller-supplied market identifiers.

Run the package checks from the repository root:

```bash
pnpm build
pnpm typecheck
pnpm lint
MOSS_SKIP_E2E=1 pnpm test
MONADSCAN_API_KEY=... pnpm --filter @themoss/protocol-clober test:abi:online
```
