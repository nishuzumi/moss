# 新手上路 — 从零到一笔通过验证的 swap

[English](./getting-started.md) | **中文**

这篇教程会先运行 Moss，再逐层重建整个流程。最后你会配置 MCP，并开始开发一个 Protocol 包。

示例读取 Monad 主网的真实状态，但不需要私钥或有余额的账户，因为 Moss 只构建和模拟未签名交易。

## 0. 准备仓库

需要 Node 22+ 与 pnpm 11。

```bash
git clone https://github.com/nishuzumi/moss
cd moss
pnpm install
pnpm build
```

先在不访问 RPC 的情况下验证工具链：

```bash
pnpm test:offline
```

workspace package 的类型来自 `dist` 中的构建产物，因此必须先 build 再 typecheck。

## 1. 先运行完整流程

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

这个示例会发现 WMON、加载参数契约、构建 wrap Capability、执行模拟，并打印有序 Receipt。

最终检查的重点不是一句成功文本，而是零 Warning，以及与用户请求一致的结构化 Receipt Outcome。

再运行一个 Kuru 示例：

```bash
pnpm --filter @themoss/example-simple-flow swap
```

它会查询 MON/USDC 报价，构建一个 swap Capability，并根据当前 Kuru 市场状态进行模拟。

## 2. 在临时文件中组装 Moss

创建 `examples/simple-flow/src/play.ts`：

```ts
import { NATIVE, Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";

const ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc";
const runtime = await monadRuntime({
  ...(process.env.MOSS_RPC_URL ? { rpcUrl: process.env.MOSS_RPC_URL } : {}),
});

const registry = new Registry(runtime).use(system, erc, kuru);
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});
```

每完成一节都可以运行这个文件：

```bash
pnpm --filter @themoss/example-simple-flow exec tsx src/play.ts
```

composition root 选择 Protocol module。Registry 扫描顶层 decorated export，忽略 helper 和 ABI，并递归注册声明的 Protocol 依赖。

## 3. 调用工具前先记录用户意图

本教程的请求是：

> 在 Kuru 上把 1 native MON 换成 USDC，最多允许 0.5% 滑点。

保留操作、输入资产、输出资产、数量、限制、发送方和 Protocol 选择。Moss 之后无法从 calldata 中还原用户原话。

资产身份必须明确：native MON 使用 `NATIVE`，官方 USDC 使用 `USDC_ADDRESS`。用户输入的 symbol 不能作为 token 身份。

## 4. discover — 发现操作

追加：

```ts
const candidates = registry.discover({ verb: "swap" });
console.log(candidates);
```

`discover` 返回轻量坐标和选择所需 metadata。它不会返回完整参数 schema，也不会构建交易。

尝试其他过滤条件：

```ts
registry.discover({ verb: "transfer" });
registry.discover({ category: "token" });
registry.discover({ protocol: "kuru" });
```

verb 描述用户操作，例如 `swap`、`wrap` 或 `approve`。tag 承载开放语义，例如 `clob` 或 `orderbook`。

## 5. load — 加载调用契约

追加：

```ts
const [swap] = registry.load([{ protocol: "kuru", method: "swap" }]);
console.dir(swap, { depth: null });
```

`load` 返回 intent、risk label，以及每个参数的两类独立描述：

- `type` 是生成的 JSON Schema 和可复用的值描述；
- `description` 说明该字段在当前操作中的用途。

对于 `slippage`，type 解释 basis points 和合法范围；字段 description 说明它用于限制输出减少。`50` 表示 `0.5%`。

必须在 `action` 前调用 `load`。不要根据参数名猜测单位、默认值、地址或字段含义。

## 6. 执行 Query

Query 立即执行，不会生成 Capability：

```ts
const quote = await registry.action("kuru", "quote", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
});

if (quote.kind !== "query") throw new Error("expected a Query result");
console.log("quote", quote.data);
```

`amountIn` 是人类可读的十进制字符串；也可以只传 `amountOut`，表示最低目标输出。Kuru 会动态发现市场，比较直连与经 MON 的路径，并返回人类可读的报价边界。

## 7. 构建 Capability tree

追加：

```ts
const result = await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  slippage: 50,
});

if (result.kind !== "capability") throw new Error("expected a Capability");
const capability = result;
console.dir(capability, { depth: null });
```

