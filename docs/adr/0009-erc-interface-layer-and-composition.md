# erc is an interface layer; protocols compose via ABIs and steps, never via protocol instances

The `@themoss/erc` package looked, at a glance, like a "token package". It is
not. It is the **interface layer**: everything in it is a standard *interface*
— never an *instance*. Two kinds of exports, zero hardcoded addresses:

1. **Compiled standard ABIs** — `ERC20Abi`, `ERC721Abi`, `ERC1155Abi`,
   `WETH9Abi` (from the corresponding Solidity interfaces via forge + wagmi,
   ADR 0007). Pure data describing the
   interface; the currency that `contracts:` declarations and `createHandle`
   consume.
2. **Address-free generic adapters** — the `ERC20`, `ERC721`, and `ERC1155` protocol
   classes (`contracts: {}`): capabilities whose contract address is
   *naturally a call-time parameter* (erc20's `token` accepts a well-known
   symbol, an explicit 0x address, or `native`, with unknown addresses
   resolving metadata via `RegistryOptions.tokenFallback`; erc721 and
   erc1155 take `collection` as an explicit address — NFT collections are not table
   material, the catalog is fungible-only).

Where an address goes decides the layer: call-time parameter → generic
adapter in erc; canonical instance data → system or a protocol package.

## Decision

- **Standards with one canonical deployment get instance adapters above erc.**
  WETH9 is an interface (erc exports its ABI); WMON is Monad instance data, so
  the `WMON` adapter class lives in system with the hardcoded address,
  reusing `WETH9Abi`. A generic address-parametrized `weth9` adapter was
  rejected: `wrap 1 MON` must not ask the agent for a wrapper address, and an
  open `wrapper` parameter is an invitation to wrap into a fake WMON.
- **Cross-protocol composition passes exactly two currencies:**
  - **ABI + address → Handle** (static via `contracts:` declaration, dynamic
    via `createHandle`) when a protocol needs to *talk to* a standard
    contract — e.g. a fixed-token transfer step uses
    `contracts: { wmon: { abi: ERC20Abi, addr } }`, an address discovered at
    runtime (factory → pool) becomes `createHandle(PoolAbi, addr, client)`.
  - **Step builders** — plain functions returning a `TxStep` (+ expects
    fragment), e.g. erc's `approveStep(token, spender, amount)` — when a
    protocol needs to *reuse plan-building logic*.
- **Protocol classes are consumed only by `registry.use(manifest)`.**
  Injecting a protocol instance into another protocol was considered and
  rejected: everything that makes a protocol a protocol — discover entry,
  load stub (intent/params/risk), @Event observation wiring — only lives
  through registry assembly. Passed as a value, a protocol degenerates into
  exactly a Handle. Worse, its capabilities return complete Plans, and Plans
  are terminal, non-composable artifacts (whose slug? whose intent? whose
  planHash?) — composition belongs one level down, at `TxStep` + flows.

## Considered and deferred

**Manifest-time instantiation of interface protocols** —
`instantiate(Erc4626Protocol, { name: "some-vault", addr })` assembling an
address-bearing protocol from a generic one *before* `registry.use`, so the
instance is discoverable and observable like any hand-written adapter. This
is the right shape for standards with many instances (ERC-4626 vaults: same
interface, hundreds of addresses). Deferred until such a protocol actually
lands; today's only candidate (WETH9 → WMON) has one instance and a
hand-written adapter is simpler.

## Naming

Interface data carries the `Abi` suffix with standards-cased acronyms:
`ERC20Abi`, `ERC721Abi`, `ERC1155Abi`, `WETH9Abi`. Adapter classes take the bare name of what they
adapt: `ERC20` (the generic standard adapter), `WMON` (the instance adapter).
The suffix is load-bearing: at a use site, `abi: ERC20Abi` reads as interface
data, `protocols: [ERC20]` reads as a registrable protocol. wagmi's generated
artifacts keep their mechanical names (`ierc20Abi` — generated files are
never hand-edited, ADR 0007); the public names are aliases at the package
boundary (`index.ts`).

## Consequences

- Adding a standard to erc means: compiled ABI always; a generic adapter only
  if the address is naturally a call-time parameter.
- A protocol package that needs another protocol's *contract* declares the
  ABI + address itself; needing another protocol's *logic* means asking erc
  (or that package) to export a step builder. Neither imports the other's
  adapter class.
- Addresses in protocol packages always come from the system table
  (`knownTokenAddress`) or the package's own vetted catalog — never re-typed.
