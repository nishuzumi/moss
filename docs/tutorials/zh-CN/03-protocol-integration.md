# Moss 协议接入实践

本章说明如何从官方模板开始接入一个 Monad Protocol。重点不是“能生成 calldata”，而是让地址、ABI、参数、交易树和模拟结果都能被审查与验证。

开始前先阅读 [Protocol onboarding](../../protocol-onboarding.md)、`CONTEXT.md` 和相关 ADR。

## 1. 从模板创建 package

不要手工拼装 package 配置：

```bash
cp -R packages/protocols/_template packages/protocols/myprotocol
pnpm install
```

然后修改 `packages/protocols/myprotocol/package.json`：

```json
{
  "name": "@themoss/protocol-myprotocol",
  "version": "0.0.0",
  "private": true
}
```

开发期间保留 `private: true`。准备发布时再按维护者要求移除。搜索并替换所有占位符：

```bash
rg -n CHANGEME packages/protocols/myprotocol
```

## 2. 明确 Protocol 边界

一个 Protocol package 应拥有：

- 协议 ABI 及其来源；
- 协议独占的固定部署地址及来源；
- `@Protocol` class；
- Capability、Query 和参数契约；
- Receipt parser 与结构化 Outcome；
- 单元测试、类型 fixture 和主网 happy path；
- README 中的支持范围、风险和限制。

Protocol 特定逻辑不要塞进 core、simulator 或 MCP 通用传输层。动态 pool、market 和 token 应从链状态或可信候选源发现，而不是不断添加全局常量。

## 3. 建立 ABI 和地址来源

ABI 是安全关键工件。`src/abis/` 中每个 ABI 必须选择一种来源：

1. `compiled`：由 package 中提交的 Solidity source 编译生成；
2. `explorer`：来自区块浏览器的 verified contract 页面，记录 URL 和日期；
3. `vendored`：从官方 SDK 或协议仓库完整 vendoring，并可确定性重新生成。

示例头部：

```ts
// ABI origin: explorer — https://example-explorer/... (retrieved 2026-07-16)
```

不能凭记忆手写 ABI，也不能手工挑选几个函数伪装成 vendored artifact。生成的 TypeScript ABI 需要保留字面量类型，例如 `as const` 或 `parseAbi(...)`，这样 `Handle<typeof RouterAbi>` 才能获得完整类型推断。

每个固定地址要引用 canonical source，并添加主网 bytecode 检查。固定 token 还要验证预期 metadata。

## 4. 声明自描述 Protocol

模板中的核心形态如下：

```ts
@Protocol({
  name: "myprotocol",
  category: "dex",
  description: "Describe the Protocol in one sentence for an Agent.",
  contracts: {
    router: { abi: RouterAbi, addr: ROUTER_ADDRESS },
  },
})
export class MyProtocol {
  declare router: Handle<typeof RouterAbi>;
}
```

必须给 Handle 提供 ABI 类型参数。`@Protocol` 在运行时注入 Handle，而 `declare` 字段只提供编译期类型，不会生成额外实例字段。

如果依赖 ERC-20 approve、transfer 或其他 Protocol，必须在 Protocol metadata 中显式声明依赖，并使用注入的 typed Protocol reference。不能用隐式注册副作用。

## 5. 定义参数契约

每个字段都使用 `{ type, description }`：

```ts
const swapParams = {
  tokenIn: {
    type: TokenReference,
    description: "Token supplied to this swap.",
  },
  tokenOut: {
    type: TokenReference,
    description: "Token requested from this swap.",
  },
  amountIn: {
    type: PositiveDecimalString,
    description: "Human-readable amount of tokenIn to spend.",
  },
  slippage: {
    type: BasisPoints.default(50),
    description: "Maximum slippage allowed for this swap.",
  },
} satisfies ParamsSpec;

type SwapParams = InferParams<typeof swapParams>;
```

`type` 描述可复用的值规则，字段 `description` 描述它在当前方法中的用途。不要把两者混为一个模糊字符串，也不要让 Zod object 穿过 MCP 边界。

## 6. 添加 Query

Query 用于读取或报价，不生成 Capability：

```ts
@Query({ intent: "Quote a swap", params: quoteParams })
async quote(params: InferParams<typeof quoteParams>) {
  const raw = await this.router.read.getQuote([/* typed arguments */]);
  return { amountOut: raw.toString() };
}
```

Query 返回值必须 JSON-safe。链上数量通常转为十进制字符串。

写函数的只读预览可以使用 `handle.call.fn(...)`，普通 view/pure 读取使用 `handle.read.fn(...)`。Receipt parser 不允许使用任何 RPC face。

## 7. 添加 Capability

