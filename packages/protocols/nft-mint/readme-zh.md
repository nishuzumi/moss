# @themoss/protocol-nft-mint

这是一个面向 Monad 简单 ERC-721 公开 mint 合约的 Moss Protocol Adapter。

本包暴露一个 NFT 能力：

- Protocol：`public-mint-721`
- Method：`mint`
- Verb：`mint`
- Category：`nft`

它适用于同时暴露以下 payable mint 接口和价格查询的 NFT collection：

```solidity
function mint(address to, string memory uri) external payable;
function mintPrice() external view returns (uint256);
```

## 支持范围

这个 adapter 会构建一个未签名 Plan：

- 调用 collection 的 `mint(address to, string uri)`，并把调用者地址作为 `to`
- 读取 `mintPrice()`，并将该 MON 价格作为交易 value
- 在 `expects.out` 中声明账户最多会支出多少 MON
- 在 `expects.nfts` 中声明预期收到 1 个 ERC-721 NFT

collection 地址是运行时参数。这样可以支持多个简单公开 mint 合约，但使用前必须先确认目标合约确实支持这个 selector 和 mint 流程。

## 参数

| 参数 | 含义 |
| --- | --- |
| `collection` | ERC-721 collection 合约地址。 |
| `tokenUri` | 传给 `mint(address,string)` 的 metadata URI。 |

示例 action 参数：

```json
{
  "collection": "0x642BD034244cEEE44B3d371Fb7e6EB73EE921909",
  "tokenUri": "ipfs://example-token"
}
```

## Monad Testnet Demo Collection

已经使用 `examples/simple-nft-mint` 在 Monad testnet 部署了一个 demo collection：

```text
0x642BD034244cEEE44B3d371Fb7e6EB73EE921909
```

在 `https://testnet-rpc.monad.xyz` 上确认到的只读结果：

```text
name: Moss Demo Mint NFT
symbol: MOSSDEMO
mintPrice: 10000000000000000 wei (0.01 MON)
```

可以直接用它运行 simple mint example：

```bash
MOSS_COLLECTION=0x642BD034244cEEE44B3d371Fb7e6EB73EE921909 \
MOSS_TOKEN_URI=ipfs://example-token \
MOSS_RPC_URL=https://testnet-rpc.monad.xyz \
pnpm --filter @themoss/example-simple-nft-mint mint:testnet
```

## 安全模型

Plan 会声明：

- `risk: ["fundOut"]`
- `expects.out`：最多支出链上 `mintPrice()` 返回的原生 MON
- `expects.nfts`：从传入 collection 收到 1 个 NFT

在把任何交易展示给钱包签名前，必须先运行 simulation，并要求 warnings 为空。mint 关闭、价格错误、白名单限制或 mint 签名不兼容等问题，也应该在 simulation 中暴露。

当前 Moss 的 observation（`@Event`）绑定静态合约 key。由于这个 adapter 使用用户传入的动态 collection 地址，暂时不声明 `@Event` receipt；安全检查依赖量化的 `expects` 声明和 simulation reconciliation。

## 测试

离线测试覆盖 discover、load 输出和 Plan 构建：

```bash
pnpm --filter @themoss/protocol-nft-mint test
pnpm --filter @themoss/protocol-nft-mint typecheck
```

live e2e simulation 可以使用上面的 demo collection。
