# Kintsu sMON Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-describing Kintsu Adapter that quotes and deposits native MON for sMON on Monad mainnet.

**Architecture:** A new `@themoss/protocol-kintsu` package owns the verified StakedMonad address, a reproducible full-ABI pipeline, one `stake` Capability, three Queries, and a pure exhaustive Receipt parser. The MCP composition root imports the package so Agents discover it by default, while keyed online tests pin the EIP-1967 implementation and verified ABI independently from the vendored Kintsu artifact.

**Tech Stack:** TypeScript 5.9, pnpm workspace, viem, Moss decorators and Handles, Zod schemas from `@themoss/core`, Vitest 3, Changesets.

---

## File Map

- `packages/protocols/kintsu/src/kintsu.ts`: Protocol metadata, parameter schemas, quote math, transaction construction, and Receipt parsing.
- `packages/protocols/kintsu/src/index.ts`: stable public exports.
- `packages/protocols/kintsu/src/abis/staked-monad.ts`: deterministic generated full ABI.
- `packages/protocols/kintsu/abis-src/StakedMonad.json`: verbatim Kintsu artifact.
- `packages/protocols/kintsu/abis-src/VENDOR.json`: source URL, retrieval date, and content hash.
- `packages/protocols/kintsu/scripts/*.ts`: online refresh and offline deterministic ABI generation.
- `packages/protocols/kintsu/test/*.ts`: offline behavior, provenance, and compile-time fixtures.
- `packages/protocols/kintsu/test-online/*.ts`: proxy, bytecode, and explorer ABI checks.
- `packages/mcp-server/src/composition.ts`: default protocol selection.
- `packages/mcp-server/test/server.test.ts`: default discovery assertion.
- `README.md` and `README.zh-CN.md`: supported-protocol documentation.
- `.changeset/config.json` and `.changeset/kintsu-adapter.md`: release metadata.

### Task 1: Scaffold The Package And Reproducible ABI

**Files:**

- Create: `packages/protocols/kintsu/package.json`
- Create: `packages/protocols/kintsu/tsconfig.json`
- Create: `packages/protocols/kintsu/vitest.config.ts`
- Create: `packages/protocols/kintsu/vitest.online.config.ts`
- Create: `packages/protocols/kintsu/abis-src/StakedMonad.json`
- Create: `packages/protocols/kintsu/abis-src/VENDOR.json`
- Create: `packages/protocols/kintsu/scripts/abis.ts`
- Create: `packages/protocols/kintsu/scripts/gen-abis.ts`
- Create: `packages/protocols/kintsu/scripts/update-abis.ts`
- Create: `packages/protocols/kintsu/test/abis.test.ts`
- Create: `packages/protocols/kintsu/src/abis/staked-monad.ts`

- [ ] **Step 1: Add package configuration**

Create the package as public version `0.1.0`. Its scripts are:

```json
{
  "build": "tsup src/index.ts --format esm --dts --sourcemap --clean --target es2022",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:abi:online": "vitest run --config vitest.online.config.ts",
  "update:abis": "tsx scripts/update-abis.ts",
  "gen:abis": "tsx scripts/gen-abis.ts"
}
```

Runtime dependencies are `@themoss/core`, `@themoss/erc`, and `viem`.
Development dependencies are `@themoss/abi-tools`, `@themoss/system`,
`@themoss/simulator`, `tsx`, `tsup`, `typescript`, and `vitest`, using the
same workspace/version ranges as `@themoss/protocol-kuru`.

The TypeScript config extends `../../../tsconfig.base.json` and includes
`src`, `test`, `test-online`, and `scripts`. Both Vitest configs alias the
workspace source packages; the default config includes only
`test/**/*.test.ts`, and the online config includes only
`test-online/**/*.test.ts`.

- [ ] **Step 2: Vendor the official artifact verbatim**

Run:

```bash
curl -fsSL \
  https://content.gitbook.com/content/G6aohgZeWmJ4t4JLP7VO/blobs/rx3r82X6K65p0bYPKwH9/StakedMonad.json \
  -o packages/protocols/kintsu/abis-src/StakedMonad.json
shasum -a 256 packages/protocols/kintsu/abis-src/StakedMonad.json
```

Record the exact digest in `VENDOR.json` with this shape:

