# Building Your First Protocol Adapter

> A step-by-step walkthrough using the **FastLane shMONAD staking adapter** as a real example.

This guide assumes you've read [Protocol Onboarding](../protocol-onboarding.md) for the architecture overview. Here we focus on the hands-on workflow: from zero to a merged PR.

---

## 1. Prerequisites

- **Node.js 22+** and **pnpm 11+**
- **Foundry** (for compiled ABIs — optional, explorer ABIs work too)
- A GitHub account
- Basic familiarity with TypeScript, decorators, and viem

---

## 2. Fork, Clone, and Set Up

```bash
gh repo fork nishuzumi/moss --clone=true
cd moss
pnpm install
pnpm build          # ⚠️ Build BEFORE typecheck — cross-package types resolve through dist
```

**Verify your setup:**

```bash
pnpm lint
pnpm typecheck
pnpm test:offline
```

All three should pass before you touch anything.

---

## 3. Pick a Protocol

Choose a protocol you understand. Moss currently has open issues tagged for new adapters, or you can propose your own.

For this tutorial, we'll build **FastLane shMONAD** — a liquid staking protocol on Monad mainnet. It has two actions: `stake` (MON → shMON) and `unstake` (shMON → MON).

Before coding, gather:

| Item | Where to find it |
|------|-----------------|
| Contract address | Protocol docs or Monad explorer (verify deployed bytecode!) |
| ABI | Verified contract page on explorer, or compile from source with Foundry |
| Key functions | Read the contract source — which methods should be Capabilities? |
| Relevant events | Which events does the Receipt need to decode? |

---

## 4. Create the Package

Copy the template and rename everything:

```bash
cp -R packages/protocols/_template packages/protocols/fastlane
```

**Then:**

1. Edit `packages/protocols/fastlane/package.json`:
   - `"name"` → `"@themoss/protocol-fastlane"`
   - Update `"description"`

2. Delete template placeholders:
   ```bash
   rm packages/protocols/fastlane/src/abis/example.ts
   rm packages/protocols/fastlane/src/adapter.ts
   ```

3. Create your files:
   ```
   packages/protocols/fastlane/
   ├── src/
   │   ├── abis/fastlane.ts      ← ABI definitions
   │   ├── fastlane.ts            ← Main Protocol class
   │   ├── types.ts               ← Outcome types
   │   └── index.ts               ← Export the Protocol
   ├── test/
   │   ├── adapter.test.ts        ← Unit tests
   │   └── types.fixture.ts       ← Compile-time type fixtures
   └── README.md
   ```

---

## 5. Write the ABI

Every ABI must declare its origin. Use the header format from [ADR 0007](../adr/0007-abi-origin.md):

```typescript
// ABI origin: explorer — retrieved from Monad mainnet verified-contract page
// at 0x3a0D...abc. Retrieved 2026-07-18.

export const FastLaneAbi = [
  // Only include the function and event selectors this Protocol actually uses
  "function deposit() external payable returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) external returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function previewDeposit(uint256) view returns (uint256)",
  "function previewRedeem(uint256) view returns (uint256)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
];
```

**⚠️ Never hand-transcribe ABIs.** Always retrieve from a verified source.

---

## 6. Write the Protocol Class

### 6.1 The `@Protocol` decorator

```typescript
import { Protocol } from "@themoss/core";
import { FastLaneAbi } from "./abis/fastlane.js";

export const SHMONAD_ADDRESS = "0x..." as const; // from canonical source

@Protocol({
  name: "fastlane",
  category: "staking",
  description: "Stake MON for shMONAD (liquid staking) and redeem anytime.",
  contracts: {
    shmonad: { abi: FastLaneAbi, addr: SHMONAD_ADDRESS },
  },
})
export class FastLane {
  declare shmonad: Handle<typeof FastLaneAbi>;
}
```

### 6.2 Define parameters

```typescript
import { z } from "zod";
import { PositiveDecimalString } from "@themoss/core";

const stakeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Amount of MON to stake (in decimal MON, e.g. '1.5').",
  },
} satisfies ParamsSpec;

const unstakeParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Amount of shMON to redeem.",
  },
} satisfies ParamsSpec;
```

### 6.3 Write Capabilities

```typescript
@Capability<FastLane, typeof stakeParams>({
  intent: "Stake {amount} MON into FastLane shMONAD",
  verb: "stake",
  params: stakeParams,
  receipt: "stakeReceipt",
  risk: ["fundOut"],
})
async stake(params: InferParams<typeof stakeParams>) {
  const wei = parseEther(params.amount);
  return [this.shmonad.deposit([], { value: wei })];
}
```

**⚠️ Pitfall:** If your Capability needs the caller's address (common for `redeem(receiver, owner)` patterns), declare `ctx: ActionCtx` as the second parameter:

```typescript
async unstake(params: InferParams<typeof unstakeParams>, ctx: ActionCtx) {
  const shares = parseEther(params.shares);
  return [this.shmonad.redeem([shares, ctx.account, ctx.account])];
}
```

