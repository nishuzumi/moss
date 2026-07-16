# Moss 入门指南

本章通过仓库现有示例理解 Moss 的核心流程和安全模型。开始前请先完成[项目环境配置](./05-environment-setup.md)。

## 1. Moss 解决什么问题

AI Agent 很容易生成“看起来合理”的 calldata，却难以证明交易真正做了什么。Moss 把协议交互封装为自描述的 Capability，并在签名前模拟交易、提取真实 Change、交给 Protocol 解析成 Receipt。

Moss 的边界非常明确：

- 构建未签名交易；
- 模拟 Capability tree；
- 验证 Receipt 是否完整、按顺序覆盖观察到的 Change；
- 不管理私钥；
- 不签名；
- 不发送交易。

## 2. 四阶段工作流

```text
用户意图
   ↓
discover → load → action → simulate
   ↓          ↓          ↓
候选操作   调用契约   Capability tree
                         ↓
                  Warning + Receipt
```

### discover：发现操作

根据统一的 verb、category 或 Protocol 名称搜索 Capability 和 Query。例如 `swap` 是用户视角的 verb，`clob`、`orderbook` 等细节属于 tag。

### load：加载调用契约

读取操作意图、风险标签和参数契约。每个参数同时包含：

- `type`：JSON Schema、格式、范围、单位和示例；
- `description`：这个字段在当前操作中的具体用途。

不能根据字段名猜单位。例如 swap 的 `slippage: 50` 表示 50 basis points，也就是 `0.5%`。

### action：查询或构建交易

Query 会立即返回 JSON-safe 数据；写操作会返回一棵 Capability tree。每个 Capability 恰好拥有一笔直接 TransactionNode 和一个 Receipt parser，额外交易属于嵌套 Capability。

### simulate：模拟并验证

模拟器按深度优先顺序执行交易并传递状态，提取按真实顺序排列的 Event 和 native transfer。Protocol 将这些 Change 解析成结构化 Receipt，core 再检查所有原始 Change 是否被完整、按顺序、以相同对象保留。

## 3. 运行 WMON 入门示例

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

源码位于 `examples/simple-flow/src/wmon-wrap.ts`。它完成：

```ts
const candidates = registry.discover({ verb: "wrap" });
const [operation] = registry.load([{ protocol: "wmon", method: "wrap" }]);
const capability = await registry.action("wmon", "wrap", ACCOUNT, { amount: "1.5" });
const outcome = await simulator.simulate(capability);
```

示例中的 `ACCOUNT` 只是模拟发送方。Moss 会为模拟提供必要的 sender balance override，因此这个地址不需要真实余额。

输出检查重点：

1. `action` 返回 `kind: "capability"`；
2. 模拟没有 `halted`；
3. 每个 result 的 `warnings` 都为空；
4. Receipt 描述的是预期 WMON wrap，而不是其他资产或操作。

## 4. 运行 Kuru swap 示例

```bash
pnpm --filter @themoss/example-simple-flow swap
```

该示例先执行 Kuru quote Query，再构建 MON → USDC swap Capability：

```ts
const quote = await registry.action("kuru", "quote", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
});

const capability = await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  slippage: 50,
});
```

Kuru 会动态发现候选市场、在链上验证市场、比较直连与经 MON 路径，并在构建 Capability 时重新报价。Agent 不能指定 market address 或注入旧 quote。

## 5. 核心术语

| 术语 | 含义 |
| --- | --- |
| Protocol | 某协议的自描述适配器，拥有 ABI、地址、Capability、Query 和 Receipt 语义 |
| Capability | 一个用户写操作；拥有一笔直接未签名交易、一个 Receipt parser 和可选嵌套 Capability |
| Query | 只读操作，直接返回 JSON-safe 数据，不生成 Capability |
| TransactionNode | `from`、`to`、`data`、`value` 组成的未签名交易 |
| Change | 模拟观察到的原始 Event 或 native MON transfer |
| Receipt | Protocol 对一笔成功交易的完整、有序语义解释 |
| Outcome | Receipt 中适合程序检查的结构化结果 |
| Warning | 回滚、trace、Receipt 或 Change coverage 等失败；出现即停止 |

## 6. 正确处理 Warning

下面任一情况都不能继续到签名方：

- 交易回滚；
- RPC 无法提供 trace 或精确 Change 顺序；
- Receipt parser 失败；
- Receipt 遗漏、复制、替换或重排 Change；
- 多交易状态无法继续串联。

推荐检查：

```ts
if (outcome.halted || outcome.results.some(({ warnings }) => warnings.length > 0)) {
  throw new Error("simulation warning: stop before signing");
}
```

不要隐藏 Warning，也不要不改变条件反复重试，希望它自己消失。

## 7. 零 Warning 之后仍要对齐意图

干净模拟证明“观察到的 Change 已被完整解释”，不等于“交易符合用户要求”。仍需逐项比较：

- 操作和 Protocol；
- sender 与 recipient；
- token 的明确地址或 `native`；
- 输入、输出和授权数量；
- 滑点、价格边界和其他限制；
- 嵌套 approve 等附加动作；
- Receipt 的顺序。

如果参数发生变化，重新调用 `action` 和 `simulate`。不能修改旧 Capability tree。

## 8. 通过 library 组装 Moss

最小 composition root 与仓库示例一致：

```ts
import { Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime } from "@themoss/system";

const runtime = await monadRuntime();
const registry = new Registry(runtime).use(system, erc, kuru);
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});
```

`Registry.use(...)` 选择应用支持的 Protocol module，并递归注入声明的 Protocol 依赖。

## 9. 下一步

- 想让 Agent 调用：阅读 [AI Agent Demo 搭建教程](./04-ai-agent-demo.md)；
- 想参与项目：阅读 [第一次提交 Pull Request 教程](./02-first-pull-request.md)；
- 想支持新协议：阅读 [Moss 协议接入实践](./03-protocol-integration.md)；
- 遇到问题：查看 [FAQ](./06-faq.md)。
