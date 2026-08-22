# Moss 入门指南 — 理解你的第一笔 AI Agent 交易

这篇指南面向第一次接触 Moss、也还不熟悉 AI Agent 或 Web3 概念的读者。[新手上路](./getting-started.zh-CN.md)教程会带你跑通一次真实的 swap，本文只负责在那之前把概念讲清楚：Moss 到底解决什么问题，以及它用到的每个词具体指什么。

读完本文后,建议直接进入[新手上路](./getting-started.zh-CN.md),把这里的概念和真实代码对上。

## 1. 普通 AI Agent 和使用 Moss 的 Agent 有什么区别

一个普通的 AI Agent（比如聊天机器人接入的工具调用能力）如果要执行链上操作,通常只能做两件事之一:

- 直接拼装原始 calldata,自己编码 ABI、自己算金额、自己猜合约地址;
- 或者依赖一个黑盒脚本,把"用户说了什么"和"链上实际执行了什么"完全分离开。

这两种方式都意味着 Agent 没有办法在交易发送前,拿到一份"这笔交易到底会做什么"的、可核对的结构化证据。它只能相信自己拼的 calldata 是对的。

使用 Moss 的 Agent 不同。它调用的是 discover、load、action、simulate 四个阶段的工具,每个阶段返回的都是结构化数据,而不是原始 calldata。Agent 从头到尾都不接触 ABI 或 multicall 的拼装细节——这些由 Moss 内部完成。Agent 唯一需要做的,是把每个阶段返回的结果和用户原始的意图做比对。

## 2. 为什么普通 Agent 不能安全地和链上协议交互

链上交易一旦发送就不可撤销。普通 Agent 面临的核心问题是:它没有办法在发送前,证明"这笔即将发送的交易,确实会产生用户想要的效果"。

即使 Agent read 了合约文档、猜对了函数签名、算对了金额,依然存在几类它没法自证的风险:

- 用错了 token 地址(比如把某个 symbol 误认成了官方合约);
- 滑点、授权额度等参数被理解错;
- 合约实际执行路径和 Agent 以为的不一致(比如中间经过了一次代理转发)。

Moss 的做法是:交易在发送前必须先被模拟(simulate),模拟产生的证据只能来自链上真实执行的结果,不能是 Agent 自己"以为"的结果。这份证据就是 Receipt。

## 3. Monad、Protocol、Capability 是什么

- **Monad**:Moss v1 只面向 Monad 主网。Runtime 在初始化时会校验 RPC 报告的链 ID 是 `143`,这不是一个可配置项。
- **Protocol**:一个"适配器"类,负责把某个链上协议(可能横跨多个合约)翻译成 Moss 能理解的 Capability 和 Query。比如 Kuru DEX、WMON 包装合约,分别对应一个 Protocol。
- **Capability**:Protocol 暴露的一次"写"意图,比如"在 Kuru 上完成一次 swap"。一个 Capability 恰好拥有一笔直接的未签名交易,以及一个用来解析这笔交易执行结果的 Receipt parser。如果一次操作需要多笔交易(比如 swap 前先 approve),那笔 approve 会作为嵌套在外层 Capability 下面的另一个 Capability 出现,而不是被塞进同一笔交易里。

这三者的关系是:Monad 是执行环境,Protocol 是协议的适配层,Capability 是 Protocol 对外暴露的一次具体的"写"操作。

## 4. discover → load → action → simulate 是什么流程

这是 Agent(或者任何调用 Moss 的程序)每次执行一次链上写操作,必须依次经过的四个阶段:

1. **discover**:根据用户想做的操作(比如 verb 是 `swap`,或者 protocol 是 `kuru`)去搜索有哪些 Capability/Query 坐标可用。这一步只返回轻量的坐标信息,不会返回完整参数说明,也不会构建任何交易。
2. **load**:针对 discover 阶段选中的具体坐标,取回它的完整参数契约——每个字段的类型描述(单位、取值范围、示例)和它在这次操作里的具体用途,分开描述。`load` 必须发生在 `action` 之前;绝不能凭参数名字猜测单位或含义。
3. **action**:真正执行。如果目标是 Query,会立即返回数据(比如一次报价);如果目标是"写"操作,会返回一整棵 Capability tree,但这一步仍然只是组装,绝不签名、也绝不发送。
4. **simulate**:把 Capability tree 放到链上环境里模拟执行,返回每笔交易验证过的、按真实执行顺序排列的 Receipt 叶子文本,以及任何 Warning。任何 Warning 都会中止后续流程。

