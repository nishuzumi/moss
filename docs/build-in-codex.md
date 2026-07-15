# moss入门--在 codex 中使用

本文根据本次实操过程整理，目标是让新手能理解 Moss 的基本工作流，并能把 Moss 接入 Codex 使用。


## 2. 把 Moss 接入 Codex 使用的教程

### 2.1 Codex 需要的 MCP 配置

在项目根目录使用 `.mcp.json` 配置 Moss：

```json
{
  "mcpServers": {
    "moss": {
      "command": "node",
      "args": ["packages/mcp-server/dist/cli.js"],
      "env": {
        "MOSS_RPC_URL": "https://rpc.monad.xyz",
        "MOSS_CHAIN_ID": "143"
      }
    }
  }
}
```

这份配置的含义：

- `command`: 用 Node 启动 Moss MCP server。
- `args`: 指向已经构建好的 Moss MCP CLI。
- `MOSS_RPC_URL`: 使用 Monad 主网 RPC。
- `MOSS_CHAIN_ID`: Monad 主网 chain id，值为 `143`。

### 2.2 为什么不要默认用 127.0.0.1:8545

本次实操中，一开始 `.mcp.json` 指向：

```json
{ "MOSS_RPC_URL": "http://127.0.0.1:8545" }
```

这会要求本机已经启动 Monad 版 anvil fork。当前机器没有 `anvil`，所以 Moss 在 `action` 阶段读取 Kuru 市场参数时失败：

```text
URL: http://127.0.0.1:8545/
Details: fetch failed
```

如果只是想在 Codex 中做主网模拟和报价，应该使用：

```text
https://rpc.monad.xyz
```

只有在运行 `examples/agent-swap` 那种本地 fork 交易示例时，才需要 `127.0.0.1:8545`。

### 2.3 构建 Moss MCP server

Codex 启动 MCP server 前，需要确保 `packages/mcp-server/dist/cli.js` 存在。

执行：

```bash
pnpm -r --filter @themoss/mcp-server build
```

检查是否能启动：

```bash
node packages/mcp-server/dist/cli.js
```

正常时会看到类似输出：

```text
moss-mcp: 12 capabilities/queries across 4 protocols on chain 143 (https://rpc.monad.xyz)
```

这说明 Moss MCP server 已经能连接 Monad 主网 RPC。

### 2.4 在 Codex 中使用 Moss

配置完成后，重启当前 Codex 任务，或新开一个 Codex 任务进入本仓库。

然后可以直接向 Codex 提问：

```text
在 Monad 上 1 MON 能换多少 USDC？请使用 Moss，按 discover → load → action → simulate 流程检查。
```

Codex 应该会调用 Moss 工具：

- `mcp__moss.discover`
- `mcp__moss.load`
- `mcp__moss.action`
- `mcp__moss.simulate`

### 2.5 重要排错经验

#### 问题 1：Moss 仍然访问 127.0.0.1:8545

现象：

```text
URL: http://127.0.0.1:8545/
Details: fetch failed
```

原因：

Codex 当前任务里的 MCP 进程是在修改 `.mcp.json` 之前启动的。MCP server 不会在当前任务中自动热重载配置。

解决：

- 新开一个 Codex 任务。
- 或关闭再重新打开当前任务。
- 确认 `.mcp.json` 已经指向 `https://rpc.monad.xyz`。

#### 问题 2：MCP server 启动失败

可能原因：

- 还没有执行 `pnpm build`
- `packages/mcp-server/dist/cli.js` 不存在
- Node 版本低于 22

解决：

```bash
node --version
pnpm install
pnpm build
```

#### 问题 3：simulate 失败或 RPC 不支持 debug_traceCall

Moss 的模拟依赖 `debug_traceCall`。如果 RPC 不支持 debug namespace，simulate 会失败。

推荐使用：

```text
https://rpc.monad.xyz
```

文档中也提到可用的 RPC 包括：

- `https://rpc.monad.xyz`
- `https://rpc4.monad.xyz`
- `https://rpc-mainnet.monadinfra.com`
- `https://monad-rpc.huginn.tech`

### 2.6 最小成功检查清单

完成接入后，按这个顺序检查：

1. `.mcp.json` 指向 `https://rpc.monad.xyz`
2. `pnpm build` 成功
3. `node packages/mcp-server/dist/cli.js` 能显示 chain 143
4. 新开或重启 Codex 任务
5. 在 Codex 中能看到 `mcp__moss` 工具
6. 用 Moss 跑 `discover → load → action → simulate`
7. `simulate` 返回 `warnings: []`

只要这些都满足，就说明 Moss 已经可以在 Codex 中正常使用。