每个 Capability 恰好拥有一个直接 TransactionNode。Registry 会根据已注册的 `protocol + method` 解析对应的 Receipt parser；序列化 tree 不携带由调用方提供的 Receipt 名称。直接交易为零或多于一笔时，core 会拒绝整棵树。

如果输入是 ERC-20，swap 会在 Kuru 交易前包含一个嵌套的 ERC-20 approve Capability。子节点拥有自己的交易和 Receipt，执行顺序来自深度优先遍历。

Capability 参数必须保持 JSON-safe。Protocol 构造 calldata 时可以使用 bigint，但序列化数量要使用字符串，交易字段使用 hex。

## 8. simulate — 模拟并检查 Receipt

追加：

```ts
const simulation = await simulator.simulate(capability);
console.dir(simulation, { depth: null });

if (simulation.halted || simulation.results.some((item) => item.warnings.length > 0)) {
  throw new Error("simulation warning: stop before signing");
}

for (const item of simulation.results) {
  console.log(item.receipt?.outcome);
  console.log(item.receipt?.text);
}
```

simulator 按深度优先顺序执行交易，并把状态传给下一笔。每个成功交易都会产生不可变 Change list，其中包含按真实执行顺序排列的原始 Event 与 native MON transfer。

所属 Protocol 解析这些 Change。core 会递归检查 Receipt 叶子是否保留了完全相同的原始 Change 对象、长度与顺序。

交易回滚、trace 失败、状态串联失败、Receipt 错误或覆盖不一致都会产生终止性 Warning。之前成功的 Receipt 可用于诊断，后续交易不会执行。

## 9. 用结构化 Outcome 对齐用户意图

零 Warning 只说明观察到的每个 Change 都已被解析，并不说明结果满足用户请求。

对于本次 swap，要检查最终结构化 Outcome：

- `operation === "swap"` 且 `protocol === "kuru"`；
- sender、`tokenIn` 和 `tokenOut` 与请求一致；
- `amountIn` 等于 1 MON 的 base unit 数量；
- `amountOut` 大于零。

还要确认 Capability 保留了 `slippage: 50`。Protocol 使用它构造交易中的链上最小输出保护。

Receipt text 只适合展示，不能作为证据。绝不能只因为字符串里包含 “Kuru Swap” 就批准交易。

## 10. 使用 MCP server

执行 `pnpm build` 后，把 server 加入 MCP client：

```jsonc
{
  "mcpServers": {
    "moss": {
      "command": "node",
      "args": ["<moss路径>/packages/mcp-server/dist/cli.js"],
      "env": { "MOSS_RPC_URL": "https://rpc.monad.xyz" }
    }
  }
}
```

Agent 会获得同样的四个阶段：`discover`、`load`、`action` 和 `simulate`。MCP `simulate` 返回每笔交易有序的 Receipt 叶子 text 和 Warning；完整 Receipt 证据仍可通过 library API 获取。写操作必须在最终 action 结果之后执行 simulate。

[MCP 工具契约](./mcp-tools.md)说明 wire shape；[Agent 安全规则](./agent-skill.md)说明强制停止和意图对齐要求。

## 11. 开始开发 Protocol 包

复制持续参与构建与测试的 template：

```bash
cp -R packages/protocols/_template packages/protocols/myprotocol
```

按照下面的顺序开发：

1. 重命名 package，并替换所有 `CHANGEME`；
2. 添加有来源的 ABI 和经过验证的固定地址；
3. 声明 `@Protocol`、typed Handle 和 Protocol 依赖；
4. 定义 Zod 参数契约、Capability、Query 与纯 Receipt；
5. 添加正反类型 fixture、失败测试和一个真实链 happy path；
6. 导出 Protocol，并加入 application composition root。

完整开发与 review checklist 见 [Protocol 接入指南](./protocol-onboarding.md)。

## 12. 常见问题（FAQ）

### 12.1 Windows 提示无法识别 `pnpm`，怎么办？

先确认是否已经安装 pnpm：

```powershell
pnpm -v
```

如果 PowerShell 提示无法识别该命令，可执行：

```powershell
npm install -g pnpm
```

安装完成后关闭并重新打开 VS Code 终端，再次运行 `pnpm -v`。本项目需要 pnpm 11。

### 12.2 为什么必须先运行 `pnpm build`，再运行 typecheck 或示例？

