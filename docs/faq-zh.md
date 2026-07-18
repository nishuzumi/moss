# Moss 中文新手 FAQ

本文面向第一次接触 Moss 的中文开发者，整理安装环境、模拟流程、安全边界和 Protocol 开发中的常见问题。

> Moss 目前是未经审计的 Alpha 软件，请勿将其用于生产资金。具体行为和最新要求请以仓库中的 README 与官方文档为准。

## 1. Moss 是什么？

Moss 是一个面向 AI Agent 的链上交互框架。

它将 Monad 上的协议操作封装为 Agent 可以发现和调用的 Query 与 Capability，并通过模拟结果帮助 Agent 和用户在签名前检查交易结果。

Moss 的主要工作流是：

```text
discover → load → action → simulate
```

- `discover`：查找当前可用的 Query 或 Capability。
- `load`：读取操作说明、参数要求和风险信息。
- `action`：执行读取操作，或者构建未签名交易。
- `simulate`：在签名前模拟写操作，并返回 Receipt、Outcome 和 Warning。

## 2. 运行 Moss 需要哪些环境？

本地运行 Moss 需要：

- Node.js 22 或更高版本；
- pnpm 11；
- Git；
- 基础的命令行操作能力。

安装依赖并构建项目：

```bash
pnpm install
pnpm build
```

提交贡献前，建议运行：

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

离线测试可以使用：

```bash
pnpm test:offline
```

## 3. 没有真实资金可以体验 Moss 吗？

可以。

Moss 的示例只构建并模拟未签名交易。运行官方示例时，不需要提供私钥，也不需要使用有余额的钱包账户。

部分示例需要连接 Monad RPC，以读取当前链上状态，但不会自动签名或发送交易。

例如，可以运行：

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

或者：

```bash
pnpm --filter @themoss/example-simple-flow swap
```

## 4. Moss 当前支持哪些区块链？

Moss 当前主要支持 Monad 主网，Chain ID 为 `143`。

网络和 Protocol 支持范围可能随着项目更新而变化，请查看最新的 README 和 `packages/protocols` 目录。

## 5. “Moss never signs and never sends”是什么意思？

这表示 Moss 只负责：

1. 发现和加载协议操作；
2. 构建未签名交易；
3. 模拟交易；
4. 返回 Receipt、Outcome 和 Warning 等结构化结果。

Moss不会：

- 保存用户私钥；
- 代表用户签名；
- 自动将交易发送到链上。

签名和发送应由独立的钱包或上层应用完成。这样，用户可以先检查模拟结果，再决定是否签名。

## 6. 模拟成功是否代表交易一定安全？

不一定。

模拟成功只表示交易在模拟时使用的链上状态下可以执行，并产生了可解析的结果。

用户或 Agent 仍然需要检查：

- 模拟结果是否符合用户的原始意图；
- 输入和输出资产是否正确；
- 资产数量是否合理；
- 是否存在异常授权；
- 是否出现 Warning；
- 链上状态是否已经发生变化。

价格、流动性、余额和区块状态可能变化，因此模拟成功不能保证交易之后一定能够在链上成功执行。

## 7. 出现 Warning 时应该怎么办？

看到任何 Warning 时，都应该停止后续签名和发送流程，并检查 Warning 的原因。

常见检查方向包括：

- 交易是否发生回滚；
- Receipt 是否解析失败；
- Receipt 是否完整覆盖了所有 Change；
- 实际资产变化是否符合用户意图；
- 参数、地址或 Protocol 状态是否异常。

在 Warning 得到解释和解决之前，不应忽略 Warning 并继续签名交易。

## 8. Query 和 Capability 有什么区别？

可以简单理解为：

- `Query`：读取链上信息，不创建需要用户签名的交易。
- `Capability`：描述一个链上写操作，并生成可以被模拟的未签名交易结构。

例如，读取余额通常属于 Query，而转账、授权、Wrap 或 Swap 通常属于 Capability。

## 9. Moss 与其他 AI Agent 框架有什么区别？

Moss 强调的是清晰的交易安全边界：

```text
先发现操作
→ 再读取参数和风险
→ 构建未签名交易
→ 强制模拟
→ 检查结果
→ 最后才可能交给钱包签名
```

Moss 不把私钥管理、交易签名和交易发送放在框架内部，而是让这些操作保持独立。

这意味着模拟结果是签名前的重要检查证据，但 Agent 和用户仍需判断结果是否符合原始意图。

## 10. 如何添加新的 Protocol？

准备添加新的 Protocol 时，建议先阅读：

- [Protocol 接入指南](./protocol-onboarding.md)
- [`packages/protocols/_template`](../packages/protocols/_template)

通常需要完成：

1. 定义 Protocol；
2. 定义 Query 或 Capability；
3. 声明参数和依赖；
4. 构建交易节点；
5. 编写 Receipt parser；
6. 添加测试和示例；
7. 验证模拟结果和 Receipt coverage。

Protocol 开发应遵循仓库当前的 `CONTRIBUTING.md`、`CONTEXT.md` 和相关 ADR。

## 11. 从哪里开始学习 Moss？

建议按以下顺序阅读：

1. [中文 README](../README.zh-CN.md)
2. [中文新手上路](./getting-started.zh-CN.md)
3. [MCP 工具契约](./mcp-tools.md)
4. [Agent 安全规则](./agent-skill.md)
5. [Protocol 接入指南](./protocol-onboarding.md)

遇到文档无法解决的问题时，可以先搜索已有 Issues 和 Pull Requests，避免提交重复的问题或贡献。