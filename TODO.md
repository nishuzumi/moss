# Moss 第一阶段 TODO（7月6日 – 7月12日）

> 决策依据：CONTEXT.md + docs/adr/0001–0004。公开产物（README/docs/代码注释）为英文，本文件为内部工作清单。
> 状态：**M0–M5 全部完成**（7月7日凌晨），全链路已在 Monad 主网真实验证。

## 硬边界：7月9日 前全部完成 ✅

### M0 仓库脚手架 ✅
- [x] git init + pnpm monorepo：`packages/core`、`packages/protocols`、`packages/mcp-server`、`examples/`
- [x] LICENSE（MIT）
- [x] tsconfig（strict + 标准装饰器）、biome、vitest、tsup、changesets
- [x] CI（GitHub Actions）：lint / build / typecheck / test（build 先于 typecheck：包间类型经 dist 解析）
- [x] Issue 模板 ×3（bug / feature / protocol_onboarding）+ PR 模板

### M1 core ✅
- [x] `SemanticType<T>` + `DecodeCtx`；内置：`address`、`token`、`tokenAmount`（contextual）、`nativeAmount`、`fixedAmount`、`slippageBps`
- [x] 参数按声明顺序 decode，contextual 依赖在前（onboarding 文档已写明）
- [x] `@Protocol` / `@Capability` / `@Query`（stage-3 装饰器；元数据为**符号标记属性**而非 Symbol.metadata —— 见 ADR 0001 修订）
- [x] `Handle<typeof Abi>`：三面 —— 本地编码（含 payable `value`）/ `.read` 只读 / `.call` 写函数 eth_call 模拟（CLOB 报价用）
- [x] 注册校验：contracts 地址按链核对、capability 必须有 risk 标签
- [x] **Token 可复用类**：decimals 缩放、approve/transfer 步骤构建、原生/ERC-20 分叉、TokenSource 缓存（应用户要求重构）
- [x] **主流 Token 目录**（ADR 0005）：MON/WMON/USDC/AUSD 全链上验证；符号只经目录解析（防同名假币）；adapter 地址从目录派生；编写侧 API 无 chainId（单链决策，`contracts.addr` 为单地址）
- [x] Plan 模型 + `plan()`；expects 双形状（可替代物/NFT）；approve 步骤期望自动生成；planHash
- [x] Registry：verb/category 闭集 + tags；discover/load/action

### M2 Simulator ✅
- [x] `Simulator` 接口 + `debug_traceCall` 双 tracer 实现（callTracer+withLog / prestateTracer+diffMode）
- [x] diff → stateOverrides 合并（balance/nonce/storage/code + slot 清零）
- [x] effects 提取：ERC-20/721 Transfer、ERC-1155 TransferSingle/TransferBatch、Approval、ApprovalForAll、**原生 MON 流（调用帧 value）**、**WETH9 Deposit/Withdrawal（wrapped 铸毁不发 Transfer）**
- [x] reconciliation：只告警未声明差异；「已声明只出不进」合法
- [x] 显式 gas；`eth_estimateGas`（带 override 第三参，拒绝则 null）
- [x] 无 debug 端点明确报错 + 推荐列表
- [x] **账户预注资**：Monad 的 debug_traceCall 强制校验 sender 余额（实测发现），模拟器按 eth_simulateV1 validation-off 语义预注入余额
- [x] e2e 打真实主网：native 转账 / 篡改检测 / **wrap→unwrap 链式** / **Kuru MON→USDC→MON 跨 Plan 往返** 全部零警告通过

### M3 MCP server ✅
- [x] 官方 SDK + stdio + `moss-mcp` bin；四工具 zod schema；工具描述内嵌安全规则
- [x] `action` 返回自包含 Plan 血包；`account` 在 MCP 层标准化
- [x] `simulate` 吃 `Plan[]`（跨协议组合）→ 重算 planHash → 逐 Plan effects+warnings+gas + 顶层 ok/guidance
- [x] InMemoryTransport 测试 + 经 MCP JSON 边界的主网 e2e

