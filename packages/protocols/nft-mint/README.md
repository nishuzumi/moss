# @themoss/protocol-nft-mint

[中文文档](./readme-zh.md)

Moss protocol adapter for simple ERC-721 public mint contracts on Monad.

This package exposes one NFT capability:

- Protocol: `public-mint-721`
- Method: `mint`
- Verb: `mint`
- Category: `nft`

It is designed for collections that expose this payable mint interface and
price query:

```solidity
function mint(address to, string memory uri) external payable;
function mintPrice() external view returns (uint256);
```

## Scope

The adapter builds an unsigned Plan that:

- calls the collection's `mint(address to, string uri)` function with the caller as `to`
- reads `mintPrice()` and attaches that MON value to the transaction
- declares `expects.out` for the maximum MON that may leave the account
- declares `expects.nfts` for one ERC-721 NFT expected to arrive

The collection address is a runtime parameter. That keeps the adapter useful
for multiple simple public mint contracts, but it also means callers must first
verify the target collection supports this exact selector and mint flow.

## Parameters

| Parameter | Meaning |
| --- | --- |
| `collection` | The ERC-721 collection contract address. |
| `tokenUri` | Metadata URI passed to `mint(address,string)`. |

Example action parameters:

```json
{
  "collection": "0x642BD034244cEEE44B3d371Fb7e6EB73EE921909",
  "tokenUri": "ipfs://example-token"
}
```

## Monad Testnet Demo Collection

A demo collection deployed from `examples/simple-nft-mint` is available on
Monad testnet:

```text
0x642BD034244cEEE44B3d371Fb7e6EB73EE921909
```

Verified read values on `https://testnet-rpc.monad.xyz`:

```text
name: Moss Demo Mint NFT
symbol: MOSSDEMO
mintPrice: 10000000000000000 wei (0.01 MON)
```

Use it with the simple mint example:

```bash
MOSS_COLLECTION=0x642BD034244cEEE44B3d371Fb7e6EB73EE921909 \
MOSS_TOKEN_URI=ipfs://example-token \
MOSS_RPC_URL=https://testnet-rpc.monad.xyz \
pnpm --filter @themoss/example-simple-nft-mint mint:testnet
```

## Safety Model

The Plan declares:

- `risk: ["fundOut"]`
- `expects.out`: native MON up to the chain-reported `mintPrice()`
- `expects.nfts`: one NFT entering from the supplied collection

Before presenting any transaction to a signer, run simulation and require zero
warnings. Simulation is also where closed mints, wrong prices, whitelist gates,
or incompatible mint signatures should surface.

Current Moss observations (`@Event`) bind to static contract keys. Because this
adapter uses caller-supplied collection addresses, it does not declare an
`@Event` receipt yet. The audit plane is the quantified `expects` declaration
plus simulation reconciliation.

## Tests

Offline tests cover discovery, load output, and Plan construction:

```bash
pnpm --filter @themoss/protocol-nft-mint test
pnpm --filter @themoss/protocol-nft-mint typecheck
```

Live e2e simulation can use the demo collection above.