Moss 是 pnpm monorepo，workspace package 的类型声明来自各 package 的 `dist` 构建产物。首次安装依赖后，应按顺序执行：

```powershell
pnpm build
pnpm typecheck
```

构建成功时通常可以看到 `ESM Build success`、`DTS Build success`，并在相关 package 的 `dist` 目录中看到 `index.d.ts`。

### 12.3 构建输出中出现 `examples are not built`，是否代表失败？

不一定。部分 example package 的 `build` 脚本会主动跳过编译，因为示例通过 `tsx` 直接运行源码。

应继续检查完整输出：如果各 package 显示 `Build success`、`DTS Build success` 或 `Done`，并且没有 `ERR_PNPM_*` 等终止错误，通常表示构建已完成。

### 12.4 为什么不能把 `const candidates = ...` 直接输入 PowerShell？

下面这种内容是 TypeScript 代码：

```ts
const candidates = registry.discover({ verb: "swap" });
```

它应写入 `examples/simple-flow/src/play.ts`，不能作为 PowerShell 命令执行。保存文件后，使用下面的终端命令运行：

```powershell
pnpm --filter @themoss/example-simple-flow exec tsx src/play.ts
```

可以这样区分：

- `pnpm`、`node`、`git` 开头的内容通常是终端命令；
- `const`、`import`、`await` 开头的内容通常是 TypeScript 代码；
- `{ "mcpServers": ... }` 是 JSON 配置，应写入 MCP client 的配置文件。

### 12.5 VS Code 提示找不到 `process` 或 `@themoss/system` 的类型，怎么办？

先确认命令行构建是否真的失败：

```powershell
pnpm build
pnpm typecheck
```

如果命令执行成功，并且例如 `packages/system/dist/index.d.ts` 已存在，则可能只是 VS Code 尚未刷新 monorepo 类型信息。可依次尝试：

1. 确认 VS Code 打开的是 Moss 仓库根目录，而不是单独打开 `examples/simple-flow`；
2. 在命令面板执行 `TypeScript: Select TypeScript Version`，选择 `Use Workspace Version`；
3. 执行 `TypeScript: Restart TS Server`；
4. 执行 `Developer: Reload Window`。

不要安装类似 `@types/themoss__system` 的包。`@themoss/system` 是当前仓库中的 workspace package，不是需要单独安装类型的第三方包。

### 12.6 运行 `wrap` 或 `swap` 示例会花费真实资产吗？

不会。这些示例读取 Monad 主网状态，但只构建并模拟未签名交易，不需要私钥，也不会广播交易。

不过，Moss 仍处于未经审计的 alpha 阶段。后续若将生成的交易交给其他钱包或签名方，必须先检查模拟结果，并避免使用生产资金。

### 12.7 为什么模拟没有 Warning，仍不能直接批准交易？

零 Warning 只说明模拟观察到的 Change 已被完整解析，不代表结果一定符合用户原始意图。

对于 swap，还应检查结构化 Outcome，例如：

- `operation` 和 `protocol` 是否正确；
- sender、`tokenIn` 和 `tokenOut` 是否与请求一致；
- 输入和输出数量是否合理；
- Capability 是否保留预期的滑点限制。

Receipt text 主要用于展示，不能替代结构化 Outcome 和 Warning 检查。

### 12.8 MCP Server 的 JSON 配置应该在哪里执行？

下面的内容不是终端命令：

```json
{
  "mcpServers": {
    "moss": {
      "command": "node",
      "args": ["<moss路径>/packages/mcp-server/dist/cli.js"],
      "env": { "MOSS_RPC_URL": "https://rpc.monad.xyz" }
    }
  }
}
```

它应添加到支持 MCP 的 client 配置文件中。`<moss路径>` 需要替换成实际绝对路径，例如 Windows 下可写为：

```text
C:/Users/<用户名>/moss/packages/mcp-server/dist/cli.js
```

配置前先执行 `pnpm build`，并确认 `packages/mcp-server/dist/cli.js` 已生成。

## 13. 下一步

- [Protocol template](../packages/protocols/_template)
- [Kuru Protocol](../packages/protocols/kuru/src/kuru.ts)
- [WMON Protocol](../packages/system/src/wmon.ts)
- [Agent/签名方示例](../examples/agent-swap/README.md)
- [安全模型](../SECURITY.md)
- [架构决策](./adr/)
