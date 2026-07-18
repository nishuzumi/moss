# 常见问题（FAQ）

[English](./faq.md) | **中文**

本页整理中文社区新人最常问的问题。如果你的问题不在这里，欢迎在 [Issues](https://github.com/nishuzumi/moss/issues) 提出。

## Moss 是什么？

Moss 是一个把 Monad 链上协议交互封装成 **AI Agent 可调用的 Capability（能力）** 的框架。Agent 通过 `discover → load → action → simulate` 四个步骤发现协议、加载操作、构建交易并模拟验证，全程不需要自己理解每个协议的 ABI 或 calldata。

## Moss 会动我的钱吗？

**不会。** Moss 只构建和验证**未签名交易**，永不签名、永不发送。真正发送交易的是你独立的钱包（或 MCP 客户端在确认 Receipt 后交给你签名）。Moss 的定位是"翻译 + 预演 + 验证"的中间层，不持有任何私钥。

## Moss 和钱包是什么关系？

Moss 不替代钱包。它负责把"用户意图"翻译成"可验证的未签名交易"，并产出结构化的 Receipt 证据。签名和广播由钱包层完成。这样 Agent 可以频繁操作协议，但资金控制权始终在用户手里。

## 现在支持哪些协议？

当前支持 Monad 主网（chain ID `143`）：

- **WMON**：`wrap`、`unwrap`
- **ERC-20 / native MON**：`transfer`、`approve`
- **ERC-721**：`transfer`
- **Kuru**（DEX）：`swap`

更多协议（如 Morpho、Uniswap V4、Wallet adapter）正在 PR 中。你可以参考 [protocol-onboarding.md](./protocol-onboarding.md) 自己贡献一个新协议包。

## 怎么把 Moss 接进我的 AI Agent？

Moss 提供了 MCP server，暴露 `discover`、`load`、`action`、`simulate` 四个工具。把它加进任意 MCP 客户端即可：

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

详见 [mcp-tools.md](./mcp-tools.md)。

## 模拟（simulate）的意义是什么？

模拟会记录交易执行过程中的所有 Event 和原生 MON 转账，按执行顺序产出**有序的 Change** 和结构化 **Receipt**。Agent（或 SDK 消费者）可以拿着这份证据核对"这笔交易到底干了什么"，确认无误后再交给钱包签名。这是 Moss 安全模型的核心：先验证、后签名。

## 为什么需要 Receipt 验证？

Receipt 的叶子必须完整、按顺序覆盖每一笔 Change。任何回滚、trace 失败、Receipt 解析失败或覆盖不匹配，都会触发 terminal Warning，库会拒绝继续。这保证了 Agent 看到的描述和链上实际发生的事完全一致，杜绝"描述与执行不符"的风险。

## 我需要付费或有余额的账户吗？

不需要。Moss 的示例读取 Monad 主网的真实状态用于模拟，但不需要私钥或 funded 账户，因为 Moss 只模拟不发送。

## 这是生产可用的吗？

**不是。** Moss 是未经审计的 alpha 软件，请勿用于生产资金。它目前适合学习、原型验证和开发者探索。

## 我想贡献代码或文档，怎么开始？

1. Fork 仓库，本地 `pnpm install && pnpm build` 跑通
2. 读 [getting-started.zh-CN.md](./getting-started.zh-CN.md) 理解完整流程
3. 想接新协议？看 [protocol-onboarding.md](./protocol-onboarding.md)
4. 提交 PR 或 Issue，Maintainer 会 review
