# Simple Wallet Protocol Adapter

一个用于 Moss AI Agent 的简单钱包协议 Adapter。

该 Adapter 为 Moss 提供基础钱包交互能力，使 AI Agent 可以获取钱包信息并执行简单的钱包查询操作。

## 功能介绍

Simple Wallet Adapter 为 Moss 提供基础钱包能力：

- 获取钱包地址
- 查询钱包余额

## 安装依赖

在项目根目录运行：

```bash
pnpm install
```

## 运行测试

执行测试命令：

```bash
pnpm test
```

或者针对当前 Adapter 运行：

```bash
pnpm --filter @themoss/protocol-simple-wallet test
```

## 使用示例

```ts
import { SimpleWalletProtocol } from "@themoss/protocol-simple-wallet";

const wallet = new SimpleWalletProtocol({
  address: "0x123456789abcdef",
});

const address = await wallet.getAddress();

console.log(address);
```

## API 说明

| 方法 | 功能 |
| --- | --- |
| `getAddress()` | 获取钱包地址 |
| `getBalance()` | 查询钱包余额 |

## 测试内容

当前测试覆盖：

- Protocol 注册检查
- Adapter 实例创建
- 钱包交易构建流程

## 项目结构

```
protocols/
└── simple-wallet/
    ├── src/
    │   └── index.ts
    ├── test/
    │   └── adapter.test.ts
    └── README.md
```

## 贡献说明

该 Adapter 遵循 Moss Protocol Adapter 扩展规范，可以作为开发新的钱包协议能力的基础模板。

欢迎基于此 Adapter 扩展更多钱包功能，例如：

- 钱包交易发送
- Token 余额查询
- 链上资产管理
- 多链钱包支持