Without `ctx: ActionCtx`, you'll get `Address "" is invalid` errors because the caller address defaults to empty.

### 6.4 Write Queries (read-only)

```typescript
@Query({ intent: "Preview how many shMON you get for a given MON amount", params: stakeParams })
async previewStake(params: InferParams<typeof stakeParams>) {
  return await this.shmonad.read.previewDeposit([parseEther(params.amount)]);
}

@Query({ intent: "Get the current shMON / MON exchange rate" })
async exchangeRate() {
  const totalAssets = await this.shmonad.read.totalAssets([]);
  const totalSupply = await this.shmonad.read.totalSupply([]);
  return { totalAssets, totalSupply };
}
```

### 6.5 Write Receipts

```typescript
import { Receipt, type ReceiptResult, type Change } from "@themoss/core";
import { decodeEventLog } from "viem";
import { FastLaneAbi } from "./abis/fastlane.js";

type StakeOutcome = { kind: "stake"; assets: bigint; shares: bigint };

@Receipt()
stakeReceipt(changes: readonly Change[]): ReceiptResult<StakeOutcome> {
  const depositEvent = changes.find(
    (c) => c.type === "event" && c.topics[0] === "0x..." // Deposit event topic
  );
  if (!depositEvent || depositEvent.type !== "event") {
    return { kind: "receipt", outcome: null, text: "No Deposit event found", changes: [] };
  }
  const decoded = decodeEventLog({ abi: FastLaneAbi, data: depositEvent.data, topics: depositEvent.topics });
  return {
    kind: "receipt",
    outcome: { kind: "stake", assets: decoded.args.assets, shares: decoded.args.shares },
    text: `Staked ${decoded.args.assets} MON → ${decoded.args.shares} shMON`,
    changes: [depositEvent],
  };
}
```

---

## 7. Write Tests

### Compile-time type fixtures (`test/types.fixture.ts`)

```typescript
import { FastLane } from "../src/fastlane.js";

// ✅ Valid usage should compile
() => {
  const p: FastLane = null!;
  // @ts-expect-error — params must match the declared schema
  p.stake({ amount: 123 }); // number, not string
};
```

### Unit tests (`test/adapter.test.ts`)

Cover at minimum:
- Each Capability builds exactly one transaction
- Receipt correctly parses ordered Changes
- Receipt handles missing/wrong events gracefully

---

## 8. Verify Before Submitting

Always run from the **monorepo root**, not inside your package:

```bash
pnpm lint          # Code style
pnpm build         # Compile all packages
pnpm typecheck     # Type-check (MUST come after build!)
pnpm test:offline  # Skip live Monad tests when offline
```

**⚠️ Common mistakes:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Type errors about other packages | Forgot to run `pnpm build` first | Always `build` before `typecheck` |
| `Address "" is invalid` | Missing `ctx: ActionCtx` parameter | Add `ctx: ActionCtx` to your Capability |
| Live test timeout | No Monad RPC access | Use `pnpm test:offline` |
| Template leftovers fail lint/build | Didn't delete `example.ts` / `adapter.ts` | Remove all `CHANGEME` markers and template files |

---

## 9. Add a Changeset and Submit

```bash
pnpm changeset
# Follow prompts: select @themoss/protocol-fastlane → minor → describe the change

git checkout -b feat/fastlane
git add -A
git commit -m "feat(protocols): add FastLane shMONAD staking adapter"
git push origin feat/fastlane

gh pr create --repo nishuzumi/moss --head gitgdut:feat/fastlane \
  --title "feat(protocols): add FastLane shMONAD staking adapter" \
  --body "Closes #12

  ## What
  Adds @themoss/protocol-fastlane: liquid staking for MON → shMONAD on Monad mainnet.

  ## Capabilities
  - \`stake\`: Deposit MON, receive shMONAD
  - \`unstake\`: Redeem shMONAD for MON

  ## Queries
  - \`previewStake\`: Preview deposit output
  - \`previewUnstake\`: Preview redemption output
  - \`balanceOf\`: shMONAD balance
  - \`exchangeRate\`: Current shMON/MON rate

  ## Verification
  - [x] pnpm lint
  - [x] pnpm build
  - [x] pnpm typecheck
  - [x] pnpm test:offline (6/6 passing)
  "
```

---

## 10. What Happens Next

After you submit:

1. **CI checks run** — lint, build, typecheck, tests. Fix any failures.
2. **Maintainer reviews** — They may request changes. Address them promptly.
3. **Merge** — Once approved, your adapter is part of Moss! 🎉

---

## Bonus: What Not to Do

- ❌ Skip `pnpm build` before `pnpm typecheck` (cross-package types won't resolve)
- ❌ Hand-write ABIs (always from a verified source)
- ❌ Leave template files in your package
- ❌ Forget the changeset
- ❌ Run tests/typecheck from within your package (always from root)
- ❌ Use `@ts-ignore` instead of `@ts-expect-error` in type fixtures
