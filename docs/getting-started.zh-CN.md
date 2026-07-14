# 新手上路 — 从零到一笔通过验证的 swap

[English](./getting-started.md) | **中文**

这份指南带你一层一层拆开 Moss：先完整跑一遍流程，再逐个打开每个阶段——
discover、load、action、simulate、observations——最后接上 agent，并引导你
写出自己的协议适配器。所有内容都在 **Monad 主网真实状态上运行，全程零资金、
零私钥**：Moss 永不签名、永不发送，模拟是免费的。

每一步结尾都有 **深入阅读** 指引。第一遍可以跳过，需要"为什么"的时候再回来。

## 0. 环境准备（5 分钟）

需要 Node ≥ 22 和 pnpm。

```bash
git clone https://github.com/nishuzumi/moss && cd moss
pnpm install
pnpm build
```

不碰网络，先自证工具链没问题：

```bash
MOSS_SKIP_E2E=1 pnpm test
```

每个包的离线测试都应该通过。（去掉这个环境变量会同时跑主网 live e2e——
免费，但需要支持 `debug_traceCall` 的 RPC；默认的 `https://rpc.monad.xyz`
支持。）

## 1. 先把整个流程跑一遍

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

你刚刚看到的是标准四步流——把 1.5 MON 包装成 WMON：

1. `discover` 找到了哪个协议能 `wrap`
2. `load` 取回了正确的调用方式
3. `action` 构建出一个 **Plan**——未签名交易 + 声明的预期
4. `simulate` 在真实链上状态回放它，并对账结果

最后一行就是整个系统存在的意义：

```
✓ No warnings — the unsigned txs may be handed to a wallet for review.
```

现在把这四步拆开。建一个草稿文件跟着敲
（`examples/simple-flow/src/play.ts`，用
`pnpm --filter @themoss/example-simple-flow exec tsx src/play.ts` 运行）：

```ts
import { Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";

const runtime = monadRuntime();
const registry = new Registry(runtime);
for (const m of [systemManifest, ercManifest, kuruManifest]) registry.use(m);
```

注意刚刚发生了什么：registry 生下来是**空的**，装什么由你决定。Moss 里
没有任何东西靠"被 import"就完成注册。

## 2. discover — 货架上有什么

```ts
console.log(registry.discover({ verb: "swap" }));
```

```jsonc
[{ "protocol": "kuru", "method": "swap", "kind": "capability",
   "verb": "swap", "category": "dex", "tags": ["clob"], "summary": "…" }]
```

这里有两套词汇在工作：

- **verb** —— 用户视角的资金动作，来自一个小的闭集（`swap`、`wrap`、
  `supply`、`transfer`……）。永远不是协议的函数名：WMON 的 `deposit()`
  对应的 verb 是 `wrap`。
- **tags** —— 自由格式的长尾语义（`clob` 告诉你这家 DEX 是订单簿，
  不是 AMM）。

试试 `discover({ verb: "transfer" })`——有三个提供者：通用 `erc20` 协议
（任意代币）、通用 `erc721` 协议（任意 NFT collection）和通用
`erc1155` 协议（任意多代币 collection）。再试试
`discover({})`，看看完整目录。

