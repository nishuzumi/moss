# AI 辅助理解 Moss 核心文档记录

文档链接：

https://github.com/nishuzumi/moss/blob/main/docs/mcp-tools.md

我让 AI 帮我理解了什么：

我让 AI 帮我理解 Moss MCP 的四个核心工具：`discover`、`load`、`action`、`simulate`。重点理解它们各自负责什么，以及为什么 Agent 不能直接跳过模拟去构造交易。

我的理解是：Moss 不是一个自动交易机器人，也不是钱包。它更像是 Agent 和链上协议之间的一层安全能力接口。Agent 先用 `discover` 找到可用能力，再用 `load` 读取参数和风险说明，然后用 `action` 构建未签名的 Plan，最后必须用 `simulate` 在真实链上状态中检查这个 Plan 的实际效果。

这让我更直观地理解了 Moss 的核心价值：它不是让 Agent 更快地发交易，而是让 Agent 在交易交给用户签名前，先知道这笔操作会花出什么、收到什么、是否有授权、是否有 warning。

AI 生成了什么代码骨架 / 技术方案：

AI 帮我整理了一个把 Moss 接入 Codex 的最小技术方案：

1. 在项目根目录配置 `.mcp.json`，让 Codex 能启动 Moss MCP server。
2. 使用 Monad 主网 RPC：`https://rpc.monad.xyz`。
3. 构建 MCP server，确保 `packages/mcp-server/dist/cli.js` 存在。
4. 在 Codex 中重启任务，让新的 MCP 配置生效。
5. 让 Codex 按 `discover -> load -> action -> simulate` 流程完成一次 Agent 模拟。

最小配置骨架如下：

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

我手动改了什么：

我手动新增了 `docs/build-in-codex.md`，把本次接入 Codex 的过程整理成新手教程。

我还手动修改了 `docs/README.md`，把 `Build in Codex` 加到文档目录中，方便别人从 docs 首页找到这篇教程。

另外，我在实际排查中确认了一个容易踩坑的点：如果 `.mcp.json` 一开始指向 `127.0.0.1:8545`，但本机没有启动本地 fork，Moss 在调用链上数据时会失败。后来改成 Monad 主网 RPC，并重启 Codex 任务后，MCP 配置才真正生效。

当前是否跑通：跑通

如果没跑通，卡在哪里：

已跑通。主要卡点已经解决：Codex 当前任务里的 MCP server 不会自动热重载 `.mcp.json`，所以修改 RPC 配置后需要新开或重启 Codex 任务。

