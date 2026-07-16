# Moss Protocol package template

Copy this package when starting a Protocol integration, then replace every `CHANGEME` marker.

## Usage

```bash
cp -R packages/protocols/_template packages/protocols/myprotocol
cd packages/protocols/myprotocol
pnpm install
```

Set `package.json` name to `@themoss/protocol-myprotocol`. Keep `private: true` while developing; remove it only when the package is ready to publish.

Run checks from the repository root so workspace dependencies are built in order:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test:offline
```

For a caller-selected deployment, keep Protocol binding separate from method parameters and export a typed factory alias:

```ts
const bindingParams = {
  vault: { type: Address, description: "Vault contract used by this Protocol instance." },
} satisfies ParamsSpec;

@Protocol({
  name: "example",
  category: "token",
  description: "CHANGEME",
  contracts: {},
  binding: {
    params: bindingParams,
    contracts: ({ vault }) => ({ vault: { abi: ExampleVaultAbi, addr: vault } }),
  },
})
export class ExampleProtocol {
  declare vault: Handle<typeof ExampleVaultAbi>;
}

export const ExampleFactory = protocolFactory(ExampleProtocol, bindingParams);
```

Declare `ExampleFactory` in a consumer's `protocols` map and type the injected field as `ProtocolFactory<typeof ExampleFactory>`. Use `create(binding)` for bound Capabilities and Queries, and `receipts` for pure parsers.

## Checklist

- [ ] Rename the package and replace all placeholder Protocol metadata.
- [ ] Put every ABI in `src/abis/` with a compiled, explorer, or vendored origin header. Vendored output must be the full upstream artifact.
- [ ] Record a canonical source for every fixed address and add bytecode and metadata checks.
- [ ] Export public `@Protocol` classes directly from `src/index.ts`; do not add a separate registration object or import side effect.
- [ ] Declare Protocol dependencies explicitly and use injected typed references for cross-Protocol Capabilities and Queries.
- [ ] For caller-selected deployments, declare a synchronous binding schema, derive dynamic Handles, export a `protocolFactory` alias, and consume its separate `create(binding)` and `receipts` surfaces.
- [ ] Define each Capability and Query field as `{ type, description }` with a context-free Zod value contract and field-specific purpose.
- [ ] Give every Capability exactly one direct TransactionNode and one typed Receipt parser. Put additional transactions in nested Capabilities.
- [ ] Make every Receipt parser pure and preserve exact Change object identity, length, and order.
- [ ] Add positive and `@ts-expect-error` negative compile-time fixtures.
- [ ] Add unit tests for metadata, tree validation, Receipt coverage, and failure cases.
- [ ] Add a live Monad-mainnet happy-path simulation with zero Warnings.
- [ ] Export only stable Protocols from the package entry point; experimental classes stay internal.

Read [Protocol onboarding](../../../docs/protocol-onboarding.md), [CONTEXT.md](../../../CONTEXT.md), and the current ADRs before writing source.