这四步不能跳过任何一步,也不能颠倒顺序——尤其是 load 必须在 action 之前,simulate 必须在最终的 action 结果之后。

## 5. 未签名交易、模拟、Receipt 和 Change 是什么

- **未签名交易(unsigned transaction)**:Moss 组装出来的交易只是数据,从未被签名,也从未被发送。这也是为什么运行 Moss 的示例不需要私钥或有余额的账户——它永远停在"模拟"这一步。
- **模拟(simulation)**:把未签名交易放进链上真实状态里试跑一遍,观察它实际会产生什么效果,而不需要真的把交易发出去。
- **Change**:模拟成功执行后,产生的一条不可变记录——要么是一个原始的链上事件(Event),要么是一次原生 MON 转账(native transfer)。Change 严格按照真实执行顺序排列。如果交易 revert 了,产生的记录只是诊断信息,不算 Change。
- **Receipt**:某个 Protocol 对一组 Change 的解释结果。它包含:产生这份解释的 Protocol 名字、一份结构化的 Outcome(比如"从谁转给谁多少 token")、用于展示的文本(text),以及按顺序排列的 Receipt 叶子(ReceiptChange)或者嵌套的子 Receipt。**结构化数据才是权威证据,text 只是它的一层展示投影**——永远不要仅仅因为 text 里出现了"Swap"这样的字样就认为交易做对了,必须核对结构化的 Outcome。

## 6. 官方的 wrap 和 swap 示例实际展示了什么

`pnpm --filter @themoss/example-simple-flow wrap` 展示的是最简单的单笔 Capability 流程:发现 WMON 这个 Protocol、加载它的参数契约、构建一个 wrap Capability、模拟执行、打印出有序的 Receipt。这里没有嵌套 Capability,只有一笔交易。

`pnpm --filter @themoss/example-simple-flow swap` 展示的是一个更完整的场景:请求一次 MON/USDC 报价(Query,立即返回,不产生交易),然后构建一个 Kuru 的 swap Capability 并模拟它。如果输入资产是 ERC-20(而不是原生 MON),这个 swap Capability 还会在实际的 Kuru 交易之前,自动包含一个嵌套的 ERC-20 approve Capability——这正好演示了"一个 Capability 可以由多笔交易组成,但每笔交易各自属于一个 Capability 节点"这条规则。

两个示例最后都会检查:模拟过程中零 Warning,并且最终的结构化 Outcome 和最初记录下来的用户意图一致。这正是第 5 节里说的"text 不是证据,结构化 Outcome 才是"的具体体现。

## 7. Moss 未来可能的应用方向

以下方向基于 discover/load/action/simulate 这套模型本身具备的能力,不代表已经实现的功能:

- 让通用 AI Agent 框架(而不只是专门写好的脚本)可以安全地接入任意已注册的链上协议,而不需要 Agent 自己理解 ABI;
- 随着更多 Protocol 包被开发(每个协议只需要实现自己的 Capability、Query 和 Receipt parser),Agent 能覆盖的协议种类会持续增加,而不需要改动 Moss 核心;
- 因为 Receipt 保留的是结构化证据而不是自然语言摘要,基于 Moss 的 Agent 更适合被审计或做自动化的"意图对齐"检查,而不只是依赖模型自己复述。

## 8. 想深入学习,可以继续读这些文档

- [新手上路](./getting-started.zh-CN.md) — 从零跑通一次真实的、可验证的 swap,并动手写代码组装 Moss。
- [MCP 工具契约](./mcp-tools.md) — discover / load / action / simulate 四个 MCP 工具的具体 wire shape。
- [Protocol 接入指南](./protocol-onboarding.md) — 如果你想自己实现一个新的 Protocol 包。
- [Agent 安全规则](./agent-skill.md) — 强制停止条件和意图对齐的具体要求。
- [安全模型](../SECURITY.md)
- [领域语言](../CONTEXT.md) — 本文用到的每个术语(Protocol、Capability、Change、Receipt……)的精确定义都在这里。
