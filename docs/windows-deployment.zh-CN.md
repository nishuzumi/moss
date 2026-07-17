
# Windows 环境本地部署教程

> 本文档面向 **Windows 初学者**，详细说明如何在 Windows 系统上搭建 Moss 开发环境并运行首个示例。
> 阅读本文档前，建议先通读 [新手上路 — 从零到一笔通过验证的 swap](./getting-started.zh-CN.md) 了解 Moss 的基本概念。

## 0. 准备工作

在开始之前，需要在本机安装以下工具。

### 0.1 安装 Node.js（22 或更高版本）

Moss 要求 Node.js 22 或更新版本。

1. 访问 [nodejs.org](https://nodejs.org/) 下载页面，选择 **22.x LTS** 版本的 **Windows Installer (.msi)**。
2. 双击安装包，一路点击 **Next** 完成安装。
3. 安装完成后，打开 **PowerShell**（按 `Win + R`，输入 `powershell`，回车），验证安装：

```powershell
node --version
# 输出示例: v22.14.0

npm --version
# 输出示例: 11.16.0
```

>  提示：如果 `node` 命令找不到，请确认安装时勾选了"Add to PATH"，或重启 PowerShell 终端。

### 0.2 安装 Git

Moss 的源码通过 Git 管理，需要安装 Git 客户端。

1. 访问 [git-scm.com](https://git-scm.com/download/win) 下载 Windows 版本。
2. 运行安装程序，**重要选项建议**：
   - **Choosing the default editor**：保持默认（Vim）或选择你熟悉的编辑器
   - **Adjusting your PATH environment**：选择 **"Git from the command line and also from 3rd-party software"**
   - **Configuring the line ending conversions**：选择 **"Checkout Windows-style, commit Unix-style line endings"**（推荐设置，与 Moss 项目的 `.gitattributes` 兼容）
3. 安装完成后，在 PowerShell 中验证：

```powershell
git --version
# 输出示例: git version 2.47.0.windows.1
```

### 0.3 安装 pnpm 11

Moss 使用 pnpm 作为包管理器。推荐通过 npm 全局安装：

```powershell
npm install -g pnpm
```

如果遇到权限错误（`EPERM`），可以尝试以下方法之一：

**方法 A：以管理员身份运行 PowerShell**

1. 右键点击 **开始菜单** → **Windows PowerShell** → **更多** → **以管理员身份运行**
2. 在弹出的用户账户控制（UAC）窗口中点击 **是**
3. 重新执行安装命令

**方法 B：配置 npm 使用非系统目录**

```powershell
npm config set prefix "$env:USERPROFILE\npm-global"
npm install -g pnpm
# 然后将 "$env:USERPROFILE\npm-global" 添加到系统 PATH 环境变量中
```

安装完成后验证：

```powershell
pnpm --version
# 输出示例: 11.0.0
```

> **常见问题**：如果提示 `pnpm : 无法加载文件...因为在此系统上禁止运行脚本`，说明 PowerShell 执行策略限制了脚本运行。解决方法见"常见问题"章节。

### 0.4 （可选）配置代理

如果你所在的网络需要代理才能访问 GitHub 或 npm 源，请在 PowerShell 中设置：

```powershell
# 设置 HTTP 代理
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890

# 设置 npm 代理
npm config set proxy http://127.0.0.1:7890
npm config set https-proxy http://127.0.0.1:7890
```

请将 `http://127.0.0.1:7890` 替换为你的实际代理地址。

## 1. 克隆仓库

在 PowerShell 中执行：

```powershell
# 进入你希望存放代码的目录
cd C:\Users\你的用户名\Projects

# 克隆 Moss 仓库
git clone https://github.com/nishuzumi/moss.git

# 进入项目目录
cd moss
```

> **提示**：如果 clone 速度慢，可以尝试使用国内镜像源（如 `git clone https://gitclone.com/github.com/nishuzumi/moss.git`），或使用 0.4 节配置的代理。

## 2. 安装依赖

在项目根目录执行：

```powershell
pnpm install
```

> **已知问题**：
> - 如果在安装过程中遇到 **"The platform is not supported"** 警告，属于正常现象，不影响使用。
> - 如果报 **"No matching version found"** 错误，可尝试 `pnpm install --no-frozen-lockfile`。
> - 如果遇到 **"path too long"** 错误，可以通过以下方式启用 Windows 长路径支持：
>   1. 按 `Win + R`，输入 `gpedit.msc`（Windows 专业版/企业版）或直接修改注册表
>   2. 导航至 **计算机配置 → 管理模板 → 系统 → 文件系统**
>   3. 启用 **"启用 Win32 长路径"**
>   4. 或在 PowerShell（管理员）中执行：
>      ```powershell
>      New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
>      ```

## 3. 构建项目

安装完成后，首先构建所有包：

```powershell
pnpm build
```

> **注意**：由于 workspace 包之间通过 `dist` 目录中的构建产物解析类型声明，**必须先执行 `pnpm build`，再执行 `pnpm typecheck`**。如果跳过 build 直接运行 typecheck，会提示找不到模块的错误。

构建成功后，可以验证类型检查和代码风格：

```powershell
pnpm typecheck
pnpm lint
```

## 4. 运行离线测试

无需连接 Monad RPC 即可运行全部离线测试，这是确认开发环境配置正确的最佳方式：

```powershell
pnpm test:offline
```

> 所有测试通过意味着你的本地环境已准备就绪，可以开始开发和贡献了。

## 5. 运行示例流程

离线测试通过后，可以运行端到端示例，体验 `discover → load → action → simulate` 的完整流程。

> **注意**：示例需要连接 Monad 主网 RPC，但不需要私钥或已充值账户，因为 Moss 只构建和模拟未签名交易。

### 5.1 WMON wrap 示例

```powershell
pnpm --filter @themoss/example-simple-flow wrap
```

这个命令会：发现 WMON → 加载参数契约 → 构建 wrap Capability → 模拟执行 → 打印有序 Receipt。
最终输出的关键是 **零 Warning** 以及与请求一致的结构化 Receipt Outcome。

### 5.2 Kuru swap 示例

```powershell
pnpm --filter @themoss/example-simple-flow swap
```

这个命令会：查询 MON/USDC 报价 → 构建 swap Capability → 根据当前 Kuru 市场状态模拟执行。

## 6. 配置 MCP Server

构建完成后，可以将 Moss 的 MCP Server 添加到支持 MCP 的客户端（如 Claude Desktop、VS Code + Cline 等）。

### 6.1 确认 MCP Server 路径

构建成功后，MCP Server 的入口文件路径为：

```
<moss路径>\packages\mcp-server\dist\cli.js
```

例如，如果将 Moss 克隆到了 `C:\Users\YourName\Projects\moss`，则路径为：

```
C:\Users\YourName\Projects\moss\packages\mcp-server\dist\cli.js
```

### 6.2 配置 MCP 客户端

以 Claude Desktop 的 `claude_desktop_config.json` 为例（**Windows 路径**）：

该文件通常位于 `%APPDATA%\Claude\claude_desktop_config.json`。

```json
{
  "mcpServers": {
    "moss": {
      "command": "node",
      "args": [
        "C:\\Users\\YourName\\Projects\\moss\\packages\\mcp-server\\dist\\cli.js"
      ],
      "env": {
        "MOSS_RPC_URL": "https://rpc.monad.xyz"
      }
    }
  }
}
```

> **Windows 路径注意事项**：
> - 必须使用 **双反斜杠** `\\` 作为路径分隔符（JSON 转义要求）
> - 也可以使用 **正斜杠** `/`，Windows 系统同样支持，如 `"C:/Users/YourName/Projects/moss/packages/mcp-server/dist/cli.js"`
> - **不要**使用单反斜杠 `\`，`\c` 等会被 JSON 解析为转义字符

### 6.3 设置 `MOSS_RPC_URL` 环境变量（可选）

如果不在 MCP 配置中指定 `MOSS_RPC_URL`，也可以通过系统环境变量设置：

```powershell
# 临时设置（仅在当前 PowerShell 会话中有效）
$env:MOSS_RPC_URL = "https://rpc.monad.xyz"

# 永久设置（需要管理员权限）
[System.Environment]::SetEnvironmentVariable("MOSS_RPC_URL", "https://rpc.monad.xyz", "User")
```

你也可以自定义 RPC URL：

| 服务 | RPC URL |
|---|---|
| Monad 官方公共 RPC | `https://rpc.monad.xyz` |
| Monad 测试网 | `https://testnet-rpc.monad.xyz` |
| 本地 Anvil 分叉 | `http://localhost:8545` |

## 7. 常见问题与排错

### 7.1 `pnpm` 不是内部或外部命令

**原因**：pnpm 未正确安装，或 npm 全局安装目录未加入 PATH。

**解决方法**：

1. 确认 npm 全局安装目录：`npm config get prefix`
2. 在 PowerShell 中执行：`$env:Path += ";$(npm config get prefix)"`
3. 或者在 **系统环境变量** 的 `Path` 中添加该路径

### 7.2 PowerShell 执行策略限制脚本运行

**错误信息**：
```
无法加载文件 C:\Program Files\nodejs\pnpm.ps1，因为在此系统上禁止运行脚本。
```

**解决方法**：

```powershell
# 以管理员身份运行 PowerShell，然后执行
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

选择 `Y` 确认即可。此后即可正常执行 `pnpm` 命令。

### 7.3 `cp` 命令不存在

**原因**：Windows 的 PowerShell 或 cmd 中没有 Unix 风格的 `cp` 命令。

**解决方法**：使用 PowerShell 的 `Copy-Item`（或其别名 `copy`、`cp`）：

```powershell
# 复制 Protocol template（PowerShell）
Copy-Item -Recurse packages/protocols/_template packages/protocols/myprotocol

# 或者使用较短的写法
copy -Recurse packages/protocols/_template packages/protocols/myprotocol
```

也可以使用 **Git Bash**（安装了 Git 后自带的终端），它支持 Unix 命令。

### 7.4 Git 换行符问题

**现象**：`pnpm lint` 或 `git diff` 显示大量与缩进/空格相关的差异。

**原因**：Windows 使用 `CRLF` 换行符，而 Moss 项目使用 `LF`。

**解决方法**：

```powershell
# 确保 git 自动转换换行符
git config core.autocrlf true

# 如果已经 pull 了错误的换行符，可以修复
git rm --cached -r .
git reset --hard
```

### 7.5 构建失败：模块未找到

**现象**：`pnpm build` 失败，提示找不到某个 workspace 包的模块。

**可能原因**：包依赖尚未构建。

**解决方法**：pnpm 的 workspace 协议会自动处理构建顺序。如果仍有问题，可尝试：

```powershell
# 清理所有构建产物
pnpm clean

# 重新构建
pnpm build
```

### 7.6 长路径错误

在某些 Windows 10 旧版本上，pnpm 生成的 `node_modules` 嵌套目录可能超过 260 字符限制。解决方法见第 2 节。

## 8. 下一步

环境搭建完成后：

- 阅读完整教程：[新手上路 — 从零到一笔通过验证的 swap](./getting-started.zh-CN.md)
- 了解 MCP 工具契约：[MCP 工具契约](./mcp-tools.md)
- 开发新 Protocol：[Protocol 接入指南](./protocol-onboarding.md)
- 了解安全模型：[Agent 安全规则](./agent-skill.md)
- 阅读架构决策：[ADR 目录](./adr)

---

> 本文档的目标读者是 Windows 上的 Moss 初学者。如果你在配置过程中遇到了本文未覆盖的问题，欢迎在 [GitHub Issues](https://github.com/nishuzumi/moss/issues) 提交反馈。
