# README Protocol Table Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair both root README Protocol tables and add a focused test that catches split tables, orphaned rows, duplicate labels, composition coverage drift, bilingual package drift, and Chinese separator drift.

**Architecture:** Keep documentation validation with the MCP application composition tests because `mcp-server` owns `defaultProtocolModules`. A dependency-free helper will read the two controlled README sections and parse their fixed four-column pipe tables; it will not introduce runtime metadata, registration objects, or a general Markdown dependency.

**Tech Stack:** TypeScript 5.9, Vitest 3, Node.js filesystem APIs, Markdown documentation, pnpm 11 through Corepack.

---

### Task 1: Reproduce and repair the split bilingual tables

**Files:**
- Create: `packages/mcp-server/test/readme.test.ts`
- Modify: `README.md:20-34`
- Modify: `README.zh-CN.md:20-34`

- [ ] **Step 1: Write the failing structural regression tests**

Create `packages/mcp-server/test/readme.test.ts` with:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultProtocolModules } from "../src/composition.js";

type Readme = {
  label: string;
  heading: string;
  source: string;
};

type TableRow = [protocol: string, packageName: string, capabilities: string, queries: string];

const readmes: Readme[] = [
  {
    label: "English",
    heading: "## Supported Protocols",
    source: readFileSync(new URL("../../../README.md", import.meta.url), "utf8"),
  },
  {
    label: "Chinese",
    heading: "## 已支持的 Protocol",
    source: readFileSync(new URL("../../../README.zh-CN.md", import.meta.url), "utf8"),
  },
];

function parseRow(readme: Readme, line: string): TableRow {
  const cells = line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  const [protocol, packageName, capabilities, queries, extra] = cells;

  if (
    protocol === undefined ||
    packageName === undefined ||
    capabilities === undefined ||
    queries === undefined ||
    extra !== undefined
  ) {
    throw new Error(`${readme.label} Protocol table row must have exactly four columns: ${line}`);
  }

  return [protocol, packageName, capabilities, queries];
}

function protocolRows(readme: Readme): TableRow[] {
  const sectionStart = readme.source.indexOf(`${readme.heading}\n`);
  if (sectionStart === -1) throw new Error(`${readme.label} Protocol heading is missing`);

  const sectionEnd = readme.source.indexOf("\n## ", sectionStart + readme.heading.length);
  if (sectionEnd === -1) throw new Error(`${readme.label} Protocol section has no closing heading`);

  const lines = readme.source.slice(sectionStart, sectionEnd).split("\n");
  const tableStart = lines.findIndex((line) => line.startsWith("| Protocol | Package |"));
  if (tableStart === -1) throw new Error(`${readme.label} Protocol table is missing`);

  const tableLines: string[] = [];
  for (const line of lines.slice(tableStart)) {
    if (!line.startsWith("|")) break;
    tableLines.push(line);
  }

  const orphanedRows = lines
    .slice(tableStart + tableLines.length)
    .filter((line) => line.startsWith("|"));
  if (orphanedRows.length > 0) {
    throw new Error(`${readme.label} Protocol rows appear after the table ended`);
  }

  const parsed = tableLines.map((line) => parseRow(readme, line));
  const separator = parsed[1];
  if (!separator?.every((cell) => /^-+$/.test(cell))) {
    throw new Error(`${readme.label} Protocol table separator is invalid`);
  }

  return parsed.slice(2);
}

