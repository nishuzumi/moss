# Getting started — from zero to a verified swap

**English** | [中文](./getting-started.zh-CN.md)

This tutorial runs Moss first, then rebuilds the flow one stage at a time. You will finish by configuring MCP and starting a Protocol package.

The examples read live Monad mainnet state. They need no private key or funded account because Moss builds and simulates unsigned transactions only.

## 0. Set up the repository

Requires Node 22 or newer and pnpm 11.

```bash
git clone https://github.com/nishuzumi/moss
cd moss
pnpm install
pnpm build
```

Prove the toolchain without making RPC calls:

```bash
MOSS_SKIP_E2E=1 pnpm test
```

Build must run before typecheck because workspace packages resolve generated declarations from `dist`.

## 1. Run the complete flow

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

This example discovers WMON, loads its parameter contract, builds a wrap Capability, simulates it, and prints the ordered Receipt.

The important final check is not a success sentence. It is the combination of zero Warnings and a structured Receipt Outcome that matches the request.

Run a Kuru example too:

```bash
pnpm --filter @themoss/example-simple-flow swap
```

It requests a MON/USDC quote, builds one swap Capability, and simulates it against the current Kuru market.

## 2. Assemble Moss in a scratch file

Create `examples/simple-flow/src/play.ts`:

```ts
import { NATIVE, Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";

const ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc";
const runtime = await monadRuntime({
  ...(process.env.MOSS_RPC_URL ? { rpcUrl: process.env.MOSS_RPC_URL } : {}),
});

const registry = new Registry(runtime).use(system, erc, kuru);
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});
```

Run the file after each section:

```bash
pnpm --filter @themoss/example-simple-flow exec tsx src/play.ts
```

The composition root chooses Protocol modules. Registry scans their top-level decorated exports, ignores helpers and ABIs, and recursively registers declared Protocol dependencies.

## 3. Record intent before calling tools

For this tutorial the request is:

> Swap 1 native MON into USDC on Kuru, allowing at most 0.5% slippage.

Keep the operation, input asset, output asset, amount, limit, sender, and Protocol choice. Moss cannot recover the user's words from calldata later.

The reusable constants are explicit identities: `NATIVE` for native MON and `USDC_ADDRESS` for the official USDC contract. User-supplied symbols are not token identity.

## 4. Discover operations

Append:

```ts
const candidates = registry.discover({ verb: "swap" });
console.log(candidates);
```

`discover` returns small coordinates and selection metadata. It does not return a parameter schema or build a transaction.

Try these filters:

```ts
registry.discover({ verb: "transfer" });
registry.discover({ category: "token" });
registry.discover({ protocol: "kuru" });
```

Verbs describe the user's operation, such as `swap`, `wrap`, or `approve`. Tags carry open-ended details such as `clob` or `orderbook`.

## 5. Load the calling contract

Append:

```ts
const [swap] = registry.load([{ protocol: "kuru", method: "swap" }]);
console.dir(swap, { depth: null });
```

`load` returns intent, risk labels, and each parameter's two separate descriptions:

- `type` is generated JSON Schema plus a reusable value description;
- `description` explains the field's role in this operation.

For `slippage`, the type explains basis points and the valid range. The field description explains that this value limits output reduction. A value of `50` means `0.5%`.

Always call `load` before `action`. Do not guess units, defaults, addresses, or field meaning from the parameter name.

## 6. Run a Query

Queries execute immediately and do not produce a Capability:

```ts
const quote = await registry.action("kuru", "quote", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
});

if (quote.kind !== "query") throw new Error("expected a Query result");
console.log("quote", quote.data);
```

`amountIn` is a human-readable decimal string. Alternatively, supply only `amountOut` to request a minimum output. Kuru discovers current markets, compares direct and via-MON paths, and returns human-readable quote bounds.

## 7. Build a Capability tree

Append:

