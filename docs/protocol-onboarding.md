# Protocol onboarding

One Protocol package owns its ABIs, Capabilities, Queries, declared Protocol dependencies, and Receipt parsers.

## 0. Start from the template

Copy the workspace package instead of creating build and test configuration by hand:

```bash
cp -R packages/protocols/_template packages/protocols/myprotocol
pnpm install
```

Rename the package to `@themoss/protocol-myprotocol`, remove `"private": true` when it is ready to publish, and replace every `CHANGEME` marker.

Keep the template tests running while you replace the example. The package remains part of the workspace, so normal root build, typecheck, lint, and test commands exercise it.

## 1. Establish ABI and address provenance

Every ABI under `src/abis/` declares one origin:

- `compiled`: generated from committed contract source;
- `explorer`: retrieved from a verified-contract page with URL and date;
- `vendored`: generated deterministically from committed full upstream artifacts with package version and tarball digest.

Follow [ADR 0007](./adr/0007-abi-origin.md). Never hand-transcribe an ABI or generate a hand-selected function subset.

Every fixed address cites a canonical source and has an on-chain bytecode check. Fixed token constants additionally verify expected metadata. Dynamic pools and tokens come from chain state and do not become global constants.

## 2. Export a self-describing Protocol

A package exports its public `@Protocol` classes directly from its entry point. Registry registers either one class or every top-level Protocol export in a selected module namespace; ABIs and helpers are ignored.

```ts
@Protocol({
  name: "myprotocol",
  category: "dex",
  description: "One sentence an Agent can use to choose this Protocol.",
  contracts: {
    router: { abi: RouterAbi, addr: ROUTER_ADDRESS },
  },
  protocols: {
    erc20: ERC20,
  },
})
export class MyProtocol {
  declare router: Handle<typeof RouterAbi>;
  declare erc20: ProtocolRef<ERC20>;
}
```

Protocol dependencies are explicit. Registry recursively registers them and injects typed references. Calling an injected Capability creates a nested Capability node; calling an injected Query returns data directly.

### Parameterized Protocols

Use a Protocol binding when the same implementation must target caller-selected deployments. Binding describes deployment identity, not one method call, and must derive Handles synchronously:

```ts
const marketBinding = {
  market: {
    type: Address,
    description: "Market contract used by this Protocol instance.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "market",
  category: "dex",
  description: "A caller-selected market deployment.",
  contracts: {},
  binding: {
    params: marketBinding,
    contracts: ({ market }) => ({ market: { abi: MarketAbi, addr: market } }),
  },
})
export class MarketProtocol {
  declare market: Handle<typeof MarketAbi>;
}

export const MarketFactory = protocolFactory(MarketProtocol, marketBinding);
```

The explicit schema argument is deliberate: TypeScript decorators cannot change the class's static type, so the alias is the smallest safe way to retain the inferred binding type and attach the runtime dependency marker.

A consumer declares the alias as its dependency and receives an uncached factory:

```ts
@Protocol({
  name: "consumer",
  category: "dex",
  description: "Composes caller-selected markets.",
  contracts: {},
  protocols: { market: MarketFactory },
})
class ConsumerProtocol {
  declare market: ProtocolFactory<typeof MarketFactory>;

  async example(binding: InferParams<typeof marketBinding>) {
    const market = this.market.create(binding);
    // market exposes bound Capabilities and Queries.
    // this.market.receipts exposes only pure Receipt parsers.
  }
}
```

`create(binding)` never caches instances. Registry validates the binding before Protocol code or RPC runs. Receipt references need no binding because parsers receive only Changes.

## 3. Define parameter contracts

Each field pairs a reusable Zod value contract with a description of that field's role.

```ts
const swapParams = {
  user: {
    type: Address,
    description: "Account whose assets the swap may spend.",
  },
  tokenIn: {
    type: TokenReference,
    description: "Token provided to the swap.",
  },
  tokenOut: {
    type: TokenReference,
    description: "Token requested from the swap.",
  },
  amountIn: {
    type: PositiveDecimalString,
    description: "Amount of tokenIn to spend.",
  },
  slippageBps: {
    type: BasisPoints.default(50),
    description: "Maximum allowed slippage for this swap.",
  },
} satisfies ParamsSpec;

type SwapParams = InferParams<typeof swapParams>;
```