```json
{
  "name": "Kintsu StakedMonad",
  "source": "https://content.gitbook.com/content/G6aohgZeWmJ4t4JLP7VO/blobs/rx3r82X6K65p0bYPKwH9/StakedMonad.json",
  "documentation": "https://docs.kintsu.xyz/the-kintsu-protocol/architecture-and-integration/monad-lst-architecture/contract-interface-abi-and-functions",
  "sha256": "8eaf588446d1925d06755b66923bc90f6992433c051baaf9ca4c7cfe0bc615a1",
  "vendoredAt": "2026-07-26"
}
```

- [ ] **Step 3: Write the failing provenance test**

Create `test/abis.test.ts`:

```ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate, readVendorInfo } from "../scripts/abis.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Kintsu ABI provenance", () => {
  it("keeps the official artifact at its recorded sha256", () => {
    const raw = readFileSync(join(root, "abis-src", "StakedMonad.json"));
    expect(createHash("sha256").update(raw).digest("hex")).toBe(readVendorInfo(root).sha256);
  });

  it("derives the committed TypeScript ABI byte-for-byte", () => {
    expect(readFileSync(join(root, "src", "abis", "staked-monad.ts"), "utf8")).toBe(
      generate(root),
    );
  });
});
```

- [ ] **Step 4: Run the provenance test and verify RED**

Run:

```bash
pnpm --filter @themoss/protocol-kintsu test -- test/abis.test.ts
```

Expected: FAIL because `scripts/abis.ts` and the generated ABI do not exist.

- [ ] **Step 5: Implement deterministic generation**

`scripts/abis.ts` must:

1. Read and type-check `VENDOR.json`.
2. Verify the artifact SHA-256 before parsing.
3. Accept either a bare ABI array or an artifact object with an `abi` array.
4. Emit a provenance header and
   `export const StakedMonadAbi = <full ABI> as const;`.

Use this public surface:

```ts
export interface VendorInfo {
  name: string;
  source: string;
  documentation: string;
  sha256: string;
  vendoredAt: string;
}

export function readVendorInfo(packageRoot: string): VendorInfo;
export function generate(packageRoot: string): string;
```

`scripts/gen-abis.ts` writes `generate(packageRoot)` to
`src/abis/staked-monad.ts`.

`scripts/update-abis.ts` fetches `readVendorInfo(packageRoot).source`, rejects
non-2xx responses, writes the response bytes verbatim, updates `sha256` and
`vendoredAt`, then regenerates the TypeScript module. It must not alter the
source or documentation URLs.

- [ ] **Step 6: Generate the ABI and verify GREEN**

Run:

```bash
pnpm --filter @themoss/protocol-kintsu gen:abis
pnpm --filter @themoss/protocol-kintsu test -- test/abis.test.ts
```

Expected: both provenance tests PASS.

- [ ] **Step 7: Commit the ABI foundation**

```bash
git add packages/protocols/kintsu
git commit -m "feat(kintsu): add verified StakedMonad ABI"
```

### Task 2: Implement Quote And Deposit Construction

**Files:**

- Create: `packages/protocols/kintsu/test/kintsu.test.ts`
- Create: `packages/protocols/kintsu/src/kintsu.ts`
- Create: `packages/protocols/kintsu/src/index.ts`

- [ ] **Step 1: Write failing quote and transaction tests**

Create a fake runtime whose `readContract` returns `950n` for
`convertToShares`, `1_050n` for `convertToAssets`, and `10_000n` for
`totalShares`. Register `ERC20` and `Kintsu`, then assert:

```ts
expect(await registry.query("kintsu", "quoteDeposit", ACCOUNT, {
  amount: "1",
  slippage: 50,
})).toEqual({
  amount: "1000000000000000000",
  quotedShares: "950",
  minimumShares: "945",
  slippage: 50,
});

const capability = await registry.action("kintsu", "deposit", ACCOUNT, {
  amount: "1",
  receiver: RECEIVER,
  slippage: 50,
});
expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
  from: ACCOUNT,
  to: KINTSU_STAKED_MONAD_ADDRESS,
  value: "0xde0b6b3a7640000",
});
expect(decodeFunctionData({
  abi: StakedMonadAbi,
  data: flattenCapabilityTree(capability)[0]!.transaction.data,
})).toEqual({
  functionName: "deposit",
  args: [945n, RECEIVER],
});
```

