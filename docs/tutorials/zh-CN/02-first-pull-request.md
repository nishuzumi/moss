# 第一次提交 Pull Request 教程

本章以一次文档改动为例，完成从同步仓库到提交 PR 的完整流程。代码或 Protocol 改动使用同样流程，但需要更充分的测试和证据。

## 1. 理解 origin 和 upstream

如果 `Wea1her/moss` 是你自己的 fork，推荐配置：

- `origin`：你的 fork，用于推送分支；
- `upstream`：原项目仓库，用于同步最新 `main`。

查看当前远程：

```bash
git remote -v
```

需要时添加 upstream：

```bash
git remote add upstream https://github.com/nishuzumi/moss.git
git fetch upstream
```

如果你直接在 `Wea1her/moss` 协作且它就是目标仓库，可以只保留 `origin`。不要在不确认目标仓库的情况下推送。

## 2. 从最新 main 创建分支

先确保工作区干净：

```bash
git status
```

同步并创建分支：

```bash
git switch main
git pull --ff-only origin main
git switch -c docs/my-first-contribution
```

如果需要从 upstream 同步，则使用：

```bash
git switch main
git fetch upstream
git merge --ff-only upstream/main
git push origin main
git switch -c docs/my-first-contribution
```

分支名应简短表达目的，例如：

- `docs/add-mcp-guide`
- `fix/receipt-error-message`
- `feat/protocol-example`

## 3. 阅读贡献约束

开始修改前至少阅读：

- `AGENTS.md`：仓库工作约束；
- `CONTEXT.md`：Moss 领域词汇；
- `CONTRIBUTING.md`：开发与 PR 要求；
- 与改动相关的 `docs/adr/`；
- Protocol 改动还要阅读 `docs/protocol-onboarding.md`。

不要让文档、示例、测试和当前 API 互相矛盾。

## 4. 做一个小而完整的改动

首次贡献推荐选择：

- 修复错字或失效链接；
- 补充一个可运行示例；
- 改善错误信息；
- 为现有行为补测试；
- 整理 FAQ 或文档导航。

随时查看改动：

```bash
git status --short
git diff
```

不要顺便格式化无关文件，也不要提交本地配置、私钥、构建缓存或临时输出。

## 5. 运行验证

从仓库根目录按顺序运行：

```bash
pnpm build
pnpm typecheck
pnpm lint
MOSS_SKIP_E2E=1 pnpm test
```

准备正式 PR 时，网络条件允许应再运行完整测试：

```bash
pnpm test
```

Protocol 改动还需要 Monad 主网 happy path 的零 Warning 模拟证据。

文档改动至少检查：

```bash
git diff --check
```

确认命令、路径、类型名和链接都来自当前仓库实现。

## 6. 判断是否需要 changeset

用户可见 package 行为或发布内容发生变化时，运行：

```bash
pnpm changeset
```

选择受影响 package、版本级别并填写面向使用者的说明。纯仓库内部文档、CI 或不参与发布的示例通常不需要 changeset；不确定时在 PR 中说明判断依据。

## 7. 创建提交

暂存前再确认文件范围：

```bash
git status --short
git diff --check
git add docs/path/to/file.md
git diff --cached
```

推荐使用 Conventional Commit 风格。类型前缀保持英文，后面的说明可以写中文：

```bash
git commit -m "docs: 新增 Moss 新手教程"
```

常见前缀：

- `docs:` 文档；
- `fix:` 修复；
- `feat:` 新功能或新 Protocol 能力；
- `test:` 测试；
- `refactor:` 不改变外部行为的重构；
- `chore:` 工具或维护工作。

一个提交应表达一个完整目的。不要把互不相关的修改塞进同一个 commit。

## 8. 推送分支

```bash
git push -u origin docs/my-first-contribution
```

如果网络环境需要本地代理，可只为当前命令设置 Git 代理，例如：

```bash
git -c http.proxy=http://127.0.0.1:8443 -c https.proxy=http://127.0.0.1:8443 push -u origin docs/my-first-contribution
```

代理协议和地址必须与你本机代理实际配置一致，不要把个人代理配置提交到仓库。

## 9. 填写 Pull Request

打开 GitHub 创建 PR，并按 `.github/PULL_REQUEST_TEMPLATE.md` 填写：

1. **What and why**：改了什么，为什么需要；
2. **Type of change**：勾选改动类型；
3. **Framework and package impact**：说明公共类型、package 边界、Capability tree、Change/Receipt 行为，或填写 `none`；
4. **Verification**：列出真实运行过的命令；
5. **Protocol changes**：非 Protocol PR 标记 N/A；
6. **Evidence**：附测试输出、Receipt Outcome、截图或复现步骤。

PR 标题也可以采用同样格式：

```text
docs: 新增 Moss 新手教程
```

## 10. 处理 CI 和 Review

CI 会检查无 Git submodule、安装依赖、lint、build、typecheck 和 test。

收到 review 后：

1. 先理解问题和相关架构约束；
2. 在原分支继续修改；
3. 重新运行受影响检查；
4. 提交并 push，PR 会自动更新；
5. 用证据回复已处理内容。

不要为了让 CI 变绿而删除测试、跳过 Warning、放宽 Receipt coverage 或绕过 ABI 来源规则。

## 11. 安全问题不要发公开 PR

如果发现可能影响用户资金、私钥、模拟证据或 Receipt 验证的漏洞，请按照 `SECURITY.md` 使用 GitHub Private Vulnerability Reporting。不要先开公开 Issue 或 PR 暴露漏洞细节。

## 提交前清单

- [ ] 分支来自最新 `main`；
- [ ] 只包含本次任务相关文件；
- [ ] 文档和示例与当前 API 一致；
- [ ] `build → typecheck → lint → test` 已按顺序运行；
- [ ] 需要发布的用户可见 package 变更已添加 changeset；
- [ ] 没有私钥、凭证、个人配置或临时文件；
- [ ] commit 和 PR 标题清楚表达目的；
- [ ] PR 模板和验证证据填写完整。
