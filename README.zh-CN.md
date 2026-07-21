# Moss

[English](./README.md) | **中文**

Moss 把 Monad 协议交互变成 Agent 可调用的 Capability，统一流程为 `discover → load → action → simulate`。它只构建和验证未签名交易，永不签名、永不发送。

> [!WARNING]
> Moss 是未经审计的 Alpha 软件，请勿用于生产资金。

## 为什么使用 Moss

- **Agent 调用 Protocol 自己维护的操作。** Protocol 包负责地址、ABI、calldata、参数规则和 Receipt 解析。
- **模拟产生可检查的证据。** 每个成功交易都会返回有序原始 Change 和结构化 Receipt，并且必须完整、按顺序覆盖所有 Change。
- **签名保持独立。** MCP Agent 先用每条有序 Receipt text 对照用户请求；SDK 也可以使用结构化 Outcome，之后钱包才可能接触未签名交易。

## 已支持的 Protocol

Moss 当前只支持 Monad 主网，chain ID 为 `143`。

| Protocol | Package | Capability | Query |
| --- | --- | --- | --- |
| WMON | `@themoss/system` | `wrap`、`unwrap` | `balanceOf` |
| ERC-20 与 native MON | `@themoss/erc` | `transfer`、`approve` | `balanceOf`、`allowance`、`metadata` |
| ERC-721 | `@themoss/erc` | `transfer` | `ownerOf`、`balanceOf` |
| ERC-1155 | `@themoss/erc` | `transfer` | `balanceOf` |
| Kuru | `@themoss/protocol-kuru` | `swap` | `quote` |
| PancakeSwap V2 / V3 | `@themoss/protocol-pancakeswap` | `swap` | `quote` |

ERC-1155 `transfer` 接收 collection、token ID、amount 和 recipient。token ID 与 amount 使用十进制 uint256 字符串（允许零）。该 Capability 只构建一笔 `safeTransferFrom`，目前不暴露批量转账构建；Receipt 仍会解析 `TransferSingle` 和 `TransferBatch` Change，并保留批量条目的原始顺序，不做聚合。

## 快速开始

需要 Node 22+ 与 pnpm 11。示例读取 Monad 真实状态，但不需要私钥或有余额的账户，因为 Moss 只进行模拟。

```bash
git clone https://github.com/nishuzumi/moss
cd moss
pnpm install
pnpm build

# discover → load → action → simulate 一个 WMON wrap
pnpm --filter @themoss/example-simple-flow wrap

# 报价并模拟一个 Kuru MON → USDC swap
pnpm --filter @themoss/example-simple-flow swap

# 导出 MONADSCAN_API_KEY 后，抓取一个已验证的完整 ABI（ADR 0007）
pnpm fetch-abi 0x1b81D678ffb9C0263b24A97847620C99d213eB14 swapRouter02
```

离线运行测试：

```bash
pnpm test:offline
```

[新手上路](./docs/getting-started.zh-CN.md)会逐步打开每个阶段，说明 MCP 配置，并最终带你创建一个 Protocol 包。

### 作为 MCP server 使用

构建仓库后，把 stdio server 加入 MCP client：

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

server 只暴露 `discover`、`load`、`action` 和 `simulate`。详细契约见 [MCP 工具契约](./docs/mcp-tools.md)。

### 作为 library 使用

```ts
import { NATIVE, Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";

const runtime = await monadRuntime();
const registry = new Registry(runtime).use(system, erc, kuru);
const account = "0xcccccccccccccccccccccccccccccccccccccccc";
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});

const result = await registry.action("kuru", "swap", account, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  slippage: 50,
});
if (result.kind !== "capability") throw new Error("expected a Capability");

const simulation = await simulator.simulate(result);
if (simulation.halted || simulation.results.some((item) => item.warnings.length)) {
  throw new Error("simulation failed; do not sign");
}
```

## 验证流程

每个 Capability 拥有一笔直接的未签名交易，以及由其 `protocol + method` 注册得到的 typed Receipt parser。序列化 tree 不携带调用方提供的 Receipt 名称。其他交易只能属于嵌套 Capability；core 会验证整棵树并按确定的深度优先顺序展开。

模拟器按真实执行顺序，把成功的 Event 与 native MON transfer 记录为不可变 Change。Receipt 叶子必须保留原始 Change 对象，并保持相同长度与顺序。

交易回滚、trace 失败、Receipt 失败或覆盖不一致都会产生终止性 Warning。library 暴露完整 Receipt tree 与结构化 Outcome；MCP 只把验证后的有序叶子 text 和 Warning 返回给 Agent。

## 仓库结构

| Package | 职责 |
| --- | --- |
| `@themoss/core` | 装饰器、Registry、参数契约、Capability tree、Receipt 验证 |
| `@themoss/simulator` | `debug_traceCall`、状态串联、有序 Change 提取 |
| `@themoss/erc` | 无地址 ERC Protocol、ABI 与 Receipt 语义 |
| `@themoss/system` | Monad Runtime、官方常量与系统 Protocol |
| `@themoss/protocol-*` | 协议 ABI、Capability、Query 与 Receipt |
| `@themoss/mcp-server` | MCP 传输与应用组合 |

## 开发

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

workspace package 的类型来自构建产物，因此必须先 build 再 typecheck。离线时使用 `pnpm test:offline`。

## 文档

| 文档 | 用途 |
| --- | --- |
| [新手上路](./docs/getting-started.zh-CN.md)（[English](./docs/getting-started.md)） | 逐步运行并开发 Moss |
| [MCP 工具契约](./docs/mcp-tools.md) | 四个 MCP 工具的输入输出 |
| [Protocol 接入指南](./docs/protocol-onboarding.md) | 开发并提交一个 Protocol 包，包括获取已验证 ABI |
| [Agent 安全规则](./docs/agent-skill.md) | 强制模拟与意图对齐规则 |
| [Agent swap 示例](./examples/agent-swap/README.md) | 在本地 Monad fork 上分离 Agent 与签名方 |
| [架构决策](./docs/adr/) | 当前设计与取舍 |
| [领域词汇](./CONTEXT.md) | framework 统一语言 |

## 参与贡献

阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。新增 Protocol 从 [`packages/protocols/_template`](./packages/protocols/_template) 开始，并按照 [Protocol 接入指南](./docs/protocol-onboarding.md)完成。

## 安全

[SECURITY.md](./SECURITY.md) 说明安全保证、限制和私密漏洞报告方式。

## License

[MIT](./LICENSE)