`BasisPoints` describes only the value: an integer basis-point count, `1 bps = 0.01%`, valid range, and examples. It does not mention swaps or slippage. The field description supplies that purpose. A default of `50` means `0.5%`.

Registry parses action input with the composed schemas. `load` returns JSON-safe generated schemas and both descriptions; for a parameterized Protocol it returns `binding` beside method `params`. The library passes binding as the fifth `Registry.action` argument, and every resulting CapabilityNode retains it separately from method parameters. Zod objects never cross a transport boundary.

## 4. Author one transaction per Capability

Every Capability owns exactly one direct transaction and one registered Receipt parser. More transactions require nested Capabilities. The serialized Capability tree carries `protocol + method`; Registry resolves the Receipt name from the registered Capability metadata.

```ts
@Capability<MyProtocol, typeof swapParams>({
  intent: "Swap {amountIn} of {tokenIn} into {tokenOut}",
  verb: "swap",
  params: swapParams,
  receipt: "swapReceipt",
  risk: ["fundOut", "approval", "priceImpact"],
})
async swap(params: SwapParams) {
  const approval = await this.erc20.approve({
    token: params.tokenIn,
    spender: this.router.address,
    amount: amountInBaseUnits.toString(),
  });
  const transaction = this.router.swap(/* protocol arguments */);
  return [approval, transaction];
}
```

Here `approval` is a nested ERC Capability with its own direct transaction and Receipt. `transaction` is the one direct TransactionNode owned by `swap`. A contract-level multicall is still one transaction.

The authoring method may use local bigint or viem helpers while constructing calldata. Values stored in the serializable Capability tree use JSON-safe forms such as decimal strings.

## 5. Parse actual Changes with a Receipt

```ts
@Receipt()
swapReceipt(changes: readonly Change[]): Receipt<SwapOutcome> {
  // Decode, loop, branch, and delegate as required by this Protocol.
  // Every ReceiptChange must retain the exact input Change object.
  return buildSwapReceipt(changes);
}
```

A Receipt parser receives only the immutable ordered Changes for one successful direct transaction. It cannot receive Capability parameters or transaction data and cannot call Runtime, Handle, Query, or RPC.

It may call another Protocol's pure Receipt parser for a continuous Change interval and embed the returned Receipt.

Parsing strategy belongs to the Protocol: ordinary loops, queues, and branches are allowed. Core provides no grammar engine or semantic matcher.

Core only flattens ReceiptChange leaves and checks exact object identity, length, and order against the input.

Receipt text is presentation. The structured Outcome is authoritative and must use JSON-safe values.

## 6. Export and compose

The package entry point exports the Protocol class. A parameterized Protocol also exports its factory alias:

```ts
export { MyProtocol } from "./my-protocol.js";
export { MarketFactory, MarketProtocol } from "./market.js";
```

The application composition root imports selected module namespaces and supplies them with one Runtime to the generic MCP server. Adding a Protocol does not modify core, simulator, or generic transport code.

Fixed official Monad constants may be imported from `@themoss/system`. Caller-supplied and chain-discovered token addresses remain explicit; do not introduce a package-level token list.

## 7. Tests required for review

- A compile-time fixture proves valid inferred parameter and Receipt names, plus invalid cases marked with `@ts-expect-error`. Parameterized Protocols also prove binding inference, bound-reference method types, and the separation between bound methods and Receipt references.
- Unit tests cover Registry metadata validation and the Capability's exactly-one-direct-transaction invariant.
- Receipt tests prove complete ordered coverage using the original Change object references, including nested Receipts.
- Failure tests cover missing, duplicated, replaced, and reordered Changes.
- Live Monad-mainnet tests verify fixed addresses and run the happy path with zero Warnings.

Run `pnpm build`, then `pnpm typecheck`, lint, and tests before review.

## 8. Document and submit

Document what the Protocol does, supported contracts or markets, parameter units, defaults, important risks, fixed-address sources, and known limitations.

Export the stable `@Protocol` class from the package entry point. Experimental classes remain internal. Add the package module to the selected application's composition root; generic core and simulator code do not change.

Add a changeset for a user-facing package release:

```bash
pnpm changeset
```

Open the pull request from a branch based on `main`. Include the live simulation evidence and explain any framework or package-boundary impact. Use the checklist in [CONTRIBUTING.md](../CONTRIBUTING.md).