### M4 协议 adapters ✅
- [x] **WMON**（参考实现，注释密度拉满）：wrap/unwrap/balanceOf；主网地址 `0x3bd359…433A` 链上验证
- [x] **Kuru 调研**（后台 agent，全部结论链上验证）：Router `0xd651…5CC`、anyToAnySwap、市价单 eth_call 报价法、原生 MON=address(0)、精度单位体系
- [x] **Kuru**：swap capability（verb=swap, tags=clob）+ quote/markets Query；目录市场首用时链上校验防腐
- [x] 协议文档以文件头长注释承载（背景/场景/参数/风险）

### M5 e2e example + 文档 ✅
- [x] `examples/simple-flow`：wmon-wrap.ts（标准四步流）+ kuru-swap.ts（跨 Plan 组合），实测主网跑通
- [x] README.md（英文 8 要点）+ README.zh-CN.md 互链
- [x] CONTRIBUTING.md（含协议接入 DoD）
- [x] docs/protocol-onboarding.md、docs/mcp-tools.md、docs/agent-skill.md（Skill 层规则）、docs/README.md 导航
- [x] SECURITY.md（模型、v1 边界：Permit/跨链桥/闪电贷、已知注意事项、私密披露通道）

## 分包架构重构（7月7日，应用户提案 —— ADR 0006/0007）✅
- [x] **一协议一包**：`packages/protocols/<name>` → `@themoss/protocol-<name>`；包间组合走显式依赖
- [x] **万物皆 manifest**：`defineProtocolPackage` + `registry.use()`；Registry 构造为空、无 import 副作用；core 自身默认物 = `systemManifest`（系统 token 表 + WMON adapter 迁入 core）
- [x] **Token 表 Registry 作用域化**：协议包 `tokens.ts` 注册自有 token；撞名硬报错（同 symbol 异地址 = 拒绝整个 manifest）、幂等去重、大小写不敏感
- [x] **@themoss/erc 标准层**：contracts/（foundry）→ `gen:abis`（forge 真编译，solc 0.8.28，origin 自动盖章）→ 通用 `erc20` 协议（transfer/balanceOf/allowance，动态地址模式：`contracts:{}` + 注入 runtime）—— 填上 `transfer` verb 真空
- [x] **ABI origin 三级制**（ADR 0007）：compiled > explorer > vendored；每包 `src/abis/` + 溯源头；kuru = vendored（kuru-sdk@0.0.95 + 链上行为验证）
- [x] ~~**@themoss/protocols 元包**：官方全家桶 = 聚合 manifest~~（7月8日撤销：整包只有一个数组，mcp-server 自己就是天然组装点 —— 见下方"接口层与组装收敛"）
- [x] **_template 自校验模板**：真实 workspace 包（private，CI 常规 build/test），贡献 = `cp -r` + README 清单
- [x] 本地 `.npmrc`（gitignored）：store/cache 收进仓库目录，沙箱裸 `pnpm` 直跑

## 三层地基重构（7月7日，多轮 grilling 收敛 —— ADR 0006 重写）✅
- [x] **core 纯机器化**：零链数据、零 ABI、零默认值；`createRuntime` 参数必填；未知地址经注入的 `tokenFallback` 解析；core 测试全 fixture 化（不认识任何真实链数据）
- [x] **erc = 标准层**：编译 ABI（IERC20 + 新增 IWETH9）+ 无地址通用行为 —— erc20 协议、`approveStep`（approve 编码归 ERC 标准所有）、`erc20MetadataSource`
- [x] **system = Monad 实例层（新包）**：MONAD_TOKENS、chain 常量 + `monadRuntime()`、Wmon（接口来自 erc 的编译 WETH9，地址是 Monad 数据）、systemManifest
- [x] 判据一句话：**写死地址的东西住 system 或协议包，绝不更低**；kuru 显式依赖 erc+system（组合即依赖的示范）
- [x] CLAUDE.md 立规：commit 前的中间产物不做任何兼容（删除而非弃用）；文档与代码同变更同步

