# 常见问题（FAQ）

## Moss 会签名或发送交易吗？

不会。Moss 只构建和模拟未签名交易。私钥、签名和广播必须位于 Moss 之外的独立钱包边界。

## 当前支持哪些网络？

只支持 Monad 主网，chain ID `143`。Runtime 会拒绝其他 chain ID。`examples/agent-swap` 使用的本地 fork 也必须报告 `143`。

## 运行示例需要账户余额或私钥吗？

不需要。普通示例只模拟交易，默认使用占位账户。模拟器会为 sender 设置 balance override，以回答“交易会做什么”，而不是“账户付不付得起”。

## 项目为什么没有 `.env`？

仓库默认不要求 `.env`。可以在 shell 中设置 `MOSS_RPC_URL`，或在 MCP client 配置的 `env` 中设置。不要把私钥放入 `.env`；Moss 根本不需要私钥。

## Node.js 和 pnpm 用什么版本？

Node.js 22 或更高，pnpm 11；根目录固定 `pnpm@11.10.0`。推荐通过 Corepack 启用仓库指定版本。详见[环境配置指南](./05-environment-setup.md)。

## 为什么 typecheck 前必须先 build？

workspace package 会通过已构建的 `dist/*.d.ts` 解析彼此类型。如果直接 typecheck，可能因为依赖 package 的声明文件尚未生成而失败。

## 如何运行离线测试？

```bash
MOSS_SKIP_E2E=1 pnpm test
```

它跳过访问 Monad 主网的 E2E。正式 Protocol PR 仍需要运行主网 happy path 并提供零 Warning 证据。

## 为什么自定义 RPC 无法模拟？

Moss 需要 `debug_traceCall`、call/log evidence、`prestateTracer` state diff 和 state override，并要求能够证明 Change 的精确顺序。有些免费 RPC 会屏蔽 `debug` namespace。优先使用默认的 `https://rpc.monad.xyz`，详见 [ADR 0002](../../adr/0002-simulation-via-debug-tracecall.md)。

## `eth_call` 成功，为什么 Moss 仍然失败？

`eth_call` 只返回函数结果，不能提供完整 logs、call tree、状态差异和多交易串联证据。Moss 宁愿失败，也不会退化为近似模拟。

## Warning 可以忽略吗？

不可以。回滚、trace 失败、Change 顺序不可用、Receipt 失败、coverage mismatch 或状态串联失败都必须停止。不能隐藏 Warning 或继续交给签名方。

## 零 Warning 就代表可以安全签名吗？

不代表。零 Warning 说明观察到的 Change 已被完整、有序地解析。Agent 或用户仍要把 sender、recipient、资产、数量、授权、滑点、Protocol 和全部 Receipt 与原始意图对齐。钱包还要独立审查。

## 可以修改 action 返回的 Capability tree 吗？

不可以。不能手改、重排、删除或重建 tree。如果任何参数变化，重新调用 `action`，然后重新 `simulate`。

## 为什么不能只使用 token symbol？

symbol 不是唯一身份，可能重复或被恶意 token 冒用。跨 MCP 的 token 必须使用明确 EVM address 或 `native`。官方常量可以来自受信任的应用上下文，例如 `@themoss/system`。

## discover、load、action、simulate 能跳过其中一步吗？

写操作不能跳过。先 discover 真实候选，再 load 完整参数契约，action 构建最终 Capability，simulate 验证最终 tree。Query 由 action 直接返回数据，不需要 simulate。

## Capability 和 Transaction 有什么区别？

Capability 表示用户语义操作，包含 metadata、params、Receipt parser 和 children；TransactionNode 只是其中的一笔未签名交易。每个 Capability 恰好拥有一笔直接 TransactionNode，其他交易属于嵌套 Capability。

## Receipt text 和 Outcome 哪个更可靠？

SDK 中 structured Outcome 是程序检查的权威结果，text 主要用于展示。MCP 为了缩小 Agent 接口，只暴露经过完整 coverage 验证的 ordered Receipt texts 和 Warnings。

## 如何接入一个新 Protocol？

从 `packages/protocols/_template` 复制，不要手工创建骨架。然后完成 ABI/地址来源、typed Handle、参数契约、Capability/Query、纯 Receipt、类型 fixture、单元测试和主网 happy path。详见[协议接入实践](./03-protocol-integration.md)。

## ABI 可以手写吗？

不可以。必须使用 ADR 0007 定义的 compiled、explorer 或 vendored 来源，并记录 provenance。ABI 决定 calldata 和资金流，是安全关键工件。

## 为什么 Receipt 不能查询 RPC？

Receipt 必须是对当前交易实际 Change 的纯解释。读取外部状态会让结果依赖模拟之外的信息，也可能用“计划发生的事实”掩盖缺失证据。

## 什么改动需要 changeset？

用户可见 package 的发布行为发生变化时需要 `pnpm changeset`。纯内部文档、CI 或不发布示例通常不需要；具体以 [CONTRIBUTING.md](../../../CONTRIBUTING.md) 和维护者 review 为准。

## MCP client 找不到 Moss server 怎么办？

依次检查：

1. 是否已经运行 `pnpm build`；
2. `packages/mcp-server/dist/cli.js` 是否存在；
3. MCP 配置是否使用绝对路径；
4. JSON/JSONC 格式是否正确；
5. 修改配置后是否重启 client；
6. 启动 client 的用户是否有权读取仓库；
7. Node.js 是否为 22+。

## Kuru quote 和 swap 为什么可能不一致？

quote 是建议性结果。构建 Capability 时 Kuru 会重新发现、验证和报价，避免旧报价或被操纵的 market/path 进入请求。实际限制由最终 Capability 中重新计算的链上保护决定。

## 可以把普通 Foundry Anvil 用于 Agent swap Demo 吗？

不推荐。该示例要求 Monad build 的 gas model、opcode pricing、precompile 和 tracing 行为。请执行 `foundryup --network monad`。

## Moss 可以直接用于生产资金吗？

当前不可以。项目 README 明确标记它是未经审计的 Alpha 软件。即使未来完成审计，也仍需独立钱包审查、严格的限额、监控和应用侧安全控制。

## 发现安全漏洞应该去哪里报告？

按照 [SECURITY.md](../../../SECURITY.md) 使用 GitHub Private Vulnerability Reporting。不要在公开 Issue、讨论或 PR 中披露漏洞细节。

## 还有哪些权威资料？

- [MCP 工具契约](../../mcp-tools.md)
- [Agent 安全规则](../../agent-skill.md)
- [Protocol onboarding](../../protocol-onboarding.md)
- [安全模型](../../../SECURITY.md)
- [架构决策](../../adr/)
- [Moss 领域词汇](../../../CONTEXT.md)
