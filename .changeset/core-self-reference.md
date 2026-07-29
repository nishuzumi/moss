---
"@themoss/core": minor
---

Inject a typed `self` reference (`SelfRef<T, Methods>`) into every Protocol so a Protocol nests its own Capabilities through Registry's builder, with the same parameter validation, node stamping and Receipt resolution as a declared dependency call. `self` carries Capabilities only, it is a reserved injected name that rejects a conflicting contract key, dependency key or initialized field, and it throws when reached from a Query or a Receipt parser. Registry admits each nested build against the `CAPABILITY_TREE_LIMITS` depth and Capability count budget before the nested Protocol method runs.
