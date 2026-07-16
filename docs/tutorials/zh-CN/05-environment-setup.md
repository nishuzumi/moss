# Moss 项目环境配置指南

本章完成从空目录到可运行 Moss 的环境配置。Moss 当前只支持 Monad 主网，chain ID 为 `143`。

## 1. 准备工具

必须安装：

- Git；
- Node.js 22 或更高版本；
- pnpm 11。仓库固定使用 `pnpm@11.10.0`。

检查版本：

```bash
git --version
node --version
corepack --version
```

推荐让 Corepack 根据仓库的 `packageManager` 字段启用正确的 pnpm：

```bash
corepack enable
corepack prepare pnpm@11.10.0 --activate
pnpm --version
```

预期 `node --version` 至少为 `v22.x`，`pnpm --version` 为 `11.10.0`。

## 2. 克隆仓库

```bash
git clone https://github.com/Wea1her/moss.git
cd moss
```

确认当前目录正确：

```bash
git status
pnpm --version
```

根目录应该包含 `package.json`、`pnpm-workspace.yaml`、`packages/`、`examples/` 和 `docs/`。

## 3. 安装依赖

```bash
pnpm install --frozen-lockfile
```

仓库设置了依赖供应链保护：发布时间不足一天的依赖版本会被拒绝解析。不要为了绕过它而删除 `minimumReleaseAge`。

## 4. 构建和检查

按以下顺序执行：

```bash
pnpm build
pnpm typecheck
pnpm lint
MOSS_SKIP_E2E=1 pnpm test
```

必须先 `build` 再 `typecheck`，因为 workspace package 的类型会从已经构建的 `dist/*.d.ts` 解析。

`MOSS_SKIP_E2E=1` 会跳过需要访问 Monad 主网的测试，适合首次安装、离线环境或 CI 之外的快速检查。需要完整验证时运行：

```bash
pnpm test
```

## 5. 配置 RPC

默认 RPC 是：

```text
https://rpc.monad.xyz
```

普通示例不需要 `.env` 文件。可以临时在当前 shell 设置：

```bash
export MOSS_RPC_URL=https://rpc.monad.xyz
```

也可以只对一条命令生效：

```bash
MOSS_RPC_URL=https://rpc.monad.xyz pnpm --filter @themoss/example-simple-flow wrap
```

如果通过 MCP 使用 Moss，把变量写在 MCP client 配置的 `env` 中，而不是把密钥写进仓库：

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

用于模拟的 RPC 必须支持 `debug_traceCall`、call/log evidence、`prestateTracer` state diff 和 state override。只支持普通 `eth_call` 的节点不能完成 Moss 的完整验证流程。

## 6. 运行第一个示例

```bash
pnpm --filter @themoss/example-simple-flow wrap
```

这个命令读取 Monad 主网状态，构建并模拟一笔 WMON wrap Capability。它不会签名或广播交易，因此示例账户不需要私钥，也不需要余额。

再运行 Kuru swap：

```bash
pnpm --filter @themoss/example-simple-flow swap
```

正常输出会依次展示 Capability/Query 和模拟结果。只要存在 Warning，就应视为失败并停止。

## 7. 可选：本地 Monad fork 环境

只有运行 `examples/agent-swap` 的本地签名演示时，才需要 Monad 版本的 Foundry：

```bash
curl -L https://foundry.category.xyz | bash
foundryup --network monad
anvil --version
```

这里必须是 Monad build，普通上游 Anvil 不具备示例要求的 Monad gas model、opcode pricing 和 precompile 行为。

## 8. 环境自检清单

- [ ] Node.js 版本不低于 22；
- [ ] pnpm 版本为 11.10.0；
- [ ] `pnpm install --frozen-lockfile` 成功；
- [ ] `pnpm build` 在 `pnpm typecheck` 之前运行；
- [ ] 离线测试通过；
- [ ] RPC 报告 chain ID `143`；
- [ ] 没有把私钥写入 `.env`、MCP 配置或项目代码；
- [ ] 示例遇到 Warning 会立即停止。

下一步：[Moss 入门指南](./01-getting-started.md)。
