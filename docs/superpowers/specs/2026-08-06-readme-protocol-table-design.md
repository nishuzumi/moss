# README Protocol Table Repair Design

## Goal

Repair the English and Chinese supported-Protocol tables reported in issue #169 and add a focused regression test that prevents table splits, orphaned rows, duplicate Protocol labels, and language drift.

## Chosen approach

Add a small documentation-focused test under `packages/mcp-server/test/` because that package owns the default application composition. The test reads both root READMEs, extracts the supported-Protocol section up to the next level-two heading, and parses pipe-delimited rows without adding a Markdown parser dependency.

The test will require:

- exactly one contiguous four-column table in each supported-Protocol section;
- no table-shaped rows after the table ends;
- unique Protocol display labels;
- identical ordered package cells in English and Chinese;
- one unique documented package per entry in `defaultProtocolModules`; and
- Chinese Capability and Query cells to use `、` rather than ASCII commas.

The README repair will keep Monad Cards inside each table, remove the second PancakeSwap row, move the ERC-1155 explanatory paragraph below the complete table, and normalize the Chinese ERC-1155 separators.

## Alternatives considered

### Documentation-only repair

This is the smallest diff, but it does not prevent the same merge error from recurring when adapter pull requests edit both tables. It is insufficient for the regression described by the issue.

### Full Markdown parser

A CommonMark parser could validate rendered structure, but adding a dependency for two small fixed sections is unnecessary. The repository controls the exact table format, so a narrow parser produces clearer failures with less maintenance.

### Generate tables from composition metadata

Generation would require display names and grouping rules that are not represented by `defaultProtocolModules`: the ERC module has three rows, while the PancakeSwap module groups V2 and V3 into one row. Adding a parallel registration/catalog object would contradict the accepted self-describing Protocol architecture and expand this documentation fix beyond its scope.

## Verification

Follow a red-green cycle: add the regression test and confirm that the current broken READMEs fail for the expected structural and punctuation reasons; then repair both files and confirm the focused test passes. Finish with `pnpm lint`, `pnpm build`, `pnpm typecheck`, and `pnpm test` in that order, using Corepack to provide the repository-pinned pnpm version in this environment.