## 模拟证据双面制（7月7–8日，grilling 收敛 —— ADR 0008）✅
- [x] 审计面加固：5 个事件 topic 从签名**推导**（手贴哈希退役，规范哈希降级为测试钉子）；ApprovalForAll 首个覆盖；模拟器 gas/预注资参数化（SimulatorOptions）；mcp 版本号读 package.json
- [x] **@Event 观察面**：多事件订阅（合约键/事件名自 ABI 补全）+ dealer 预处理（方法名类型化补全 | 函数引用）+ ObserveCtx 自动注入 + 结果意图模板（渲染时严格校验）+ `@Event<This>` 强制类型参数
- [x] **confirms 回执闭环**：capability 声明链上回执，缺失即 CONFIRMATION_MISSING；confirms 入 planHash；红线 —— 观察面只收紧、永不放行
- [x] Kuru 示范落地并主网 e2e 验证（KuruRouterSwap + N×Trade 聚合 → 渲染回执）

## 接口层与组装收敛（7月8日，grilling 收敛 —— ADR 0009 + ADR 0006 修订）✅
- [x] **@themoss/simulator 独立包**：验证引擎（双 tracer 模拟 + effects 提取 + expects 对账 + 观察接线）从 core 拆出，仅依赖 core；core 回归纯 authoring 基座（协议包 e2e、钱包嵌入、mcp-server 三类消费者共用）
- [x] **erc = 接口层定性**（ADR 0009）：只有标准接口——编译 ABI + 地址可为调用参数的通用适配器（erc20），零写死地址；单实例标准（WETH9→WMON）的实例适配器住 system
- [x] **跨协议组合两种货币**：ABI+地址（Handle）与 step builder（approveStep）；协议类只进 `registry.use()`——"协议注入协议"评估后否决（脱离 registry 即退化为 Handle；Plan 是终端产物不可缝合）；"manifest 期实例化"（ERC-4626 场景）记为 deferred
- [x] **命名链路矫正**：`ERC20Abi`/`WETH9Abi`（接口数据，Abi 后缀承担区分职责）、`ERC20`（通用适配器类）、`WMON`（实例适配器类，原 Wmon）；wagmi 生成名不手改，index.ts 边界起别名
- [x] **protocols-all 聚合包删除**：mcp-server 直接依赖各协议包并在 server.ts 一个数组里组装目录；examples 同构；上架协议 = 一行依赖 + 一行数组
- [x] 词汇表新增 Step builder / Plan 补"终端产物"；CLAUDE.md 分层线与组合规则同步

## erc721 接入（7月8日，应用户提案）✅
- [x] **IERC721.sol 编译入 erc**（forge + wagmi，`ERC721Abi`）；通用 `erc721` 协议：transfer（safeTransferFrom + expects.nfts）+ ownerOf/balanceOf Query —— `nft` category 首个填充者，transfer verb 覆盖 NFT
- [x] **core 新增 `ActionCtx`**：capability/query 方法第二参数注入 `{account}`（ERC-721 需要 caller 进 calldata 的通用机制）；语义类型词汇表新增 `uint`（tokenId）
- [x] **e2e 设计**：以链上真实持有人作为 account 模拟转账（零私钥依旧成立）；测试数据 = Uniswap v4 Positions NFT（双重验证：Uniswap 官方 deployments 记录 chain 143 + 链上 ERC-165/name/symbol 核对），主网零警告通过，effects.nftsOut 精确对账
- [x] 附带收获：calldata 路径让 viem 的 EIP-55 校验和检查生效——错误校验和的 account 现在大声失败

