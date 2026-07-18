# @themoss/protocol-uniswap-v4

Monad 上的 Uniswap v4 适配器 — 通过 PoolManager 进行单跳代币兑换。

## 概述

本包实现了 Uniswap v4 在 Monad 主网（链 ID 143）上的自描述 `@Protocol` 适配器。
它通过 PoolManager 合约提供代币兑换功能，并通过 V4Quoter 合约提供价格报价。

适配器使用 PoolManager 的 `unlock(callback)` 模式来执行单个交易，封装完整的兑换流程：
`settle/sync` → `swap` → `take`。

## 合约

| 合约 | 地址 | 来源 |
|------|------|------|
| PoolManager | `0x188d586dcf52439676ca21a244753fa19f9ea8e` | [Uniswap/v4-core@1.0.2](https://github.com/Uniswap/v4-core)，通过 npm tarball 引入 |
| V4Quoter | `0xa222dd357a9076d1091ed6aa2e16c9742dd26891` | [Uniswap/v4-periphery@1.0.3](https://github.com/Uniswap/v4-periphery)，通过 npm tarball 引入 |

地址已在 Monad 主网（链 ID 143）验证。合约不可升级。

完整地址和来源记录：[Uniswap 官方部署](https://github.com/Uniswap/docs/blob/main/content/deployments.md)。

## 能力（Capabilities）

### `swap`

通过 Uniswap v4 池将固定数量的代币兑换为另一种代币（精确输入单跳兑换）。

**参数：**

| 名称 | 类型 | 描述 |
|------|------|------|
| `tokenIn` | `TokenReference` | 提供的代币（ERC20 地址或 `"native"` 表示 MON）。 |
| `tokenOut` | `TokenReference` | 请求的代币。 |
| `amountIn` | `PositiveDecimalString` | 要兑换的 `tokenIn` 数量（显示单位）。 |
| `slippageBps` | `BasisPoints` | 允许的最大不利价格变动（整数基点；1 基点 = 0.01%）。 |
| `hookData` | `TokenReference`（hex） | 传递给池钩子的任意字节；默认为 `0x`。 |

**流程：**

1. 如果 `tokenIn` 是 ERC20：调用 `erc20.approve(poolManager, amountIn)`（嵌套能力）。
2. 如果 `tokenIn` 是原生 MON：通过 `settle()` 可支付函数调用 `poolManager.sync([])` 并附带 `{value: amountIn}`。
3. 调用 `poolManager.unlock(callback)` — 单个直接 TransactionNode。
   回调编码：`settle()`/`sync(tokenOut)` → `swap(poolKey, params, hookData)` → `take(tokenOut, recipient, minAmountOut)`。
4. 通过 PoolManager 的 `take()` 函数，使用零地址接收者直接处理原生 MON 输出。

**风险标签：** `fundOut`、`approval`、`priceImpact`

## 查询（Queries）

### `quote`

通过 V4Quoter 获取精确输入兑换的报价。

**参数：**

| 名称 | 类型 | 描述 |
|------|------|------|
| `tokenIn` | `TokenReference` | 输入代币地址或 `"native"`。 |
| `tokenOut` | `TokenReference` | 输出代币地址或 `"native"`。 |
| `amountIn` | `PositiveDecimalString` | 要兑换的 `tokenIn` 数量（显示单位）。 |

**返回 `QuoteResult`：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `amountOut` | `string` | 报价输出数量（显示单位）。 |
| `gasEstimate` | `string` | 预估 gas 成本。 |
| `amountIn` | `string?` | 输入数量（显示单位）。 |
| `estimatedAmountOut` | `string?` | 预估输出数量。 |
| `minimumAmountOut` | `string?` | 2% 滑点缓冲后的最低输出。 |

## 收据（Receipt）

`swapReceipt` 解析器从模拟跟踪中解码 PoolManager 事件：

- **PoolManager.Swap** — 通过 `decodeAbiParameters` 解码（自定义事件布局不在 4byte 注册表中）。提取 `amount0`、`amount1`、`fee`，并推导 `zeroForOne` 方向。
- **PoolManager.Transfer** — 解码到/从 PoolManager 的代币流动，以推导 `tokenIn` 和 `tokenOut`。
- **ERC20 nativeTransfer** — 委托给 `erc20.changesReceipt` 处理价值流动。
- **ERC20 Transfer/Approval** — 委托给 `erc20.changesReceipt` 处理非 PoolManager 事件。

返回包含操作、协议、代币引用、数量、费用等级和方向的 `SwapOutcome`。

## ABI 来源证明

所有 ABI 遵循 ADR 0007 引入的来源规范：

| ABI | 来源 | Tarball SHA256 |
|-----|------|----------------|
| PoolManagerAbi | `@uniswap/v4-core@1.0.2` foundry 产物 | `033d148fac5995874b83621afe35be94a28eb00bfd59bd0a8c9c030bea6a1aef` |
| V4QuoterAbi | `@uniswap/v4-periphery@1.0.3` foundry 产物 | `3abeef0bd9e6d895727e0bec457db5d600fbb5debd4d413a95577cca938adff0` |
| UniversalRouterAbi | `@uniswap/universal-router@2.1.0` | `9cdf0ead2bc8993604a4e6e2e8a1fd6f6f8621a5026cb63ef14888c952b42aa5` |

通过 `pnpm gen:abis` 从 npm tarball 生成。提交的上游元数据见 `abis-src/*.json`。

## 风险

- **价格影响（priceImpact）**：在低流动性池上滑点可能导致重大损失。使用 `slippageBps` 限制不利变动。
- **滑点（slippage）**：适配器从链上报价计算 `minAmountOut`；请确保滑点容忍度符合您的风险偏好。
- **钩子不确定性（hook uncertainty）**：池钩子可能不可预测地修改兑换行为。使用前应验证钩子地址。
- **报价参考性**：`quote` 查询仅为参考 — 实际兑换执行会针对当前状态重新发现。

## 费用等级

标准池费用等级（以十万分之一基点为单位，即 1/10,000,000）：

| 费用值 | 百分比 |
|--------|--------|
| 100 | 0.01% |
| 500 | 0.05% |
| 3000 | 0.3%（默认） |
| 10000 | 1% |

动态费用池使用费用值 `0x800000`（最高位设置）。
