# 新 Moss 框架入门

下面的架构已经确认，但源码包与示例仍在迁移中。本指南只说明新契约，不再展示已经废弃的可运行代码。

## 1. 从用户意图开始

用用户自己的语言记录 verb、资产、限制、接收方和协议约束。Moss 不会从交易反推用户意图；Agent 必须保留它，用于最后比较。

## 2. discover 与 load

先用 `discover` 找到候选 Capability 与 Query，再用 `load` 读取调用契约。

每个参数都有可复用的值类型描述和单独的字段用途描述。例如，basis-points 类型只解释 `1 bps = 0.01%` 与数值范围；具体字段描述再说明它在当前 swap 中限制滑点。

Token 输入只能是显式 EVM 地址或 `native`。Moss 不解析用户提供的 symbol。

## 3. action

Query 直接返回数据；写操作返回一棵根 Capability tree。

树中每个 Capability 拥有一笔直接的未签名交易和一个指定的 Receipt parser。如果 swap 需要 ERC approve，approve 是一个嵌套 ERC Capability，拥有自己的交易和 Receipt，而不是一笔无归属的附加交易。

core 负责验证整棵树。Agent 和 MCP server 都不能重建或重排它。

## 4. simulate

模拟器按深度优先顺序执行交易，并把每笔交易产生的状态传给下一笔。每个成功交易都会生成一个严格按执行顺序排列的 Change 数组，其中包含全部原始 Event 与 native MON transfer。

所属 Protocol 把这些不可变 Change 解析为结构化 Receipt。它可以把连续区间交给另一个 Protocol 的纯 Receipt parser，但不能读取实时链状态，也不能把 Capability 参数当作答案。

只有当 Receipt 叶子保留了每个原始 Change 对象、恰好一次且顺序一致时，core 才接受结果。

## 5. 任何 Warning 都停止

交易回滚、无法证明 Change 顺序、解析失败、缺少 Outcome 或覆盖不完整都会终止流程。之前成功交易的 Receipt 可以用于诊断，但后续交易不会执行，任何交易都不能交给签名方。

## 6. 用 Outcome 对齐用户意图

读取结构化 Outcome，而不是只看 parser 写出的文本。把真实资产、数量、接收方、授权和协议语义与用户原话比较。无 Warning 只能证明观察到的行为被完整解析；只有 Agent 能判断这些行为是否满足用户要求。

## 7. 理解边界

- Moss v1 只接受 Monad 主网；Runtime 启动时验证 RPC chain ID 为 `143`。
- Protocol 包是受信任的可执行代码，必须有来源、review、类型 fixture 与真实链测试。
- 模拟只反映一个状态快照；钱包复核与链上保护仍然不可缺少。
- Moss 永不签名、永不发送。

继续阅读 [MCP 工具契约](./mcp-tools.md)、[Protocol 接入指南](./protocol-onboarding.md) 与 [Agent 安全规则](./agent-skill.md)。