Capability 从用户视角选择统一 verb：

```ts
@Capability<MyProtocol, typeof swapParams>({
  intent: "Swap one asset into another",
  verb: "swap",
  params: swapParams,
  receipt: "swapReceipt",
  risk: ["fundOut", "priceImpact"],
  tags: ["example"],
})
async swap(params: SwapParams) {
  const transaction = this.router.swap([/* typed arguments */]);
  return [transaction];
}
```

强制规则：

- 每个 Capability 恰好有一笔直接 TransactionNode；
- 每个 Capability 恰好绑定一个 typed Receipt parser；
- 额外交易必须由嵌套 Capability 拥有；
- Capability tree 中的数据必须 JSON-safe；
- Moss 只返回未签名交易。

如果 ERC-20 swap 需要 approve，调用注入的 ERC Capability，并返回 `[approval, transaction]`。`approval` 是拥有自己交易和 Receipt 的嵌套 Capability；`transaction` 是当前 swap 唯一的直接交易。

## 8. 实现纯 Receipt parser

Receipt 只能根据一笔成功直接交易产生的 immutable ordered Changes 工作：

```ts
@Receipt()
swapReceipt(changes: readonly Change[]): ReceiptResult<SwapOutcome> {
  const parsed = changes.map((change) => {
    // Decode this exact Change and keep the original object.
    return {
      kind: "change" as const,
      change,
      data: decodeProtocolFact(change),
      text: describeProtocolFact(change),
    };
  });

  return {
    kind: "receipt",
    outcome: buildJsonSafeOutcome(parsed),
    text: "MyProtocol Swap",
    changes: parsed,
  };
}
```

上面只展示结构，实际 decoder 必须严格验证 event address、topic、data、次数和语义。

Receipt 必须：

- 保留每个原始 Change 对象；
- 数量完全一致；
- 顺序完全一致；
- 对未知或矛盾 Change 失败；
- 返回 JSON-safe structured Outcome；
- 不访问 Runtime、Handle、Query、RPC 或外部状态；
- 不用计划参数补造模拟中不存在的事实。

Receipt text 用于展示，Outcome 才是 SDK 程序检查的权威结果。

## 9. 导出并加入 composition root

从 package entry point 直接导出稳定 Protocol：

```ts
export { MyProtocol } from "./my-protocol.js";
```

应用层显式选择 module：

```ts
import * as myprotocol from "@themoss/protocol-myprotocol";

const registry = new Registry(runtime).use(system, erc, myprotocol);
```

实验性 class 保持内部使用。新增 Protocol 通常只修改它自己的 package 和明确的 application composition root。

## 10. 测试要求

至少覆盖：

1. Protocol metadata 和导出可被 Registry 注册；
2. 正确参数、Handle method 和 Receipt name 的类型推断；
3. 使用 `@ts-expect-error` 的负面类型 fixture；
4. Capability 恰好一笔直接交易；
5. Receipt 保留全部原始 Change 对象和顺序；
6. 缺失、重复、替换、重排和未知 Change 会失败；
7. 固定地址有 bytecode，token metadata 正确；
8. Monad 主网 happy path 模拟为零 Warning。

从根目录运行：

```bash
pnpm build
pnpm typecheck
pnpm lint
MOSS_SKIP_E2E=1 pnpm test
pnpm test
```

## 11. 文档和提交

Protocol README 应写明：

- 支持哪些 Capability 和 Query；
- 合约、市场或资产范围；
- 参数单位与默认值；
- 授权、资金流出、价格影响等风险；
- ABI 和固定地址来源；
- 已知限制和动态发现方式。

用户可见 package 变更需要：

```bash
pnpm changeset
```

PR 中附上主网零 Warning 的模拟证据，并完整填写 Protocol checklist。

## 12. 常见错误

| 错误 | 正确做法 |
| --- | --- |
| 凭记忆手写或裁剪 ABI | 使用 compiled、explorer 或完整 vendored 来源 |
| 在 Agent 或 Protocol 中处理私钥 | 把签名方保持在 Moss 之外 |
| 一个 Capability 直接创建多笔交易 | 把附加交易放入嵌套 Capability |
| Receipt 调 RPC 或读取 Capability 参数 | 只解析传入的 ordered Changes |
| 忽略未知 event | 明确失败，不能静默丢弃 |
| 用 symbol 猜 token | 使用明确地址或 `native` |
| 只测 calldata，不测 Receipt | 同时验证树结构、Change coverage 和 Outcome |
| 为 Protocol 特例修改 generic core | 把协议语义保留在 Protocol package |

提交前逐项对照 [`packages/protocols/_template`](../../../packages/protocols/_template) 的 checklist。
