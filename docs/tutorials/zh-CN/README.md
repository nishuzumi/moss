# Moss 新手教程

这套教程面向第一次接触 Moss、Monad 或 Agent 链上交互的开发者。完成后，你将能够运行 Moss、理解它的安全边界、提交第一个 Pull Request、接入一个 Protocol，并搭建一个不接触私钥的 AI Agent Demo。

> [!WARNING]
> Moss 是未经审计的 Alpha 软件。它只构建和模拟未签名交易，**永不签名、永不发送**。任何 Warning 都必须停止，不能把交易交给签名方。

## 推荐学习顺序

| 顺序 | 教程 | 你会学到什么 |
| --- | --- | --- |
| 1 | [Moss 项目环境配置指南](./05-environment-setup.md) | 安装 Node.js、pnpm，克隆、构建并检查项目 |
| 2 | [Moss 入门指南](./01-getting-started.md) | 理解并运行 `discover → load → action → simulate` |
| 3 | [AI Agent Demo 搭建教程](./04-ai-agent-demo.md) | 通过 MCP 使用 Moss，并在本地 fork 上体验签名边界 |
| 4 | [第一次提交 Pull Request 教程](./02-first-pull-request.md) | 从分支、验证、提交到发起 PR 的完整流程 |
| 5 | [Moss 协议接入实践](./03-protocol-integration.md) | 从官方模板开发 Protocol、Capability、Query 和 Receipt |
| 6 | [常见问题（FAQ）](./06-faq.md) | 快速排查环境、RPC、模拟、贡献和安全问题 |

## 先记住四条规则

1. 写操作必须完整执行 `discover → load → action → simulate`。
2. 不猜方法名、参数单位或 token 身份；以 `load` 返回的契约为准。
3. 不修改、重排或手工重建 `action` 返回的 Capability tree。
4. 出现任意 Warning 就停止；零 Warning 后仍要把有序 Receipt 与用户原始意图逐项对齐。

## 适合哪些读者

- 想快速运行 Moss 示例的 Web3 初学者；
- 想让 AI Agent 安全构建 Monad 交易的应用开发者；
- 想为 Moss 增加文档、示例或 Protocol adapter 的贡献者；
- 想了解 Capability tree、模拟证据和 Receipt 验证模型的 TypeScript 开发者。

建议具备基础命令行、Git 和 TypeScript 阅读能力。不要求准备真实私钥，也不要求账户持有 MON。

## 权威参考

- [中文 README](../../../README.zh-CN.md)
- [MCP 工具契约](../../mcp-tools.md)
- [Protocol 接入指南](../../protocol-onboarding.md)
- [Agent 安全规则](../../agent-skill.md)
- [安全模型](../../../SECURITY.md)
- [领域词汇](../../../CONTEXT.md)
