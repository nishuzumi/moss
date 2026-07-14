# Protocol onboarding — writing a Moss adapter

One protocol = one package ([ADR 0006](./adr/0006-protocol-packages-and-manifests.md)). An adapter package turns a protocol's contracts into capabilities (writes that build Plans) and queries (reads), and exports one **manifest** for registries to assemble.

## 0. Start from the template

```bash
cp -r packages/protocols/_template packages/protocols/<yourprotocol>
```

The template is a real CI-built package — if you copied it, it compiles. Work through the checklist in its README. Reference implementations: the system WMON adapter ([`packages/system/src/wmon.ts`](../packages/system/src/wmon.ts), deliberately over-commented), a real-world adapter with reads-before-build and precision quirks ([`packages/protocols/kuru`](../packages/protocols/kuru)), and a dynamic-address protocol ([`packages/erc`](../packages/erc)).

## 1. ABIs — `src/abis/` with an origin header

Every ABI file declares exactly one **ABI origin** ([ADR 0007](./adr/0007-abi-origin.md)):

- `compiled` — from contract source in the package: foundry in `contracts/` + the @wagmi/cli foundry plugin (copy `wagmi.config.ts` and the `gen:abis` script from `packages/erc`). Monorepo rule: **no git submodules — `forge init`/`forge install` must use `--no-git`** (CI fails on any submodule). For external Solidity dependencies prefer npm packages + `remappings.txt`, then `forge soldeer`, then `forge install --no-git` (ADR 0007).
- `explorer` — from a block explorer's **verified** contract page; record URL + date.
- `vendored` — from an official SDK/repo, mechanically: upstream files verbatim in `abis-src/` + an `update:abis` script (pinned version, tarball sha256, allowlist-based generation — copy Kuru's `scripts/update-abis.ts`). Never hand-transcribe an ABI.

Keep ABIs as `parseAbi` string arrays or generated `as const` TS — both preserve abitype's inference, which is what keeps Handles fully typed. Raw JSON imports do not.

## 2. Declare the protocol

```ts
@Protocol({
  name: "myproto",                 // unique lowercase slug — the discover coordinate
  category: "lending",             // closed set: dex lending staking rewards token nft
  description: "One line an agent can understand.",
  contracts: {
    pool: { abi: PoolAbi, addr: "0x…" },   // Monad mainnet — Moss v1 is single-chain
  },
})
export class MyProto {
  declare pool: Handle<typeof PoolAbi>;   // key must match contracts key
}
```

- **Verify every address on-chain** (bytecode exists; metadata matches) and note how in a comment.
- `declare pool` is type-only; the `@Protocol` wrapper injects the Handle at construction.
- A Handle has three faces, none of which can sign or send: `handle.fn([args], { value? })` encodes calldata locally; `handle.read.fn([args])` is a view call; `handle.call.fn([args], { value?, from? })` eth_call-simulates a *write* (how orderbook quoting works).
- Protocols that operate on caller-supplied addresses use `contracts: {}` and `declare runtime: MossRuntime`, building handles per call with `createHandle` — see the generic erc20 protocol.

## 3. Write capabilities

```ts
@Capability({
  intent: "Supply {amount} of {asset}",   // {param} placeholders filled from agent input
  verb: "supply",                          // user-perspective fund semantic — closed set
  params: {
    asset: token,                          // symbols/addresses/"native", table-resolved
    amount: tokenAmount("asset"),          // scaled by asset's decimals
    slippage: slippageBps(100),            // optional with default
  },
  risk: ["fundOut", "approval"],           // danger classification (≥1 required)
  tags: ["isolated-market"],               // free-form long-tail semantics
})
async supply({ asset, amount }: { asset: TokenRef; amount: bigint }) {
  const approve = approveStep(asset, this.pool.address, amount); // from @themoss/erc
  const main = this.pool.supply([asset, amount]);
  return plan([approve, main], {
    out: [{ token: asset, amountMax: amount }],
    in:  [{ token: RECEIPT_TOKEN, amountMin: amount }],
  });
}
```

Rules that make or break review:

- **Verb ≠ function name.** The verb is what the user experiences: WMON `deposit()` → `wrap`; an LP add → `supply`; a CLOB market order → `swap` with `clob` in tags. If no verb fits, open an issue — extending the closed set is a core decision ([ADR 0003](./adr/0003-two-tier-capability-taxonomy.md)).
- **Params are human-readable.** Amounts arrive as decimal strings and are scaled by semantic types. A contextual type (`tokenAmount("asset")`) must be declared **after** the parameter it references — decoding runs in declaration order.
- **`expects` is the safety contract** ([ADR 0004](./adr/0004-quantified-expects-in-plans.md)). Declare the maximum that may leave and the minimum that must arrive. Approvals built with `approveStep` (from `@themoss/erc`) are declared automatically; never approve more than the plan spends. Simulation warns on every undeclared difference — an honest, tight `expects` is what makes your capability trustworthy.
- **Build-time reads are fine.** Capabilities are async: read the orderbook, check allowances, compute minOut — then encode. Plans must stand alone once built.
- **Methods receive `(params, ctx)`.** `ctx.account` (`ActionCtx`) is the caller — the sender of every plan transaction. Reach for it when the standard wants the caller *inside calldata* (ERC-721/1155's `safeTransferFrom(from, …)` — see the generic erc721 and erc1155 protocols); everything else ignores the second argument.
- **Cleanup steps matter.** Refund/unwrap/sweep calls belong in the same plan — a missing cleanup step is exactly the class of bug simulation catches.

## 4. Declare on-chain receipts — `@Event`

`expects`/warnings are the closed **audit plane**; `@Event` is the open **observation plane** ([ADR 0008](./adr/0008-observation-plane.md)): a protocol-authored, human-rendered statement of what happened *in protocol terms* — "Swapped 1 MON into 0.0239 USDC on Kuru (3 fills)". Declare protocol-specific write receipts here. A capability that lists `confirms: ["swapResult"]` fails simulation with a `CONFIRMATION_MISSING` warning when the receipt does not appear. Canonical standard events that the audit plane already parses and fully reconciles against quantified `expects` — ERC-20/721/1155 Transfer families — do not need a duplicate authored observation.

```ts
@Capability({ /* … */, confirms: ["swapResult"] })  // this write must produce the receipt
async swap(/* … */) { /* … */ }

/** Dealer (optional preprocessor): filter/enrich/aggregate matched events. */
countFills(events: DecodedEvent[], ctx: ObserveCtx): void {
  ctx.shared.fills = events.filter((e) => e.name === "Trade").length;
}

@Event<MyProto>({                        // the type argument is mandatory
  events: {
    router: ["KuruRouterSwap"],          // contract-handle key → ABI event names
    monUsdc: ["Trade"],                  // multiple contracts and events are fine
  },
  dealer: "countFills",                  // a method name (autocompleted) or an inline function
  intent: "Swapped {amountIn} {tokenIn} into {amountOut} {tokenOut} ({fills} fills)",
})
async swapResult(events: DecodedEvent[], ctx: ObserveCtx) {
  const swap = events.find((e) => e.name === "KuruRouterSwap");
  if (!swap) return null;                // null → no observation for this plan
  const tokenIn = await ctx.token(/* … */);  // resolve symbol/decimals via the table
  return { tokenIn: tokenIn.symbol, amountIn: tokenIn.format(/* … */), /* … */ fills: ctx.shared.fills };
}
```

How it runs: after each plan simulates, the registry decodes that plan's logs against your protocol's ABIs, passes the matches through the dealer (if any), then hands them to the handler; the returned object fills the `intent` template's `{placeholders}` — a missing placeholder throws at render time, so keep template and return shape in sync. `ctx` is injected per plan×protocol: `plan`, `account`, `token` (the token table), and `shared` (scratch space between dealer and handler). Contract keys and event names are validated against your ABIs at registration — typos fail before anything ships.

**The red line** (ADR 0008): observations only **tighten** the outcome (via `confirms`) — they can never satisfy it. No observation silences a reconciliation warning; narrate honestly and let the audit plane stay in charge. The template's `depositReceipt` and Kuru's `swapResult` are the reference implementations.

## 5. Introduce tokens (if any) — `src/tokens.ts`

If your protocol mints receipt/LP/staked tokens, list them so they become symbol-addressable for every agent:

```ts
export const TOKENS: readonly KnownToken[] = [
  { symbol: "aUSDC", name: "MyProto interest-bearing USDC", ref: "0x…", decimals: 6 },
];
```

Every entry is a security claim: verify symbol/decimals on-chain, note the source. Same-symbol collisions with other packages are rejected at registration ([ADR 0006](./adr/0006-protocol-packages-and-manifests.md)).

## 6. Export the manifest, get listed

```ts
export const myProtoManifest = defineProtocolPackage({
  name: "myproto",
  protocols: [MyProto],
  tokens: TOKENS,
});
```

To enter the official served catalog, add your package to the MCP server (`packages/mcp-server`): one dependency in its `package.json` + your manifest in the `use()` array in `server.ts`. That is the whole listing mechanism.

## 7. Test

```ts
const registry = new Registry(runtime);
registry.use(systemManifest);   // from @themoss/system: token data + wmon
registry.use(myProtoManifest);
```

1. **Offline**: discover/load shape and the built Plan's txs + expects for a known input.
2. **Live e2e** (`describe.skipIf(!!process.env.MOSS_SKIP_E2E)`): simulate the happy path against Monad mainnet asserting **zero warnings** — free, no funds, no keys. For protocol-specific receipts, wire the observer (`createTraceSimulator(runtime, { observer: registry.observer() })`) and assert the receipt renders (see Kuru's `swapResult`). Canonical ERC transfer flows instead assert the reconciled effect ids and amounts. If your flow needs tokens the account lacks, chain plans: acquire in plan 1, spend in plan 2.

## 8. Document and submit

Header comment: what the protocol is, supported markets/assets, parameter quirks, known risks (upgradeable proxies? fee-on-transfer? cooldowns?). PR per [CONTRIBUTING.md](../CONTRIBUTING.md) with evidence (test output incl. the simulate effects summary) and a changeset.

## Current limits worth knowing

- Moss v1 is single-chain (Monad mainnet); there are no chain-id parameters in the authoring surface, on purpose ([ADR 0005](./adr/0005-curated-token-catalog.md)).
- Fixed contracts are declared statically; unbounded dynamic markets need a curated in-adapter catalog validated on first use against on-chain reality (see Kuru).
- Permit/typed-data flows and cross-chain actions are out of scope ([SECURITY.md](../SECURITY.md)).
