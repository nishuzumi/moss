# Demo NFT Hardhat Project

Deploy a small ERC-721-compatible demo collection to Monad testnet for testing
`@themoss/protocol-nft-mint`.

The contract exposes the exact surface the Moss adapter expects:

```solidity
function mintPrice() external view returns (uint256);
function mint(address to, string memory uri) external payable returns (uint256 tokenId);
```

## Setup

```bash
pnpm install
cp examples/demo-nft-hardhat/.env.example examples/demo-nft-hardhat/.env
```

Edit `examples/demo-nft-hardhat/.env`:

```bash
PRIVATE_KEY=0x...
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
ETHERSCAN_API_KEY=optional_for_monadscan_verification
```

Get testnet MON for the deployer wallet before deploying.

## Test Locally

```bash
pnpm --filter @themoss/example-demo-nft-hardhat test
```

## Deploy To Monad Testnet

```bash
pnpm --filter @themoss/example-demo-nft-hardhat deploy:testnet
```

The deploy script prints:

- deployed contract address
- `mintPrice` in wei and MON
- verify command
- Moss `simple-mint` command

Current demo deployment:

```text
address: 0x642BD034244cEEE44B3d371Fb7e6EB73EE921909
name: Moss Demo Mint NFT
symbol: MOSSDEMO
mintPriceWei: 10000000000000000
mintPriceMon: 0.01
```

## Verify

After deploy, run the printed command. It has this shape:

```bash
pnpm --filter @themoss/example-demo-nft-hardhat verify:testnet \
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
DEMO_NFT_ADDRESS=0x... pnpm --filter @themoss/example-demo-nft-hardhat price:testnet
```

## Use With Moss

Once deployed, copy the address into the simple mint example:

```bash
MOSS_COLLECTION=0x642BD034244cEEE44B3d371Fb7e6EB73EE921909 \
MOSS_TOKEN_URI=ipfs://example-token \
MOSS_RPC_URL=https://testnet-rpc.monad.xyz \
pnpm --filter @themoss/example-simple-flow mint
```

Then update `packages/protocols/nft-mint/README.md` with the deployed demo
address so future contributors have a known-good `MOSS_COLLECTION` for testing.