```ts
const result = await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  slippage: 50,
});

if (result.kind !== "capability") throw new Error("expected a Capability");
const capability = result;
console.dir(capability, { depth: null });
```

Each Capability owns exactly one direct TransactionNode. Registry resolves its Receipt parser from the registered `protocol + method`; the serialized tree does not carry a caller-supplied Receipt name. Core rejects zero or multiple direct transactions.

An ERC-20 input swap would contain a nested ERC-20 approval Capability before the Kuru transaction. That child owns its own transaction and Receipt; execution order comes from depth-first traversal.

Capability parameters stay JSON-safe. Protocol code may use bigint while constructing calldata, but serialized chain quantities use strings or hex transaction fields.

## 8. Simulate and inspect Receipts

Append:

```ts
const simulation = await simulator.simulate(capability);
console.dir(simulation, { depth: null });

if (simulation.halted || simulation.results.some((item) => item.warnings.length > 0)) {
  throw new Error("simulation warning: stop before signing");
}

for (const item of simulation.results) {
  console.log(item.receipt?.outcome);
  console.log(item.receipt?.text);
}
```

The simulator executes transactions in depth-first order and carries state forward. Each successful transaction produces an immutable Change list containing raw Events and native MON transfers in exact execution order.

The owning Protocol parses those Changes. Core recursively checks that Receipt leaves retain the exact original Change objects, with identical length and order.

A revert, trace failure, state-chaining failure, Receipt error, or coverage mismatch produces a terminal Warning. Earlier successful Receipts remain for diagnosis; later transactions do not run.

## 9. Align structured Outcomes with intent

Zero Warnings means every observed Change was parsed. It does not mean the result matches the user's request.

For this swap, check the final structured Outcome for:

- `operation === "swap"` and `protocol === "kuru"`;
- the requested sender, `tokenIn`, and `tokenOut`;
- an `amountIn` equal to 1 MON in base units;
- a positive `amountOut`.

Also confirm the Capability preserves `slippage: 50`. The Protocol used that value to construct the transaction's on-chain minimum-output protection.

Receipt text is useful for display, but it is not evidence. Never approve a transaction only because a string contains words such as “Kuru Swap”.

## 10. Use the MCP server

After `pnpm build`, add this server to an MCP client:

```jsonc
{
  "mcpServers": {
    "moss": {
      "command": "node",
      "args": ["<path-to-moss>/packages/mcp-server/dist/cli.js"],
      "env": { "MOSS_RPC_URL": "https://rpc.monad.xyz" }
    }
  }
}
```

The Agent receives the same four stages as tools: `discover`, `load`, `action`, and `simulate`. MCP `simulate` returns each transaction's ordered Receipt leaf texts and Warnings; full Receipt evidence remains available through the library API. A write must pass through simulate after the final action result.

Read [MCP tool contracts](./mcp-tools.md) for wire shapes and [Agent safety rules](./agent-skill.md) for the mandatory halt and intent-alignment rules.

## 11. Start a Protocol package

Copy the compiling template:

```bash
cp -R packages/protocols/_template packages/protocols/myprotocol
```

Then work in this order:

1. rename the package and replace every `CHANGEME` marker;
2. add source-backed ABIs and verified fixed addresses;
3. declare `@Protocol`, typed Handles, and Protocol dependencies;
4. define Zod parameter contracts, Capabilities, Queries, and pure Receipts;
5. add positive and negative type fixtures, failure tests, and one live happy path;
6. export the Protocol and add it to the application composition root.

Follow [Protocol onboarding](./protocol-onboarding.md) for the complete development and review checklist.

## 12. Where to go next

- [Protocol template](../packages/protocols/_template)
- [Kuru Protocol](../packages/protocols/kuru/src/kuru.ts)
- [WMON Protocol](../packages/system/src/wmon.ts)
- [Agent/signer example](../examples/agent-swap/README.md)
- [Security model](../SECURITY.md)
- [Architecture decisions](./adr/)
