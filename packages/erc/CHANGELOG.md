# @mossxyz/erc

## 0.1.0

### Minor Changes

- First public release of Moss: uniform, agent-callable capabilities on Monad
  mainnet — `discover → load → action → simulate` — with the system, not the
  agent, assembling correct transactions.

  - **core**: pure machinery — Registry, Plans (unsigned txs + declared
    `expects` + `planHash` integrity), token catalog with injectable fallback;
    zero chain data, zero ABIs.
  - **simulator**: the verification engine — `debug_traceCall` trace
    simulation with cross-plan state chaining, effects extraction (assets
    out/in, approvals, recipients, native and wrapped flows), and
    declared-vs-actual reconciliation that warns on any undeclared difference.
  - **erc**: the interface layer — compiled standard ABIs (`ERC20Abi`,
    `ERC721Abi`, `WETH9Abi`), address-free generic `erc20`/`erc721` protocols,
    `approveStep` for cross-protocol composition.
  - **system**: the Monad instance layer — verified mainnet token table,
    chain constants and `monadRuntime()`, the WMON wrap/unwrap adapter.
  - **protocol-kuru**: Kuru CLOB adapter — market-order `swap` (MON/USDC,
    MON/AUSD) with auto-declared approvals, plus `quote` and `markets` queries.
  - **mcp-server**: the four MCP tools over stdio (`moss-mcp`), batteries
    included — safety rules encoded in the tool contracts: simulate before any
    signature, halt on warnings. Moss never signs and never sends.

### Patch Changes

- Updated dependencies
  - @mossxyz/core@0.1.0
