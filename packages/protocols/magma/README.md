# Protocol package template

The starting point for every new Moss protocol adapter. This template is a
real workspace package that CI builds and tests, so it can never rot — if you
copied it, it compiled.

## Usage

```bash
cp -r packages/protocols/_template packages/protocols/<yourprotocol>
cd packages/protocols/<yourprotocol>
```

Then work through this checklist:

- [ ] `package.json`: set `name` to `@themoss/protocol-<yourprotocol>`, fix
      `description`, and **delete the `"private": true` line**.
- [ ] `src/abis/`: replace `example.ts` with your contract ABIs. Every file
      needs an **ABI origin header** — `compiled` (from contract source, add
      a foundry setup + `gen:abis` script like `packages/erc`), `explorer`
      (verified-contract ABI with the explorer URL), or `vendored` (SDK/npm
      source with version + how you verified behavior on-chain). See ADR 0007.
- [ ] `src/adapter.ts`: rename and implement your protocol. Read the comments
      in this file and in `packages/system/src/wmon.ts` (the reference
      adapter); a real-world example with reads-before-build is
      `packages/protocols/kuru`.
- [ ] `src/tokens.ts`: list tokens your protocol introduces (receipt tokens,
      LP tokens, LSTs) — leave empty otherwise. Every entry needs on-chain
      verification noted in a comment.
- [ ] `src/index.ts`: export your manifest; rename `templateManifest`.
- [ ] `@Event` receipts: writes with a meaningful on-chain receipt declare it
      (`depositReceipt` here is the skeleton) and gate on it via `confirms` —
      see ADR 0008 and the onboarding guide's "Declare on-chain receipts".
- [ ] `test/`: keep the offline shape tests, add a live e2e that simulates
      your happy path against Monad mainnet with **zero warnings** (free —
      nothing is signed or sent). Wire the observer and assert your receipt
      renders. Chain plans if your flow needs tokens the test account lacks
      (see the Kuru round-trip test).
- [ ] List in the served catalog: add your package to `packages/mcp-server`
      (dependency + your manifest in the `use()` array in `server.ts`).
- [ ] `pnpm install && pnpm -r build && pnpm lint && pnpm -r typecheck && pnpm -r test`

Full guide: [docs/protocol-onboarding.md](../../../docs/protocol-onboarding.md).
Definition of Done: [CONTRIBUTING.md](../../../CONTRIBUTING.md).
