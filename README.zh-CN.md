# Moss

[English](./README.md) | **中文**

> 中文文档可能滞后于英文版；以英文版为准。

Moss 把 [Monad](https://monad.xyz) 上复杂的 DApp/协议交互抽象为 Agent 可调用的统一能力 —— `discover → load → action → simulate` —— 由系统而不是 Agent 负责组装正确的交易。

- **Agent 不再手搓 calldata。** 不碰 ABI、合约地址、multicall 扫尾、decimals 换算 —— 能力接受人类可读的参数，返回组装完毕的未签名交易。
- **每笔写操作在触达签名方之前都被验证。** Plan 精确声明允许移动的资产（`expects`）；模拟在真实链上状态回放它，任何未声明的差异都会告警。
- **Moss 永不签名、永不发送。** 它只构建和验证。私钥留在钱包里，最终决定权留在用户手里。

> [!WARNING]
> **Moss 是 Alpha 测试版软件，仅供测试与评估。** 未经安全审计；API、Plan 格式、包结构都可能随时变动，不作兼容承诺。
>
> 使用前请理解风险模型：模拟是一道安全网，不是保证——模拟结果反映的是模拟那一刻的链上状态，从模拟到签名之间，价格、流动性、合约状态都可能变化。Moss 永不签名、永不发送交易，但**你**签出去的每一笔都由你自己负责：签名前务必在钱包里逐笔核对交易内容，测试期间只用小额资金，零警告的模拟结果绝不等于执行结果的承诺。本软件按"现状"提供，不含任何形式的担保（[MIT](./LICENSE)）。安全边界与漏洞报告渠道见 [SECURITY.md](./SECURITY.md)。

## 核心调用流

```
discover(verb?, category?)   → 跨协议发现能力
load(coordinates)            → intent、参数语义、风险标签
action(protocol, method,     → Query：直接返回数据
       account, params)      → Capability：返回未签名交易 Plan + 量化期望
simulate(plans[])            → 实际 effects + warnings（声明 vs 实际的对账）
```

两条安全规则，分别在两处强制执行：

1. **Effects 对账**（服务器侧，机械判定）：模拟提取实际发生的一切 —— 资产流出/流入、授权、收款方，包括不发 Transfer 事件的原生 MON 流和 wrapped 代币铸毁 —— 任何 Plan 未声明的差异都产生 warning。有 warning 即停。
2. **意图对齐**（Agent 侧）：把 effects 摘要和用户的原话对比。只有 Agent 拿着用户的原始意图。

`simulate` 接受 Plan 数组并在计划之间延续状态 —— Plan B 可以花掉只在 Plan A 模拟结果里才存在的代币。这是多步流程（claim → swap → supply）的地基。

## 当前状态

Alpha。Monad 主网（chain id 143）。已支持协议：WMON（wrap/unwrap/balanceOf）、erc20 通用协议（任意代币转账/余额/授权查询，含原生 MON）、erc721 通用协议（任意 NFT 转账/归属查询）、Kuru（市价单 swap、报价、市场列表）。

设计上暂不支持：Permit 类签名流、跨链桥、闪电贷原子组合。详见 [SECURITY.md](./SECURITY.md)。

## 快速开始

需要 Node ≥ 22 与 pnpm。以下全部**零资金、零私钥**可跑 —— 模拟是免费的。

```bash
git clone https://github.com/nishuzumi/moss && cd moss
pnpm install
pnpm build

# 标准调用流：discover → load → action → simulate
pnpm --filter @mossxyz/example-simple-flow wrap

# 跨 Plan 组合（真实订单簿）：MON → USDC → MON
pnpm --filter @mossxyz/example-simple-flow swap
```

想看一笔交易真正落链？[examples/agent-swap](./examples/agent-swap) 用一个 Claude Code 子 agent 走完 MCP 工具全流程，并在模拟零警告之后才签名发送——执行在**本地 anvil fork 的 Monad 主网**上：真实订单簿状态、零真实资金、零配置。

新手建议从[新手上路指南](./docs/getting-started.zh-CN.md)开始：先整体跑一遍，再逐层拆开 discover / load / action / simulate / observations，最后引导你写自己的适配器。MCP 接入与库用法的完整示例见英文 [README](./README.md)。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [新手上路指南](./docs/getting-started.zh-CN.md)（[English](./docs/getting-started.md)） | 逐层拆解整个系统：先跑通，再打开每个阶段 |
| [MCP 工具参考](./docs/mcp-tools.md)（英文） | 四个工具的契约、Plan 结构、warning 码表 |
| [协议接入指南](./docs/protocol-onboarding.md)（英文） | 从 ABI 到回执，编写并提交一个适配器 |
| [Agent 使用守则](./docs/agent-skill.md)（英文） | Agent 必须遵守的规则：强制模拟、见警告即停、意图对齐 |
| [Agent 实盘示例](./examples/agent-swap/README.md)（英文） | Claude Code 子 agent 在本地 Monad 主网 fork 上真实成交 |
| [设计决策记录 ADR](./docs/adr/)（英文） | 每个架构决定及其取舍 |
| [词汇表](./CONTEXT.md)（英文） | 项目统一语言 |

## 参与贡献

从参考实现 [`packages/system/src/wmon.ts`](./packages/system/src/wmon.ts) 复制起步（注释密度拉满），按照 [docs/protocol-onboarding.md](./docs/protocol-onboarding.md) 完成接入；流程规范见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

[MIT](./LICENSE)
