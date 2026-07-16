# Protocol adapters use standard decorators with runtime-injected, ABI-generic Handles

Protocol adapters are authored as classes with TC39 stage-3 decorators (`@Protocol`, `@Capability`, `@Query`) — not a builder API, not a codegen pipeline. The `@Protocol` decorator injects fixed contract Handles and may derive dynamic Handles synchronously from a validated Protocol binding; `declare pool: Handle<typeof PoolAbi>` is a type-only declaration whose method signatures are inferred from the const ABI via abitype/viem. There is no custom compiler step.

## Considered Options

- **Builder API (`defineProtocol({...})`)** — more idiomatic in the 2026 TS ecosystem and gives inference for free, but abandons the class/decorator authoring UX the project was designed around.
- **Codegen** — perfect typing from ABIs, but adds a compile toolchain that every contributor must understand and we must maintain.
- **Decorators with bare (untyped) `Handle`** — rejected: `this.pool.supply(...)` degrades to `any`, so contributor mistakes surface at simulate time instead of in the IDE, undermining Moss's own safety story.

## Consequences

- Handles MUST be declared with their ABI type parameter (`Handle<typeof PoolAbi>`), otherwise calls are untyped. The ABI is referenced twice (in `@Protocol` config and in the erased `declare` type), so TypeScript cannot prove they agree at runtime. Compile-time Handle fixtures and Protocol tests must cover valid and invalid method calls; `@Protocol` injects the union of keys declared by fixed `contracts` and returned by `binding.contracts`.
- A parameterized Protocol exports `protocolFactory(ProtocolClass, bindingParams)`. The schema reference is intentionally repeated: a class decorator cannot change the static type of its class expression, while the explicit alias preserves the exact schema-derived binding type and supplies a runtime dependency marker without requiring a consumer cast, callable wrapper, or custom compiler.
- Requires TS 5.2+ standard decorators. `experimentalDecorators` / reflect-metadata is explicitly off the table.
- Decorator metadata is attached as symbol-keyed **marker properties** on the class and its method functions, not via `context.metadata`: `Symbol.metadata` lowering is still uneven across transpilers (esbuild, oxc), while marker properties compile identically everywhere. The registry discovers methods by walking the prototype chain for markers.
- Toolchain constraint (verified 2026-07-06): Node's V8 does not parse stage-3 decorator syntax natively, and oxc (vite 8 / vitest 4) does not lower it — so build/run/test pipelines must transform through the esbuild family (tsup, tsx, vitest 3). Revisit when oxc ships stage-3 decorator lowering.
- A Handle has three unsigned faces: `handle.fn(...)` encodes a TransactionNode locally, `handle.read.fn(...)` calls a view/pure function, and `handle.call.fn(...)` previews a write function through `eth_call` for Capability/Query construction such as orderbook quoting. Receipt parsers cannot use any RPC face; signing and sending remain outside both Handle and Moss.
