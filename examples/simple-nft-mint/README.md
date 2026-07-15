# Simple NFT Mint

[中文文档](./README.zh-CN.md)

Deploy an OpenZeppelin ERC-721 demo collection to Monad testnet, then exercise
the Moss NFT mint adapter end to end:

```text
deploy contract → discover → load → mintPrice → action → simulate
```

The demo contract is [DemoMintPriceNFT.sol](./contracts/DemoMintPriceNFT.sol).
It extends OpenZeppelin `ERC721URIStorage` and exposes the exact surface the
Moss adapter expects:

```solidity
function mintPrice() external view returns (uint256);
function mint(address to, string memory uri) external payable returns (uint256 tokenId);
```

## Setup

```bash
pnpm install
cp examples/simple-nft-mint/.env.example examples/simple-nft-mint/.env
```

Edit `examples/simple-nft-mint/.env`:

```bash
PRIVATE_KEY=0x...
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
ETHERSCAN_API_KEY=optional_for_monadscan_verification
```

Fund the deployer wallet with Monad testnet MON before deploying.

## Local Checks

```bash
pnpm --filter @themoss/example-simple-nft-mint compile
pnpm --filter @themoss/example-simple-nft-mint test
pnpm --filter @themoss/example-simple-nft-mint typecheck
```

## Deploy

```bash
pnpm --filter @themoss/example-simple-nft-mint deploy:testnet
```

The deploy script prints the contract address, mint price, verification
command, and a ready-to-run Moss command.

Current demo deployment:

```text
address: 0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d
name: Moss Demo Mint NFT
symbol: MOSSDEMO
mintPriceWei: 10000000000000000
mintPriceMon: 0.01
```

## Verify

After deploy, run the printed command. It has this shape:

```bash
pnpm --filter @themoss/example-simple-nft-mint verify:testnet \
  <contract-address> \
  "Moss Demo Mint NFT" \
  "MOSSDEMO" \
  10000000000000000
```

Monad's Hardhat docs configure verification for MonadVision/Sourcify and
Monadscan. Verification may report a confusing error even when explorer
verification succeeds, so check the explorer pages afterward.

## Read Price

```bash
DEMO_NFT_ADDRESS=0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d \
pnpm --filter @themoss/example-simple-nft-mint price:testnet
```

## Run The Moss Flow

```bash
MOSS_COLLECTION=0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d \
MOSS_TOKEN_URI=ipfs://example-token \
MOSS_RPC_URL=https://testnet-rpc.monad.xyz \
pnpm --filter @themoss/example-simple-nft-mint mint:testnet
```

The script:

1. Discovers the `public-mint-721` capability.
2. Loads the parameter contract.
3. Calls the `mintPrice` query.
4. Builds the unsigned mint Plan.
5. Simulates the Plan and requires `warnings: []`.
