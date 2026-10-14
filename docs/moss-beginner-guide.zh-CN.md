# Moss 小白指南

## 1. Moss 解决什么问题

AI Agent（人工智能代理）可以理解用户的自然语言需求，但不同链上协议使用不同的合约、参数和结果格式。Moss 在 Agent 与协议之间提供统一接口，把已经接入的链上交互组织为 `discover → load → action → simulate`（发现、加载、执行与模拟）流程。

Moss 的职责是描述可用操作、校验参数、构建未签名交易，并根据模拟产生的链上证据解释执行结果。它不是钱包，也不是自动交易服务，不负责最终授权或执行交易。

## 2. Moss v1 的适用范围

Moss v1 仅支持 Monad 主网，chain ID（链标识）为 `143`。Runtime（运行时）会检查所连接网络报告的 chain ID，并拒绝其他网络。

Moss 只能使用当前组合中已经注册的协议适配器，不能验证跨链结果，也不会为尚未接入的协议临时推测调用方式。它目前仍是未经审计的 Alpha（早期测试）软件，不应直接用于生产资金。

## 3. Protocol、Capability 和 Query

- Protocol（协议适配器）是一个自描述的适配器类。它声明协议名称、类别、参数契约、合约交互，以及如何解释自己产生的执行证据；一个 Protocol 也可以显式依赖其他 Protocol。
- Capability（写入意图）表示一次会改变链上状态的操作。每个 Capability 恰好拥有一笔直接的未签名交易和一个 Receipt parser（结果解释器）；额外交易必须属于嵌套的 Capability。
- Query（只读查询）是 Protocol 上只读取数据的方法，不产生交易。余额、授权额度、NFT 所有者和报价等只读操作都属于 Query，不是 Capability。

`action` 是 MCP（模型上下文协议）提供的工具名称，既可以执行 Query，也可以构建 Capability；它不等同于 Capability。

## 4. discover、load、action、simulate

| 阶段 | 作用 |
| --- | --- |
| `discover` | 返回匹配条件的 Capability 和 Query 坐标。坐标至少标识 `protocol`、`method` 和操作种类，并包含选择所需的摘要信息。 |
| `load` | 为选定坐标返回 intent（用途说明）、risk（风险标签）和参数契约。它不暴露 ABI（应用程序二进制接口）或合约地址。 |
| `action` | 对 Query 直接执行并返回数据；对写操作返回一棵 Capability tree（能力树），其中包含有序的 Capability 和未签名交易。 |
| `simulate` | 只接收 `action` 返回的 Capability tree，并按深度优先顺序模拟其中的交易。Query 不需要也不能进入这一阶段。 |

Agent 必须先根据用户需求从 `discover` 的结果中选择坐标，再读取 `load` 返回的完整契约。Moss 不会自动替 Agent 选择 Protocol，也不应根据猜测的方法名或参数含义跳过这些步骤。

## 5. 未签名交易、Change 和 Receipt

写操作的 `action` 结果只包含未签名交易。Moss 不会签名或发送这些交易。

模拟中的 Change（原始变化记录）只能来自成功执行，并且只能是原始 Event（事件日志）或 native MON transfer（原生 MON 转账）。每个 Change 都是不可变对象，必须按照真实执行顺序保留。回滚执行产生的信息只用于诊断，不属于 Change。

Receipt（结构化结果解释）由所属 Protocol 根据一笔成功交易的有序 Changes 生成。Receipt 为每个 Change 添加协议语义和可读文本，但不能改写底层证据。Core（核心层）会递归检查 Receipt 是否保留完全相同的 Change 对象，并要求数量相等、顺序一致且完整覆盖。

任何遗漏、重复、替换或重排都会产生终止性 Warning（警告），并停止后续模拟。MCP 的 `simulate` 响应只投影通过验证的有序 Receipt 文本和 Warning；它会省略原始 Changes、完整 Receipt 结构和 gas（执行消耗估算）。

## 6. Moss 可以验证什么，又不能保证什么

在一次模拟所使用的链上状态快照中，Moss 可以检查交易是否回滚、成功执行产生了哪些 Changes，以及 Receipt 是否完整并按原顺序解释了这些证据。出现任何 Warning 时，流程必须停止，不能把交易交给签名方。

这些检查不代表 Moss 能够“保证用户资产安全”。模拟只是链上状态的快照，不能保证稍后提交交易时仍有相同价格、授权、余额或执行结果。协议升级、链上状态变化和已注册 Protocol 软件包本身的可信度仍属于明确的信任边界。

Agent 必须把 MCP 返回的每条有序 Receipt 文本与用户的原始意图逐项核对，包括操作、资产、数量、接收方、限制、授权和 Protocol 选择。零 Warning 只说明证据覆盖检查通过，不代表结果必然符合用户意图。

Moss 不签名、不发送交易、不保存任何密钥或助记词，也不能代替钱包审核。钱包或其他签名方仍须独立展示并核对最终交易。MCP 不返回 gas，因此不能声称模拟响应提供了 gas 估算。

## 7. 下一步

- [中文新手上路](./getting-started.zh-CN.md)：安装、运行示例和开发 Protocol 包。
- [MCP 工具契约](./mcp-tools.md)：四个工具的输入、输出和 Warning 规则。
- [领域语言](../CONTEXT.md)：Moss 的正式术语和架构定义。
- [安全模型](../SECURITY.md)：验证模型、信任边界和明确限制。
