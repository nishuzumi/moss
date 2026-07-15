# Moss

[English](./README.md) | **中文**

Moss 把 Monad 上复杂的协议交互变成协议自己维护、Agent 可调用的 Capability，统一流程为 `discover → load → action → simulate`。Moss 只构建和验证未签名交易，永不签名、永不发送。

> [!WARNING]
> Moss 仍是未经审计的 Alpha 软件。本文描述的架构已经确认，但 TypeScript 包与可运行示例还在迁移中；当前分支不能作为生产版本使用。

## 框架契约

- `discover` 按协议坐标和用户语义发现 Capability 与 Query。
- `load` 返回 intent、risk 和 JSON-safe 参数契约；可复用的值类型描述与字段用途描述彼此分离。
- `action` 执行 Query，或为写操作返回一棵根 Capability tree。
- `simulate` 在 Monad 状态上执行这棵树，并为成功交易返回已经验证的 Receipt。

每个 Capability 恰好拥有一笔直接的未签名交易和一个带类型的 Receipt parser。更多交易只能来自嵌套 Capability，因此 core 可以验证整棵树，并按确定的深度优先顺序展开。

模拟器按真实执行顺序记录所有成功的原始 Event 与 native MON transfer。所属 Protocol 把这些不可变 Change 解析成结构化 Receipt；只有当原始 Change 对象按相同顺序被完整且仅覆盖一次时，core 才接受结果。交易回滚、解析失败、缺少 Outcome、Change 重排或漏掉 Change 都会产生 Warning，任何 Warning 都会停止流程。

Receipt 的文本只负责展示。Agent 必须用结构化 Outcome 对照用户原话，确认一致后才能交给签名方。

## Protocol 组合

Protocol 包的注册面是其顶层导出的自描述 `@Protocol` class；它仍可导出 ABI 和 helper，但 Registry 会忽略。这里没有额外注册清单、token 目录或 import 副作用。组合根选择模块 namespace；Registry 扫描其中顶层 Protocol 导出，递归注册声明的依赖并注入带类型实例。

跨 Protocol 写操作调用注入的 Capability，并形成嵌套 Capability 节点；跨 Protocol Query 直接执行。固定 Monad 常量位于 `@themoss/system`，动态 token 与 pool 地址从链上状态获取。Capability 输入只接受显式 token 地址或 `native`，不接受 symbol。

Moss v1 只支持 Monad 主网。Runtime 接受 RPC 地址，启动时验证其 chain ID 必须为 `143`；Protocol metadata、地址常量和 Capability 节点不重复保存链 ID。

## 包边界

| Package | 职责 |
| --- | --- |
| `@themoss/core` | 装饰器、Registry、框架类型、Capability tree 与 Receipt 验证 |
| `@themoss/simulator` | `debug_traceCall`、状态串联、有序 Change 提取与 Receipt 调度 |
| `@themoss/erc` | 无地址标准 ABI、ERC Protocol 与 ERC Receipt 语义 |
| `@themoss/system` | Monad Runtime、验证过的官方常量和 Monad 系统 Protocol |
| `@themoss/protocol-*` | 协议 ABI、Capability、Query、依赖与 Receipt |
| `@themoss/mcp-server` | MCP 传输和应用组合 |

新增 Protocol 只修改它自己的包与显式组合根，不修改 core、simulator 或通用 MCP server。

## 开发

需要 Node 22+ 与 pnpm 11。

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

目标契约先于源码迁移完成，因此这里不再宣传旧的可运行示例。

## 文档

- [新手上路](./docs/getting-started.zh-CN.md)（[English](./docs/getting-started.md)）
- [MCP 工具契约](./docs/mcp-tools.md)
- [Protocol 接入指南](./docs/protocol-onboarding.md)
- [Agent 安全规则](./docs/agent-skill.md)
- [架构决策](./docs/adr/)
- [领域词汇](./CONTEXT.md)
- [安全模型](./SECURITY.md)

## 参与贡献

修改导出契约前先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 和当前 ADR。新增 Protocol 从 [`packages/protocols/_template`](./packages/protocols/_template) 开始。

## License

[MIT](./LICENSE)