describe("root README Protocol tables", () => {
  it.each(readmes)("keeps $label Protocol rows in one contiguous table", (readme) => {
    const rows = protocolRows(readme);
    const labels = rows.map(([protocol]) => protocol);

    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps bilingual package coverage aligned with the default composition", () => {
    const [english, chinese] = readmes.map(protocolRows);
    if (!english || !chinese) throw new Error("both README fixtures are required");

    const englishPackages = english.map(([, packageName]) => packageName);
    const chinesePackages = chinese.map(([, packageName]) => packageName);

    expect(chinesePackages).toEqual(englishPackages);
    expect(new Set(englishPackages).size).toBe(defaultProtocolModules.length);
  });
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run:

```bash
corepack pnpm --filter @themoss/mcp-server exec vitest run test/readme.test.ts
```

Expected: FAIL. Both language cases must report `Protocol rows appear after the table ended`; the coverage test must also fail while parsing the broken table. A module-resolution or missing-file error is not the expected red state and must be corrected before continuing.

- [ ] **Step 3: Repair both table structures minimally**

In `README.md`, keep the first PancakeSwap row, place the Monad Cards row immediately after it, delete the second PancakeSwap row, leave one blank line, and then place the existing ERC-1155 paragraph.

The repaired tail must be:

```md
| Nad.fun | `@themoss/protocol-nadfun` | — | `quoteBuy`, `quoteSell`, `tokenStatus` |
| PancakeSwap V2 / V3 | `@themoss/protocol-pancakeswap` | `swap` | `quote` |
| Monad Cards | `@themoss/protocol-monad-cards` | — | `totalMinted` |

ERC-1155 `transfer` accepts a collection, token ID, amount, and recipient. Token IDs and amounts are base-10 uint256 strings, including zero. The Capability builds one `safeTransferFrom`; batch transfer construction is not currently exposed. Receipts still decode both `TransferSingle` and `TransferBatch` Changes without aggregating or reordering their items.
```

Apply the same structural repair in `README.zh-CN.md`, retaining its existing Chinese paragraph text. Do not change the ERC-1155 ASCII commas yet; Task 2 establishes their independent red-green cycle.

- [ ] **Step 4: Run the focused test and verify the green state**

Run:

```bash
corepack pnpm --filter @themoss/mcp-server exec vitest run test/readme.test.ts
```

Expected: PASS with 3 tests passing and no warnings.

- [ ] **Step 5: Commit the structural repair**

```bash
git add README.md README.zh-CN.md packages/mcp-server/test/readme.test.ts
git commit -m "fix(docs): repair supported Protocol tables"
```

### Task 2: Normalize Chinese table separators through TDD

**Files:**
- Modify: `packages/mcp-server/test/readme.test.ts`
- Modify: `README.zh-CN.md:25`

- [ ] **Step 1: Add the failing Chinese separator test**

Append inside the existing `describe` block:

```ts
  it("uses Chinese separators in Capability and Query cells", () => {
    const chinese = readmes.find(({ label }) => label === "Chinese");
    if (!chinese) throw new Error("Chinese README fixture is missing");

    for (const [, , capabilities, queries] of protocolRows(chinese)) {
      expect(capabilities).not.toContain(",");
      expect(queries).not.toContain(",");
    }
  });
```

- [ ] **Step 2: Run the focused test and verify the punctuation red state**

Run:

```bash
corepack pnpm --filter @themoss/mcp-server exec vitest run test/readme.test.ts
```

Expected: FAIL only in `uses Chinese separators in Capability and Query cells`, with the ERC-1155 Capability or Query cell containing `,`.

- [ ] **Step 3: Replace only the Chinese ERC-1155 cell separators**

Change the row to:

```md
| ERC-1155 | `@themoss/erc` | `transfer`、`approve` | `balanceOf`、`uri`、`isApprovedForAll` |
```

- [ ] **Step 4: Run the focused test and verify the final green state**

Run:

```bash
corepack pnpm --filter @themoss/mcp-server exec vitest run test/readme.test.ts
```

Expected: PASS with 4 tests passing and no warnings.

- [ ] **Step 5: Commit the punctuation regression**

```bash
git add README.zh-CN.md packages/mcp-server/test/readme.test.ts
git commit -m "test(docs): enforce Chinese table separators"
```

### Task 3: Verify the repository in the required order

**Files:**
- Inspect: all changed files and generated verification output

- [ ] **Step 1: Check formatting and lint rules**

Run:

```bash
corepack pnpm lint
```

Expected: exit 0 with no Biome errors.

- [ ] **Step 2: Build all workspace packages**

Run:

```bash
corepack pnpm -r build
```

Expected: exit 0 for all workspace package builds. This is the direct Corepack equivalent of `pnpm build`; it avoids the unavailable global pnpm shim in this environment.

- [ ] **Step 3: Type-check all workspace packages after building**

Run:

```bash
corepack pnpm -r typecheck
```

Expected: exit 0 for every workspace package.

- [ ] **Step 4: Run the complete live test suite**

Run:

```bash
NODE_USE_ENV_PROXY=1 corepack pnpm -r test
```

Expected: exit 0 for all workspace packages, including Monad-mainnet checks. If the environment cannot reach Monad mainnet, run `MOSS_SKIP_E2E=1 corepack pnpm -r test` and explicitly report that live checks were skipped.

- [ ] **Step 5: Review the final diff and worktree state**

Run:

```bash
git diff upstream/main --check
git diff upstream/main -- README.md README.zh-CN.md packages/mcp-server/test/readme.test.ts
git status --short --branch
```

Expected: no whitespace errors; the diff contains only the approved design/plan records, two README repairs, and the focused test; the branch is clean after the implementation commits.
