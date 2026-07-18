# @themoss/protocol-wallet

Moss wallet adapter - provides wallet information queries including balances and transaction counts.

## Installation

```bash
pnpm add @themoss/protocol-wallet
```

## Usage

### Register with Registry

```typescript
import { Registry } from "@themoss/core";
import { Wallet } from "@themoss/protocol-wallet";

const registry = new Registry(runtime);
registry.use(Wallet);
```

### Query Methods

#### Get Wallet Info

```typescript
const result = await registry.action("wallet", "getWalletInfo", account, {
  address: "0x1234...",
});
// Returns:
// {
//   address: "0x1234...",
//   nativeBalance: "1000000000000000000",
//   nativeBalanceFormatted: "1.0",
//   transactionCount: 42,
//   chainId: 143
// }
```

#### Get Native Balance

```typescript
const result = await registry.action("wallet", "getNativeBalance", account, {
  address: "0x1234...",
});
// Returns:
// {
//   address: "0x1234...",
//   balance: "1000000000000000000",
//   balanceFormatted: "1.0"
// }
```

#### Get Transaction Count

```typescript
const result = await registry.action("wallet", "getTransactionCount", account, {
  address: "0x1234...",
});
// Returns:
// {
//   address: "0x1234...",
//   count: 42
// }
```

### MCP Integration

When using Moss with an MCP-compatible AI agent, the wallet adapter automatically exposes its query methods as tools:

- `wallet_getWalletInfo`
- `wallet_getNativeBalance`
- `wallet_getTransactionCount`

## API Reference

### `Wallet` Class

#### Methods

##### `getWalletInfo(params)`

Get comprehensive wallet information.

**Parameters:**
- `address` (Address): Wallet address to query

**Returns:**
- `WalletInfo` object with balance, transaction count, and chain ID

##### `getNativeBalance(params)`

Get native token (MON) balance.

**Parameters:**
- `address` (Address): Wallet address to query

**Returns:**
- `NativeBalanceResult` object with raw and formatted balance

##### `getTransactionCount(params)`

Get transaction count (nonce).

**Parameters:**
- `address` (Address): Wallet address to query

**Returns:**
- `TransactionCountResult` object with transaction count

## License

MIT