Also assert that `convertToAssets({ shares: "1000" })` and `totalShares({})`
return raw integer strings, and that `depositReceipt([])` rejects missing
evidence.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @themoss/protocol-kintsu test -- test/kintsu.test.ts
```

Expected: FAIL because the Kintsu exports do not exist.

- [ ] **Step 3: Implement the minimal Protocol**

In `src/kintsu.ts`:

- export `KINTSU_STAKED_MONAD_ADDRESS` with the verified checksum address;
- define `KintsuSlippage = BasisPoints.max(9_999)`;
- define a positive raw share schema from `UnsignedIntegerString.refine`;
- declare the StakedMonad Handle and an injected `ProtocolRef<ERC20>`;
- add `quoteDeposit`, `convertToAssets`, and `totalShares` Queries;
- add the `deposit` Capability with verb `stake`, risks `fundOut` and
  `priceImpact`, and exactly one direct transaction;
- implement one private preparation method shared by quote and deposit;
- reject amounts greater than `(1n << 96n) - 1n`, zero quotes, and
  floor-rounded zero minimum shares;
- initially make `depositReceipt` reject an empty Change list with
  `"Kintsu deposit Receipt requires native transfer, minted sMON, and Deposit"`.

The shared calculation is:

```ts
const amount = parseUnits(params.amount, 18);
if (amount > UINT96_MAX) throw new Error("kintsu.deposit amount exceeds uint96");
const quotedShares = await this.stakedMonad.read.convertToShares([amount]);
const minimumShares = (quotedShares * (10_000n - BigInt(params.slippage))) / 10_000n;
if (quotedShares === 0n || minimumShares === 0n) {
  throw new Error("kintsu.deposit quote produced zero protected shares");
}
```

Export the ABI, address, outcome type, and `Kintsu` class from `src/index.ts`.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
pnpm --filter @themoss/protocol-kintsu test -- test/kintsu.test.ts
```

Expected: quote, query, transaction, and empty-Receipt tests PASS.

- [ ] **Step 5: Add boundary tests one at a time**

Add and run one failing assertion before each implementation adjustment:

```ts
it.each([
  [{ amount: "1", slippage: 10_000 }, "invalid parameters"],
  [{ amount: ((1n << 96n) + 1n).toString(), slippage: 0 }, "exceeds uint96"],
])("rejects unsafe quote input", async (params, message) => {
  await expect(registry.query("kintsu", "quoteDeposit", ACCOUNT, params))
    .rejects.toThrow(message);
});
```

Add separate tests for an RPC rejection, a zero quote, and a quote of `1n`
with non-zero slippage producing zero protected shares. Confirm each test
fails for the intended reason before changing production code, then rerun the
focused suite after each fix.

- [ ] **Step 6: Commit quote and transaction behavior**

```bash
git add packages/protocols/kintsu/src packages/protocols/kintsu/test/kintsu.test.ts
git commit -m "feat(kintsu): quote and build sMON deposits"
```

### Task 3: Implement Exhaustive Deposit Receipts

**Files:**

- Modify: `packages/protocols/kintsu/test/kintsu.test.ts`
- Modify: `packages/protocols/kintsu/src/kintsu.ts`

- [ ] **Step 1: Write the failing happy-path Receipt test**

Construct these exact ordered Changes:

```ts
const native = {
  kind: "nativeTransfer",
  from: ACCOUNT,
  to: KINTSU_STAKED_MONAD_ADDRESS,
  value: "1000",
} satisfies Change;
const minted = erc20Transfer(
  KINTSU_STAKED_MONAD_ADDRESS,
  zeroAddress,
  RECEIVER,
  950n,
);
const deposited = kintsuDeposit(ACCOUNT, RECEIVER, 1000n, 950n);
const changes = [native, minted, deposited] as const;
```

Parse the Receipt and assert:

```ts
expect(receipt.outcome).toEqual({
  operation: "deposit",
  sender: ACCOUNT,
  receiver: RECEIVER,
  assets: "1000",
  shares: "950",
});
expect(flattenReceiptChanges(receipt)).toEqual(changes);
expect(flattenReceiptChanges(receipt)[0]).toBe(native);
expect(flattenReceiptChanges(receipt)[1]).toBe(minted);
expect(flattenReceiptChanges(receipt)[2]).toBe(deposited);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @themoss/protocol-kintsu test -- test/kintsu.test.ts
```

Expected: FAIL with the minimal missing-evidence Receipt error.

