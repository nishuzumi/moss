# AI Agent Demo 搭建教程

本章搭建两层 Demo：先让 AI Agent 通过 MCP 完成“发现、构建、模拟和审查”，再可选地在一次性 Monad 本地 fork 上体验独立钱包发送。整个过程中，Moss 和 Agent 都不应接触真实私钥。

## 1. 架构和安全边界

```text
用户请求
   ↓
AI Agent ── discover/load/action/simulate ── Moss MCP server
   ↓                                      ↓
意图对齐                         未签名 Capability + 模拟证据
   ↓
独立钱包或人工审核（Moss 之外）
```

生产思路中，Agent 只负责记录意图、调用 Moss、处理 Warning 和展示证据。钱包应独立验证 sender、网络和交易树，再由用户决定是否签名。

## 2. 构建 MCP server

在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm build
```

server 入口生成在：

```text
packages/mcp-server/dist/cli.js
```

## 3. 配置 MCP client

把绝对路径写入支持 MCP stdio server 的 client：

```jsonc
{
  "mcpServers": {
    "moss": {
      "command": "node",
      "args": ["/absolute/path/to/moss/packages/mcp-server/dist/cli.js"],
      "env": {
        "MOSS_RPC_URL": "https://rpc.monad.xyz"
      }
    }
  }
}
```

注意：

- 必须使用绝对路径；
- 修改配置后重启 MCP client；
- RPC 必须是 Monad chain ID `143`；
- 配置中不需要、也不应出现私钥；
- Moss MCP server 只提供 `discover`、`load`、`action`、`simulate` 四个工具。

## 4. 为 Agent 写清楚操作规则

可以把下面内容加入 Agent system prompt 或项目规则：

```text
使用 Moss 时：
1. 先记录用户的操作、资产地址、数量、recipient、限制和 Protocol 约束。
2. 严格执行 discover → load → action → simulate。
3. 不猜 method 或参数，不用 token symbol 代替地址。
4. 不编辑、重排或重建 action 返回的 Capability tree。
5. 任意 Warning 都立即停止，不交给签名方。
6. 零 Warning 后，把所有有序 Receipt text 与原始请求逐项对齐。
7. 永远不请求、读取或保存私钥；Moss 不签名、不发送。
```

仓库中的完整规则见 [Agent safety rules](../../agent-skill.md)。

## 5. Demo 请求

向 Agent 发出明确请求：

> 使用 Moss 在 Kuru 上模拟把 1 native MON 换成官方 USDC，最大滑点 0.5%。只构建和模拟，不要签名或发送；如果出现任何 Warning 就停止。

Agent 应先记录：

- verb：`swap`；
- Protocol：`kuru`；
- tokenIn：`native`；
- tokenOut：官方 USDC 地址；
- amountIn：`1`；
- slippage：`50` basis points；
- account：用户明确提供的 EVM address。

## 6. 第一步：discover

工具输入：

```json
{
  "verb": "swap"
}
```

从输出中选择真实返回的 `{ protocol, method }`。不能直接猜 `kuru.swap`，即使之前见过这个名字。

## 7. 第二步：load

```json
{
  "items": [
    { "protocol": "kuru", "method": "swap" },
    { "protocol": "kuru", "method": "quote" }
  ]
}
```

Agent 要检查：

- method 的 intent 是否符合 swap；
- risk labels 是否可接受；
- `tokenIn`、`tokenOut`、`amountIn`、`slippage` 的 type 和 description；
- `50` 是否确实代表 0.5%，而不是 50%。

## 8. 第三步：action

可以先执行 quote Query。官方 USDC 地址以当前 `@themoss/system` 导出为准；仓库当前示例使用：

```json
{
  "protocol": "kuru",
  "method": "quote",
  "account": "0xcccccccccccccccccccccccccccccccccccccccc",
  "params": {
    "tokenIn": "native",
    "tokenOut": "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    "amountIn": "1"
  }
}
```

Query 返回 `kind: "query"`，不需要 simulate。

随后构建写 Capability：

```json
{
  "protocol": "kuru",
  "method": "swap",
  "account": "0xcccccccccccccccccccccccccccccccccccccccc",
  "params": {
    "tokenIn": "native",
    "tokenOut": "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    "amountIn": "1",
    "slippage": 50
  }
}
```

保存工具返回的完整 Capability tree。不要修改其中的 `from`、`to`、`data`、`value`、params、children 或顺序。

## 9. 第四步：simulate

把 `action` 返回的原始 Capability 原样传入：

```jsonc
{
  "capability": {
    // exact CapabilityNode returned by action
  }
}
```

通过条件必须同时满足：

- `ok` 为真；
- 没有 `halted`；
- 每个 result 的 `warnings` 都为空；
- 每条 ordered Receipt text 都符合原始请求；
- 没有意外 approve、recipient、token、数量或 Protocol。

MCP 返回的是经过完整 Receipt coverage 验证后的有序文本。library API 还可以取得完整 Change、Receipt tree 和 structured Outcome。

## 10. Agent 最终展示模板

一个合格的 Demo 回复应包含：

```text
操作：Kuru swap
发送方：0x...
输入：1 native MON
输出资产：USDC 0x...
滑点上限：50 bps（0.5%）
模拟：完成，0 Warning
有序 Receipt：
1. ...
2. ...
结论：Moss 仅构建并模拟了未签名交易，尚未签名或发送。
```

如果存在 Warning，结论必须改成“停止”，并保留原因供诊断。

## 11. 可选：运行本地 fork 签名 Demo

仓库的 `examples/agent-swap` 把 Agent 和 wallet 分成两个进程。先安装 Monad Foundry：

```bash
curl -L https://foundry.category.xyz | bash
foundryup --network monad
```

启动本地 fork 并给演示账户充值本地余额：

```bash
pnpm --filter @themoss/example-agent-swap fork
```

构建、模拟、验证并输出未签名 Capability JSON：

```bash
pnpm --filter @themoss/example-agent-swap swap -- verified-capability.json
```

人工检查终端中的 ordered Receipts 和 JSON。确认无 Warning 后，才在本地 fork 发送：

```bash
pnpm --filter @themoss/example-agent-swap wallet -- send verified-capability.json
```

检查地址和余额：

```bash
pnpm --filter @themoss/example-agent-swap wallet -- address
pnpm --filter @themoss/example-agent-swap wallet -- balance
```

> [!CAUTION]
> 示例里的 Anvil 私钥是全世界公开的开发密钥，只能用于一次性本地 fork。绝不能给该地址充值真实资产，也不能把这种内置密钥模式用于生产。

## 12. Demo 验收清单

- [ ] MCP client 能看到四个 Moss 工具；
- [ ] Agent 在 action 前执行了 discover 和 load；
- [ ] token 使用明确地址或 `native`；
- [ ] action 结果没有被修改；
- [ ] 写操作执行了 simulate；
- [ ] 任意 Warning 都会停止；
- [ ] ordered Receipt 与用户意图逐项对齐；
- [ ] Moss/Agent 未接触真实私钥；
- [ ] 可选 wallet 只连接本地 chain ID 143 fork。