**深入阅读：** [mcp-tools.md](./mcp-tools.md#discover) · verb/category 的设计：
[ADR 0003](./adr/0003-two-tier-capability-taxonomy.md)

## 3. load — 调用契约

```ts
console.log(registry.load([{ protocol: "kuru", method: "swap" }]));
```

这个 stub 告诉调用方（人或 agent）正确调用所需的一切：intent 模板、每个
参数的语义、声明的风险标签（`fundOut`、`approval`、`priceImpact`）。

仔细读一条参数描述——比如 `amount`：*"A human-decimal amount of the token
in `tokenIn` (e.g. \"1.5\"). Do not pre-scale."* 这就是**语义类型**：你传
`"1.5"`，运行时自动解析 token 的精度并完成缩放。token 参数接受知名符号
（`"MON"`、`"USDC"`）、`0x` 地址或 `"native"`——符号只经过策展目录解析，
绝不从链上名字解析（同名假币可以伪造链上符号）。

**深入阅读：** 语义类型：`packages/core/src/semantics.ts` · 符号安全：
[ADR 0005](./adr/0005-curated-token-catalog.md)

## 4. action — 构建 Plan

```ts
const ACCOUNT = "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC"; // 任意地址——不需要私钥
const plan = await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: "MON", tokenOut: "USDC", amount: "1",
});
console.log(plan.intent, plan.expects, plan.txs);
```

**Plan** 是协议对下游所有人的契约：

- `txs` —— 未签名交易，完整编码（calldata、value）
- `expects` —— 量化的承诺：最多流出 1 MON（`out.amountMax`），至少收到
  报价数量的 USDC（`in.amountMin`），授权精确封顶在花费额
- `intent` + `declaredRisk` —— 这个计划自称是什么，用文字说清
- `planHash` —— 完整性封印，覆盖 `{chainId, account, txs, expects, confirms}`
- `confirms` —— 这笔写操作必须产生的链上回执（见第 6 步）

构建一笔反向 swap（`tokenIn: "USDC"`），注意 `txs` 变成了**两条**：多出一
步 `approve`，并且 `expects.approvals` 声明了它——精确等于花费额，绝不
无限授权。

**深入阅读：** [ADR 0004](./adr/0004-quantified-expects-in-plans.md) ——
为什么 expects 是安全契约

## 5. simulate — 验证之门

```ts
const simulator = createTraceSimulator(runtime);
const { results } = await simulator.simulate([plan]);
console.log(results[0]?.effects, results[0]?.warnings);
```

模拟器通过 `debug_traceCall` 在**真实链上状态**回放计划中的交易，提取
实际发生的一切——每一笔资产流动（包括不发 Transfer 事件的原生 MON 和
wrapped 铸毁）、每一个授权、每一个收款方。然后把现实和计划的 `expects`
对账：**任何未声明的差异都变成 warning**，而任何 warning 都意味着停下。

两个值得动手的实验：

- **篡改 Plan** —— 改一下 `plan.txs[0].value` 再模拟：`PLAN_TAMPERED`。
  Plan 在 agent 侧流转，完整性是重新推导的，不是被信任的。
- **链式 Plan** —— 把 `[卖出Plan, 买回Plan]` 放进一次调用：Plan B 跑在
  Plan A 的模拟状态上，可以花掉账户只在模拟里才持有的 USDC。多步流程
  （claim → swap → supply）就是这样端到端验证的。跑
  `pnpm --filter @themoss/example-simple-flow swap` 看一个
  MON → USDC → MON 往返实地做这件事。

**深入阅读：** [mcp-tools.md](./mcp-tools.md#simulate) —— warning 码表 ·
[ADR 0002](./adr/0002-simulation-via-debug-tracecall.md) —— 为什么用
debug_traceCall

## 6. observations — 协议回执

对账说的是 token 流动的语言。协议还可以用自己的语言叙述。接上 observer
再模拟一次 swap：

```ts
const observing = createTraceSimulator(runtime, { observer: registry.observer() });
const { results } = await observing.simulate([plan]);
console.log(results[0]?.observations);
// [{ protocol: "kuru", name: "swapResult",
//    intent: "Swapped 1 MON into 0.0239 USDC on Kuru (3 fills)", data: {…} }]
```

这句话是 Kuru 适配器用 `@Event` 写出来的：模拟之后，这个 plan 的日志被按
协议自己的 ABI 解码，渲染成人类可读的回执。由于 swap capability 声明了
`confirms: ["swapResult"]`，一笔没有产生回执的 swap 会触发
`CONFIRMATION_MISSING` warning——回执是承重的。

一条必须内化的规则：observations 是**叙事，不是法律**。它只能收紧结果
（通过 `confirms`），永远不能消掉一个 warning。

**深入阅读：** [ADR 0008](./adr/0008-observation-plane.md) —— 双面制设计

## 7. 让 agent 来开

你刚才手动做的一切，都以四个 MCP 工具的形式暴露。把 MCP 客户端
（Claude Desktop、Claude Code……）指向服务器：

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

然后问 agent 一句 *"在 Monad 上 1 MON 能换多少 USDC"*，看它自己走完
discover → load → action → simulate。工具描述内嵌了安全规则；agent 侧的
完整契约（模拟强制、停机规则、意图对齐）在
[agent-skill.md](./agent-skill.md)。

**深入阅读：** [mcp-tools.md](./mcp-tools.md) —— 四个工具的契约

## 8. 写你自己的适配器

到这里你已经知道一个适配器要产出什么了。开始搭：

```bash
cp -r packages/protocols/_template packages/protocols/<yourprotocol>
```

模板是真实的 CI 构建包——复制即编译——它的 README 就是 checklist。你要
填的形状：

1. **ABI**，带可查证的来源（compiled / explorer / vendored）
2. **`@Protocol`** —— 合约 + 链上验证过的地址
3. **`@Capability`** —— 语义参数、量化 expects、诚实的风险标签
4. **`@Event`** —— 协议特有回执，用 `confirms` 门控（标准 ERC 转账已由审计面核对）
5. **测试** —— 离线形状测试 + 一个零警告的主网 live e2e

参考实现，按阅读顺序：
[`packages/system/src/wmon.ts`](../packages/system/src/wmon.ts)（注释密度
拉满的参考适配器）、[`packages/erc`](../packages/erc)（动态地址模式）、
[`packages/protocols/kuru`](../packages/protocols/kuru)（构建前读链、
vendored ABI、观察面）。

**深入阅读：** [protocol-onboarding.md](./protocol-onboarding.md) ——
逐节完整指南 · [CONTRIBUTING.md](../CONTRIBUTING.md) —— 你的 PR 会被
按这份 Definition of Done 审查

## 全景图

| 层 | 包 | 一句话职责 |
| --- | --- | --- |
| 机器 | `@themoss/core` | 装饰器、Plan、Registry —— 零链数据 |
| 验证 | `@themoss/simulator` | trace 模拟 + effects 对账 |
| 接口 | `@themoss/erc` | 编译的标准 ABI + 无地址通用适配器（erc20、erc721、erc1155） |
| 实例 | `@themoss/system` | Monad token 表、链默认值、WMON |
| 协议 | `@themoss/protocol-*` | 一个协议一个包 |
| 产品 | `@themoss/mcp-server` | 四个工具，开箱即用 |

为什么这样分层：[ADR 0006](./adr/0006-protocol-packages-and-manifests.md)
和 [ADR 0009](./adr/0009-erc-interface-layer-and-composition.md)。其余所有
设计决策在 [docs/adr/](./adr/)；项目词汇表在 [CONTEXT.md](../CONTEXT.md)。