- [ ] **Step 3: Implement the happy-path parser**

Map over the original list exactly once. For each entry:

- represent a native transfer as a direct `ReceiptChange`;
- decode events from the Kintsu address with `StakedMonadAbi`;
- delegate each `Transfer` event to `this.erc20.changesReceipt([change])`;
- represent the single `Deposit` event as a direct `ReceiptChange`;
- reject events from unsupported addresses or unsupported Kintsu event names.

Track the decoded Deposit, the matching native transfer, and a zero-address
mint to the Deposit owner. After mapping, validate:

```ts
isAddressEqual(native.from, deposit.sender)
isAddressEqual(native.to, KINTSU_STAKED_MONAD_ADDRESS)
native.value === deposit.assets
isAddressEqual(mint.to, deposit.receiver)
mint.amount === deposit.shares
```

Return a typed `ReceiptResult<KintsuDepositOutcome>` without using Capability
parameters, runtime state, or mutable external state.

- [ ] **Step 4: Verify GREEN**

Run the focused suite and expect the happy path and exact identity/order
assertions to PASS.

- [ ] **Step 5: Add failing fee-mint coverage**

Insert an additional valid sMON mint before the receiver mint and assert all
four Changes remain in order while the outcome still uses the Deposit event.
Run RED, adjust matching logic to select the mint whose recipient and amount
match the Deposit, then run GREEN.

- [ ] **Step 6: Add failing rejection cases**

Add individual tests for:

- missing native transfer;
- missing matching receiver mint;
- missing Deposit;
- duplicate Deposit;
- mismatched native amount;
- mismatched sender;
- mismatched minted shares;
- malformed event data;
- an unsupported Kintsu event such as `Approval`;
- an event emitted by an unrelated address.

Run each new test before its parser adjustment and confirm the failure is
caused by the missing validation. Finish with:

```bash
pnpm --filter @themoss/protocol-kintsu test -- test/kintsu.test.ts
```

Expected: all Kintsu behavior tests PASS.

- [ ] **Step 7: Commit Receipt behavior**

```bash
git add packages/protocols/kintsu/src/kintsu.ts packages/protocols/kintsu/test/kintsu.test.ts
git commit -m "feat(kintsu): parse exhaustive deposit receipts"
```

### Task 4: Add Type And On-Chain Verification

**Files:**

- Create: `packages/protocols/kintsu/test/types.fixture.ts`
- Create: `packages/protocols/kintsu/abis.json`
- Create: `packages/protocols/kintsu/test-online/abi-explorer.test.ts`

- [ ] **Step 1: Add the compile-time fixture**

The fixture calls all public methods with valid inferred inputs and includes
negative assertions:

```ts
declare const kintsu: Kintsu;
declare const ctx: ActionCtx;

void kintsu.deposit({ amount: "1", receiver: ADDRESS, slippage: 50 }, ctx);
void kintsu.quoteDeposit({ amount: "1", slippage: 50 });
void kintsu.convertToAssets({ shares: "1" });
void kintsu.totalShares({});

// @ts-expect-error receiver must be an address.
void kintsu.deposit({ amount: "1", receiver: "bad", slippage: 50 }, ctx);
// @ts-expect-error Receipt parsers accept immutable ordered Changes only.
void kintsu.depositReceipt("bad");
// @ts-expect-error Core, not the parser, stamps protocol provenance.
void (null as unknown as ReturnType<Kintsu["depositReceipt"]>).protocol;
```

Run:

```bash
pnpm --filter @themoss/protocol-kintsu typecheck
```

Expected: PASS with all `@ts-expect-error` directives consumed.

- [ ] **Step 2: Record the live proxy implementation**

Create `abis.json`:

```json
{
  "stakedMonad": {
    "proxy": "0xA3227C5969757783154C60bF0bC1944180ed81B9",
    "implementation": "0x6A4593baBdf617d5D8d6fbC04b53435D08Baf21f",
    "allowedExplorerOnly": []
  }
}
```

- [ ] **Step 3: Write the keyed online test**

Following Kuru's online test pattern, assert:

1. `MONADSCAN_API_KEY` is present;
2. the manifest proxy equals `KINTSU_STAKED_MONAD_ADDRESS`;
3. `getBytecode(proxy)` is non-empty;
4. EIP-1967 storage still resolves to the recorded implementation;
5. the vendored ABI semantically matches the explorer-verified
   implementation ABI using `compareDeployedAbi`.