## 双面制遗留（下轮优先）
- [ ] **余额差审计层**：候选 token 的前后态 balanceOf（override eth_call），资产流完备性与事件词汇解耦；WETH9 特判退役（ADR 0008 已记录设计）
- [x] onboarding「声明事件」章节（§4）+ _template 真实 @Event（Deposited 事件 + confirms，CI 保真）+ mcp-tools 补 observations/CONFIRMATION_MISSING/confirms 字段 + agent-skill 补「叙事 vs 法律」规则（7月8日）
- [x] ERC-1155 接口层：编译 ABI + 通用 transfer/balanceOf；TransferSingle/Batch 进入审计面并按 token ID 与逐项数量对账（7月14日）

## 开源发布准备
- [x] 推送 GitHub 仓库（github.com/nishuzumi/moss，首 commit `c2e14f0`，CI #1 全绿含主网 e2e）
- [x] CODE_OF_CONDUCT.md（Contributor Covenant 2.1）
- [x] docs/getting-started.md 新手引导：逐层揭示 discover → load → action → simulate → observations → MCP → 写适配器，每步附 Go deeper 指引
- [x] 中文 quickstart：docs/getting-started.zh-CN.md 与英文版逐节对照（7月8日）
- [ ] 仓库描述 + topics（GitHub 网页设置）
- [x] changesets 首次出 CHANGELOG（7月11日）：六包 linked 联动 0.1.0，各包 CHANGELOG.md 落地
- [x] 第一批 feature issue（7月8日，#5–#15）：8 个协议适配器（Uniswap v4 / PancakeSwap / Clober / Aave v3 / Morpho / Euler v2 / Pendle / FastLane shMONAD，均来自 app.monad.xyz 首页生态）+ 2 个接口层 ERC（4626 触发 ADR 0009 deferred 设计、1155 含审计面词汇）+ 1 个永续 verb/category 设计讨论；label 体系：adapter / interface-layer / 类目（dex/lending/staking/yield）/ difficulty:starter-intermediate-advanced / needs-design
- [x] npm 首发（7月11日）：`@themoss` org 注册，六包 0.1.0 发布 + tag 推送
- [x] **examples/agent-swap 实盘示例**（7月10日）：Claude Code 子 agent（`.claude/agents/moss-trader.md` + 根 `.mcp.json`，零手工配置）在 Monad Foundry anvil 本地主网 fork 上走完 discover→action→simulate→钱包签名→落链，headless 实跑验收；调研结论：contract.dev 等托管 fork 不支持 geth tracer（simulate 跑不了），monad-anvil 全套支持且 chainId=143

## 已插旗（工程约束与后续事项）
- **vitest 固定 3.x**：vite 8 的 oxc 不降级 stage-3 装饰器、V8 也未原生支持（实测）；oxc 支持后再升 4.x（ADR 0001 已记录）
- **TypeScript 固定 5.9.x**：tsup 的 dts 构建与 TS 6.0 不兼容（baseUrl 废弃报错）
- Monad `debug_traceCall` 强制 sender 余额校验 → 模拟器预注资（与 eth_simulateV1 validation-off 对齐）
- `rpc3.monad.xyz` 不开 debug 命名空间，官方入口配置不一致 —— 知会 infra 团队
- trace 返回的 `gasUsed` 疑似为 gas limit —— 已绕行 `eth_estimateGas`，后续与 client 团队确认
- 代理环境（含本沙箱）：Node fetch 需 `NODE_USE_ENV_PROXY=1`；tsx CLI 的 IPC 在沙箱受限时用 `node --import tsx`
- anvil fork 第二后端（v2）；HTTP transport（v2）；Kuru 多跳/动态市场发现（v2）；多链支持（v2：contracts.addr 恢复按链映射、Token 目录分链 —— ADR 0005 记录了单链决策）
- 发布前把个人仓库迁入官方 org（GitHub 自动 redirect）
