# Simple NFT Mint

[English](./README.md)

这个示例会先把一个 OpenZeppelin ERC-721 demo collection 部署到 Monad
testnet，然后用 Moss NFT mint adapter 跑完整流程：

```text
deploy contract → discover → load → mintPrice → action → simulate
```

Demo 合约是 [DemoMintPriceNFT.sol](./contracts/DemoMintPriceNFT.sol)。它继承
OpenZeppelin `ERC721URIStorage`，并暴露 Moss adapter 需要的接口：

```solidity
function mintPrice() external view returns (uint256);
function mint(address to, string memory uri) external payable returns (uint256 tokenId);
```

## 环境准备

```bash
pnpm install
cp examples/simple-nft-mint/.env.example examples/simple-nft-mint/.env
```

编辑 `examples/simple-nft-mint/.env`：

```bash
PRIVATE_KEY=0x...
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
ETHERSCAN_API_KEY=optional_for_monadscan_verification
```

部署前，请确保部署钱包里有 Monad testnet MON。

## 本地检查

```bash
pnpm --filter @themoss/example-simple-nft-mint compile
pnpm --filter @themoss/example-simple-nft-mint test
pnpm --filter @themoss/example-simple-nft-mint typecheck
```

## 部署

```bash
pnpm --filter @themoss/example-simple-nft-mint deploy:testnet
```

部署脚本会打印合约地址、mint 价格、验证命令，以及一条可以直接运行的 Moss 命令。

当前 demo 部署地址：

```text
address: 0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d
name: Moss Demo Mint NFT
symbol: MOSSDEMO
mintPriceWei: 10000000000000000
mintPriceMon: 0.01
```

## 验证合约

部署后运行脚本打印出的验证命令，格式如下：

```bash
pnpm --filter @themoss/example-simple-nft-mint verify:testnet \
  <contract-address> \
  "Moss Demo Mint NFT" \
  "MOSSDEMO" \
  10000000000000000
```

Monad 的 Hardhat 文档配置了 MonadVision/Sourcify 和 Monadscan 验证。验证命令有时会返回不够直观的信息，即使 explorer 已经验证成功；运行后建议打开 explorer 页面确认。

## 读取价格

```bash
DEMO_NFT_ADDRESS=0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d \
pnpm --filter @themoss/example-simple-nft-mint price:testnet
```

## 运行 Moss 流程

```bash
MOSS_COLLECTION=0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d \
MOSS_TOKEN_URI=ipfs://example-token \
MOSS_RPC_URL=https://testnet-rpc.monad.xyz \
pnpm --filter @themoss/example-simple-nft-mint mint:testnet
```

这个脚本会：

1. 发现 `public-mint-721` capability。
2. 加载参数说明。
3. 调用 `mintPrice` query。
4. 构建未签名 mint Plan。
5. 模拟 Plan，并要求 `warnings: []`。