Run:

```bash
pnpm --filter @themoss/protocol-kintsu test:abi:online
```

Expected with a valid key: all online checks PASS. If the ABI comparison shows
only verified implementation additions, record their canonical signatures in
`allowedExplorerOnly`; any mismatch in a shared function or event remains a
failure.

- [ ] **Step 4: Commit verification**

```bash
git add packages/protocols/kintsu/abis.json packages/protocols/kintsu/test packages/protocols/kintsu/test-online
git commit -m "test(kintsu): verify types and deployed contracts"
```

### Task 5: Wire Default Discovery And Release Metadata

**Files:**

- Modify: `packages/mcp-server/package.json`
- Modify: `packages/mcp-server/src/composition.ts`
- Modify: `packages/mcp-server/test/server.test.ts`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `.changeset/config.json`
- Create: `.changeset/kintsu-adapter.md`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add the workspace dependency and failing discovery test**

Add `"@themoss/protocol-kintsu": "workspace:*"` to MCP server dependencies,
then extend the default-composition test:

```ts
const staking = parseText(
  await client.callTool({ name: "discover", arguments: { verb: "stake" } }),
) as { protocol: string; method: string }[];
expect(staking).toEqual([
  expect.objectContaining({
    protocol: "kintsu",
    method: "deposit",
    kind: "capability",
  }),
]);
```

Run:

```bash
pnpm --filter @themoss/mcp-server test -- test/server.test.ts
```

Expected: FAIL because Kintsu is not in `defaultProtocolModules`.

- [ ] **Step 2: Add Kintsu to default composition**

Import the namespace and append it:

```ts
import * as kintsu from "@themoss/protocol-kintsu";

export const defaultProtocolModules = [system, erc, kuru, pancakeswap, kintsu] as const;
```

Run the focused MCP test again. Expected: PASS.

- [ ] **Step 3: Update docs and Changesets**

Add this row to both supported-protocol tables:

```md
| Kintsu sMON | `@themoss/protocol-kintsu` | `deposit` | `quoteDeposit`, `convertToAssets`, `totalShares` |
```

Add `@themoss/protocol-kintsu` to the linked package group in
`.changeset/config.json`.

Create `.changeset/kintsu-adapter.md`:

```md
---
"@themoss/protocol-kintsu": minor
"@themoss/mcp-server": minor
---

Add the Kintsu sMON liquid-staking Adapter with protected native MON deposits, quotes, exhaustive Receipts, verified ABI provenance, and default MCP discovery.
```

- [ ] **Step 4: Refresh the lockfile**

Run:

```bash
pnpm install --lockfile-only
```

Expected: `pnpm-lock.yaml` gains the Kintsu importer and MCP workspace link
without unrelated dependency upgrades.

- [ ] **Step 5: Commit integration**

```bash
git add packages/mcp-server README.md README.zh-CN.md .changeset pnpm-lock.yaml
git commit -m "feat(mcp): discover Kintsu by default"
```

### Task 6: Full Verification And Pull Request Readiness

**Files:**

- Modify only files required by formatter or verified test failures.

- [ ] **Step 1: Run focused package checks**

```bash
pnpm --filter @themoss/protocol-kintsu build
pnpm --filter @themoss/protocol-kintsu typecheck
pnpm --filter @themoss/protocol-kintsu test
pnpm --filter @themoss/mcp-server test
```

Expected: all commands exit 0.

- [ ] **Step 2: Run repository checks in required order**

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test:offline
```

Expected: all commands exit 0 with no warnings introduced by Kintsu.

- [ ] **Step 3: Inspect the final diff**

```bash
git status --short
git diff --check upstream/main...HEAD
git diff --stat upstream/main...HEAD
git log --oneline upstream/main..HEAD
```

Expected: only the design/plan docs, Kintsu package, MCP wiring, README
entries, Changeset configuration, changeset, and lockfile appear.

- [ ] **Step 4: Request code review**

Use `superpowers:requesting-code-review`, resolve any technically valid
findings with failing regression tests first, and rerun the affected focused
checks.

- [ ] **Step 5: Finish the branch**

Use `superpowers:verification-before-completion`, then
`superpowers:finishing-a-development-branch` to prepare and submit the Pull
Request from `adapter/kintsu` to `nishuzumi/moss:main`.
