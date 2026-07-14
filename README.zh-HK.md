# Moss

[English](./README.md) | [中文](./README.zh-CN.md) | **中文(繁體)**

> 中文文檔可能會滞後過英文版；以英文版為准。

Moss 將 [Monad](https://monad.xyz) 上複雜既 DApp/協議交互抽象為 Agent 可以調用既统一能力 —— `discover → load → action → simulate` —— 由系统而唔係 Agent 負責組裝正確既交易。

- **Agent 唔再DIY calldata。** 唔掂 ABI、合約地址、multicall 掃尾、decimals 換算 —— 能力接受人類可讀既參數(`parameter`)，返回組裝完畢既未簽名交易。
- **每一筆寫操作係去到簽名方之前都會被驗證。** Plan 清楚聲明允許移動既資產（`expects`）；模擬係真實鏈上狀態回放它，任何冇聲明既差異都會告警。
- **Moss 永不簽名、永不發送。** 它只構建和驗證。私鑰就留係錢包入面，最終決定權就留係用戶手裡。

> [!WARNING]
> **Moss 係 Alpha 測試版軟件，僅供測試同評估。** 未經安全審計；API、Plan 格式、包既結構都可能會隨時變動，不作兼容承諾。
>
> 使用前請理解風險模型：模擬係一個安全網，唔係保證——模擬結果反映既係模擬個一刻的鏈上狀態，從模擬到簽名之間，價格、流動性、合約狀態都可能會有變化。Moss 永不簽名、永不發送交易，但**你**簽出去既每一筆都係由你自己負責：簽名前務必係錢包入面逐筆核對交易內容，測試期間只用小額資金，零警告的模擬結果絕不等於執行结果既承諾。本軟件按"現狀"提供，不含任何形式既擔保（[MIT](./LICENSE)）。安全邊間同漏洞報告渠道係 [SECURITY.md](./SECURITY.md)。

## 核心調用流

```
discover(verb?, category?)   → 跨協發現能力
load(coordinates)            → intent、参數定義、風險標簽(Tags)
action(protocol, method,     → Query：直接返回數據
       account, params)      → Capability：返回未簽名既交易 Plan + 量化期望
simulate(plans[])            → 實際 effects + warnings（聲明 vs 實際既對賬）
```

兩條安全規則，分別係兩處強制執行：

1. **Effects 對賬**（服務器側，機械判定）：模擬提取實際發生既一切 —— 資產流出/流入、授權、收款方，包括不發 Transfer 事件的原生 MON 流和 wrapped 代币鑄毀 —— 任何 Plan 未聲明既差異都產生 warning。有 warning 即停。
2. **意圖對齊**（Agent 側）：把 effects 摘要和用户的原話對比。只有 Agent 拿着用户的原始意圖。

`simulate` 接受 Plan 數組並在計劃之間延續狀態 —— Plan B 可以花掉只在 Plan A 模擬結果入面先存在既代幣。呢個係多步流程（claim → swap → supply）的地基。

## 當前狀態

Alpha。Monad 主網（chain id 143）。已支持協議：WMON（wrap/unwrap/balanceOf）、erc20 通用協議（任意代幣轉帳/餘額/授權查詢，含原生 MON）、erc721 通用協議（任意 NFT 轉賬/歸屬查詢）、Kuru（市價單 swap、報價、市場列表）。

設計上暫不支持：Permit 類簽名流、跨鏈橋、閃電貨原子組合。詳見 [SECURITY.md](./SECURITY.md)。

## 快速開始

需要 Node ≥ 22 与 pnpm。以下全部**零資金、零私鑰**可跑 —— 模擬係免費既。

```bash
git clone https://github.com/nishuzumi/moss && cd moss
pnpm install
pnpm build

# 標準調用流： discover → load → action → simulate
pnpm --filter @themoss/example-simple-flow wrap

# 跨 Plan 組合（真實訂單簿）：MON → USDC → MON
pnpm --filter @themoss/example-simple-flow swap
```

想睇一筆交易真正落鏈？[examples/agent-swap](./examples/agent-swap) 用一個 Claude Code 子 agent 走完 MCP 工具全流程，並係模擬零警告之後先簽名發送——執行在**本地 anvil fork 的 Monad 主網**上：真實訂單簿狀態、零真實資金、零配置。

新手建議從[新手上路指南](./docs/getting-started.zh-CN.md)開始：先整體跑一次，再逐層拆開 discover / load / action / simulate / observations，最后引導你寫自己既適配器。MCP 接入与庫用法的完整示例見英文 [README](./README.md)。

## 文檔導航

| 文档 | 内容 |
| --- | --- |
| [新手上路指南](./docs/getting-started.zh-CN.md)（[English](./docs/getting-started.md)） | 逐層拆解成個系統：先跑通，再打開每個階段 |
| [MCP 工具參考](./docs/mcp-tools.md)（英文） | 四个工具既契約、Plan 結構、warning 碼表 |
| [協議接入指南](./docs/protocol-onboarding.md)（英文） | 從 ABI 到回執，編寫並提交一个適配器 |
| [Agent 使用守則](./docs/agent-skill.md)（英文） | Agent 必須遵守的規則：強制模擬、見警告即刻停、意圖對齊 |
| [Agent 實盤示例](./examples/agent-swap/README.md)（英文） | Claude Code 子 agent 在本地 Monad 主網 fork 上真實成交 |
| [設計決策記錄 ADR](./docs/adr/)（英文） | 每個架構決定及其取舍 |
| [詞匯表](./CONTEXT.md)（英文） | 項目統一語言 |

## 參與貢獻

從參考實現 [`packages/system/src/wmon.ts`](./packages/system/src/wmon.ts) 複製起步（提升注釋密度），按照 [docs/protocol-onboarding.md](./docs/protocol-onboarding.md) 完成接入；流程規範見 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

[MIT](./LICENSE)
