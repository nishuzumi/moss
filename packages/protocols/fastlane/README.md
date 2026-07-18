# @themoss/protocol-fastlane

Moss Protocol adapter for **FastLane ShMonad** liquid staking on Monad mainnet.

## What it does

- **stake** — deposit native MON and receive yield-bearing shMON shares
- **unstake** — redeem shMON for native MON via the atomic exit path
- **Queries** — previewDeposit, previewRedeem, balanceOf, convertToAssets (exchange rate)

## Verified deployment

| Network | Chain ID | ShMonad proxy |
|---------|----------|---------------|
| Monad Mainnet | 143 | `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c` |

Source: [FastLane official deployment table](https://github.com/FastLane-Labs/fastlane-contracts/blob/main/use-shmonad/references/deployments-and-rpc.md)

## ABI origin

Explorer — retrieved from the Monad mainnet verified-contract page for the ShMonad proxy. Focused subset: ERC-4626 deposit/redeem, previews, ERC-20 metadata, and associated events.

## Usage

```ts
import { Registry } from "@themoss/core";
import { FastLane } from "@themoss/protocol-fastlane";

const registry = new Registry(runtime).use(FastLane);

// Stake 1 MON
const stakeAction = await registry.action("fastlane", "stake", account, {
  amount: "1",
  receiver: account,
});

// Check shMON balance
const balance = await registry.query("fastlane", "balanceOf", { owner: account });
```
