# Using Moss In Codex

This page collects the short commands and natural-language prompts for testing
Moss from Codex.

## 0. Compile First

Install dependencies:

```bash
pnpm install
```

Build the whole monorepo before connecting Codex. This creates the `dist/`
files used by the MCP server and all protocol packages:

```bash
pnpm build
```

This is safer than only building `@themoss/mcp-server`, because the server
imports compiled workspace packages such as `@themoss/core`,
`@themoss/protocol-kuru`, and `@themoss/protocol-nft-mint`.

For NFT mint development, these targeted commands are also useful:

```bash
pnpm --filter @themoss/protocol-nft-mint build
pnpm --filter @themoss/example-simple-nft-mint compile
```

## 1. Connect Moss To Codex

Codex talks to Moss through the Moss MCP server. After `pnpm build`, add a
`.mcp.json` file at the repo root. If you test both Kuru mainnet and NFT mint
testnet, configure two Moss servers because they use different RPC URLs and
chain IDs:

```jsonc
{
  "mcpServers": {
    "moss-mainnet": {
      "command": "node",
      "args": ["packages/mcp-server/dist/cli.js"],
      "env": {
        "MOSS_RPC_URL": "https://rpc.monad.xyz",
        "MOSS_CHAIN_ID": "143"
      }
    },
    "moss-testnet": {
      "command": "node",
      "args": ["packages/mcp-server/dist/cli.js"],
      "env": {
        "MOSS_RPC_URL": "https://testnet-rpc.monad.xyz",
        "MOSS_CHAIN_ID": "10143"
      }
    }
  }
}
```

Restart the Codex task after editing `.mcp.json`, or reopen the workspace, so
Codex reloads the MCP servers.

When connected, you do not need to mention commands. Ask Codex in natural
language and name the network:

```text
请使用 Moss mainnet 检查 Kuru 上 1 MON 能换多少 USDC，按 discover → load → action → simulate 走完整流程。
```

```text
请使用 Moss testnet 测试 nft-mint。合约地址是 0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d，先 query mintPrice，再构建 mint Plan 并 simulate，确认 warnings 为空。
```

If Codex cannot see Moss tools, check:

- `packages/mcp-server/dist/cli.js` exists. If not, run `pnpm build`.
- `.mcp.json` is at the repo root.
- The `MOSS_CHAIN_ID` matches the RPC network.
- For Kuru, use Monad mainnet (`143`). For this NFT demo, use Monad testnet (`10143`).

## 2. Test Cases

### 2.1 Kuru: Quote 1 MON To USDC

Natural-language prompt for Codex:

```text
在 Monad 上 1 MON 能换多少 USDC？请使用 Moss，按 discover → load → action → simulate 流程检查。
```

Command to run the existing Kuru example:

```bash
pnpm --filter @themoss/example-simple-flow swap
```

What to check in the output:

- `quote(1 MON → USDC)` returns a positive `amountOut`.
- Plan A swaps `MON → USDC`.
- Plan B swaps part of the simulated USDC back to MON.
- Simulation completes with `warnings: []`.

If you only want offline tests and no live-chain calls:

```bash
MOSS_SKIP_E2E=1 pnpm --filter @themoss/protocol-kuru test
```

### 2.2 NFT Mint: Query Price And Simulate Mint On Monad Testnet

NFT Mint uses Monad testnet, not mainnet:

```text
RPC: https://testnet-rpc.monad.xyz
chainId: 10143
```

Demo contract on Monad testnet:

```text
0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d
```

It exposes:

```solidity
function mintPrice() external view returns (uint256);
function mint(address to, string memory uri) external payable returns (uint256 tokenId);
```

Natural-language prompt for Codex:

```text
请使用 Moss 测试 nft-mint。合约地址是 0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d，请先 query mintPrice，再构建 mint Plan，并 simulate，确认 warnings 为空。
```

Command:

```bash
MOSS_COLLECTION=0xAc9d3607e15e59F57b6E7281f96b75a00a7AA05d \
MOSS_TOKEN_URI=ipfs://example-token \
MOSS_RPC_URL=https://testnet-rpc.monad.xyz \
pnpm --filter @themoss/example-simple-nft-mint mint:testnet
```

Expected key output:

```text
mintPrice:
priceWei: 10000000000000000
priceMon: 0.01

simulate:
reverted: false
nftsIn: count 1
warnings: []
```

The command walks through:

```text
discover → load → mintPrice → action → simulate
```

Useful local checks:

```bash
pnpm --filter @themoss/protocol-nft-mint test
pnpm --filter @themoss/example-simple-nft-mint test
pnpm --filter @themoss/protocol-nft-mint build
pnpm --filter @themoss/example-simple-nft-mint typecheck
```

## Safety Rule

Never hand a Plan to a wallet when simulation reports warnings. The desired
end state for these examples is:

```text
warnings: []
```
