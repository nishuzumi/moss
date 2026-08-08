# @themoss/protocol-clober

Moss Protocol package for single-book Clober V2 market swaps up to a caller-supplied input cap on Monad mainnet.

## Operations

- `quote`: derives the canonical single-book market, verifies its `BookKey` on-chain, and returns the maximum input, estimated amount spent, and expected/minimum output in human token units.
- `swap`: repeats the current quote and verification, safely prepares ERC-20 allowance when needed, and builds one direct `Controller.spend` transaction.

Inputs use explicit token addresses or `native`, a human-readable `amountIn`, and slippage in basis points (default `50`, or 0.5%). `amountIn` is a maximum: Clober may spend less because of whole-unit rounding or changed state. Unspent ERC-20 remains with the user; unspent prefunded native MON is refunded. The package does not accept a caller-supplied BookId or transaction target.

## Trust and provenance

Monad mainnet deployments come from the official Clober V2 SDK address book:

| Contract | Address |
| --- | --- |
| Controller | `0x19b68a2b909D96c05B623050C276FBD457De8e83` |
| BookManager | `0x6657d192273731C3cAc646cc82D5F28D0CBE8CCC` |
| BookViewer | `0xe424c211e2Ed8a5B6d1C57FA493C41715568D238` |

Source: [Clober V2 SDK addresses](https://github.com/clober-dex/v2-sdk/blob/affcd7661ed6df93c4a0f7617efe066fcb965959/src/constants/chain-configs/addresses.ts), retrieved 2026-07-16. Live tests verify non-empty deployed bytecode, pinned code hashes, and contract relationships.

ABIs are vendored verbatim from `@clober/v2-sdk@1.0.3` (tarball SHA-256 `971c3819199cad74f3d5c61d62a632791dafbd2c246d1772268ed84541656de7`) and deterministically regenerated into `src/abis/clober.ts`. `test/abis.test.ts` enforces the source-to-generated chain.

Monadscan reported `Contract source code not verified` for Controller, BookManager, and the BookViewer implementation when checked with a valid API key on 2026-07-28. The package therefore makes no explorer-verification claim and does not infer the deployment form of Controller or BookManager. Following ADR 0007's fallback, `abis.json` records runtime-code keccak256 values observed at Monad block `91024325`; `test-online/abi-deployment.test.ts` requires non-empty code and checks:

| Required surface | Selector/topic | Runtime code checked |
| --- | --- | --- |
| `Controller.spend(...)` | `0xc0e8e89a` | Controller |
| `Controller.bookManager()` | `0x3f322bc9` | Controller |
| `BookManager.getBookKey(uint192)` | `0x9b22917d` | BookManager |
| `BookManager.Take(uint192,address,int24,uint64)` | `0xc4c20b9c4a5ada3b01b7a391a08dd81a1be01dd8ef63170dd9da44ecee3db11b` | BookManager |
| `BookViewer.getExpectedOutput(...)` | `0x0202121a` | BookViewer implementation |
| `BookViewer.bookManager()` | `0x3f322bc9` | BookViewer implementation |

The same suite pins BookViewer's ERC-1967 implementation at `0x3dc8156a2524d524e5825e7d73250fD0Aa4D8828` and verifies that Controller and BookViewer both report the recorded BookManager. Selector/topic presence is only a tripwire, not proof of ABI layout; the vendored source comparison and live bidirectional quote/simulation tests cover decoding and behavior. Adding another Handle method or decoded event requires extending this record.

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

Moss admits a quote only when the Viewer estimates `spentAmountIn >= ceil(amountIn × 9,990 / 10,000)`, equivalently when estimated unspent input is at most `floor(amountIn / 1,000)`. This 99.9% check is a construction-time quote policy, not an execution guarantee or a unit-aware dust test. `Controller.spend` has no minimum-input constraint, and chain state may change before simulation; `amountIn` therefore remains a maximum. The transaction enforces the slippage-derived minimum output, while the Receipt exposes the actual input spent, output received, and native refund for Agent intent alignment.

Clober executes only whole quote units; unspent ERC-20 input is not pulled, while unspent prefunded native input is refunded. An otherwise executable quote with non-zero output may therefore still be rejected, especially for small native MON → USDC trades. The boundary can vary non-monotonically with input size, book price, output unit size, and direction. The adapter intentionally fails closed until a future policy can reliably distinguish unit rounding from genuine liquidity exhaustion. Swap transactions use the official SDK's [20-minute deadline window](https://github.com/clober-dex/v2-sdk/blob/affcd7661ed6df93c4a0f7617efe066fcb965959/src/utils/time.ts).

Input caps must be exactly representable in the catalogued token's smallest unit; excess non-zero decimal precision is rejected instead of silently rounded. Clober does not call optional ERC-20 `name()` or `symbol()` metadata. ERC-20 allowance is read before construction: zero allowance produces `approve(amountIn)`, a non-zero insufficient allowance produces `approve(0)` then `approve(amountIn)` for zero-reset tokens, and sufficient allowance skips approval.

The Receipt parser uses only ordered simulation Changes. It maps the `Take` BookId back to one curated direction, requires non-zero fill and settlement amounts, and rejects unexpected tokens or participants. For MON → USDC it requires `user → Controller → BookManager` native input settlement, `BookManager → user` USDC output, and permits at most one balanced native refund from Controller to that user. For USDC → MON it requires `user → BookManager` USDC input and `BookManager → user` native output. These paths mirror the pinned [`Controller._settleTokens`](https://github.com/clober-dex/v2-periphery/blob/c694288121496dbae0bfc268114384895d0ac5bd/src/Controller.sol#L408-L438) implementation. Native/ERC-20 settlement Changes are delegated to the ERC Protocol while preserving every original Change object in order.

The root typed Outcome directly records `user`, `tokenIn`, `tokenOut`, `actualAmountIn`, `actualAmountOut`, and `refundedAmountIn` in chain base-unit decimal strings. Its `settlements` type accepts transfer outcomes only; approvals and other ERC outcomes fail closed. `Take.user` is exposed as each fill's `controller` because that event field must equal the fixed Controller, avoiding confusion with the actual swap user.

The current Moss Receipt contract does not pass Capability parameters or the transaction sender into a parser, so the user is inferred from the required input debit. The parser still relies on the Simulator to supply the complete, correctly attributed Change set; it performs no external reads or trace reconstruction. It deliberately rejects an extra sweep caused by assets that were already present on Controller, because those funds cannot be attributed to the current swap.

## Current scope

- Monad mainnet only.
- Curated native MON/USDC markets only.
- Single-book market orders up to a caller-supplied input cap only.
- No target-output swaps, multi-book routing, limit orders, custom hooks, permits, or caller-supplied market identifiers.

Run the package checks from the repository root:

```bash
pnpm lint
pnpm build
pnpm typecheck
NODE_USE_ENV_PROXY=1 pnpm test
pnpm --filter @themoss/protocol-clober test:abi:online
```
