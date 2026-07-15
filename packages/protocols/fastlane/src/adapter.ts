/**
 * FastLane shMONAD — liquid staking on Monad.
 *
 * shMONAD is a combined ERC-4626 vault + ERC-20 receipt token. Staking MON
 * mints shMON (the receipt token), and burning shMON redeems the underlying
 * MON (which grows over time as staking rewards accrue).
 *
 * All addresses verified on-chain 2026-07-14 against rpc.monad.xyz:
 *   - Proxy (0x1B68626d…): ERC-1967 proxy, the address agents interact with.
 *   - Implementation (0x856A4019…): contract logic.
 *   - asset() returns 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE (native MON).
 */
import {
  type ActionCtx,
  type Address,
  address,
  Capability,
  fixedAmount,
  type Handle,
  NATIVE,
  nativeAmount,
  type ObserveCtx,
  Protocol,
  plan,
  Query,
  type TokenRef,
} from "@themoss/core";
import type { DecodedEvent } from "@themoss/core";
import { Event } from "@themoss/core";
import { ShMonadAbi } from "./abis/fastlane.js";

/** shMON proxy — the canonical address for all interactions. */
export const SHMON_PROXY_ADDRESS: Address =
  "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c";

/** Implementation contract — not used directly. */
export const SHMON_IMPL_ADDRESS: Address =
  "0x856A4019228c265DEE336DF705277607c4A18e1B";

/** Token ref for the shMON receipt token. */
export const SHMON: TokenRef = SHMON_PROXY_ADDRESS;

@Protocol({
  name: "fastlane",
  category: "staking",
  description:
    "FastLane shMONAD: liquid staking on Monad. Stake native MON to receive shMON, " +
    "a reward-bearing receipt token that grows in value relative to MON over time.",
  contracts: {
    vault: { abi: ShMonadAbi, addr: SHMON_PROXY_ADDRESS },
  },
})
export class FastLane {
  declare vault: Handle<typeof ShMonadAbi>;

  @Capability({
    intent: "Stake {amount} MON into FastLane shMONAD liquid staking",
    verb: "stake",
    params: { amount: nativeAmount },
    risk: ["fundOut"],
    tags: ["liquid-staking"],
    confirms: ["stakeReceipt"],
  })
  async stake({ amount }: { amount: bigint }, ctx: ActionCtx) {
    // ERC-4626: deposit(assets, receiver)
    // receiver = ctx.account (the caller receives the shMON)
    const step = this.vault.deposit([amount, ctx.account], {
      value: amount,
    });
    return plan([step], {
      out: [{ token: NATIVE, amountMax: amount }],
      in: [{ token: SHMON, amountMin: amount }],
    });
  }

  @Capability({
    intent: "Unstake {amount} shMON back into native MON from FastLane",
    verb: "unstake",
    params: { amount: fixedAmount(18, "shMON") },
    risk: ["fundOut"],
    tags: ["liquid-staking"],
    confirms: ["unstakeReceipt"],
  })
  async unstake({ amount }: { amount: bigint }, ctx: ActionCtx) {
    // ERC-4626: redeem(shares, receiver, owner)
    // receiver & owner = ctx.account (the caller redeems their own shMON)
    const step = this.vault.redeem([amount, ctx.account, ctx.account]);
    return plan([step], {
      out: [{ token: SHMON, amountMax: amount }],
      in: [{ token: NATIVE, amountMin: amount }],
    });
  }

  /** Observation: stake receipt — Deposit event from ERC-4626 vault. */
  @Event<FastLane>({
    events: { vault: ["Deposit"] },
    intent: "Staked {amount} MON into shMONAD",
  })
  async stakeReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const hit = events.find((e) => e.name === "Deposit");
    if (!hit) return null;
    const { assets } = hit.args as {
      sender: Address;
      owner: Address;
      assets: bigint;
      shares: bigint;
    };
    return { amount: (await ctx.token(NATIVE)).format(assets) };
  }

  /** Observation: unstake receipt — Withdraw event from ERC-4626 vault. */
  @Event<FastLane>({
    events: { vault: ["Withdraw"] },
    intent: "Unstaked {amount} MON from shMONAD",
  })
  async unstakeReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const hit = events.find((e) => e.name === "Withdraw");
    if (!hit) return null;
    const { assets } = hit.args as {
      sender: Address;
      receiver: Address;
      owner: Address;
      assets: bigint;
      shares: bigint;
    };
    return { amount: (await ctx.token(NATIVE)).format(assets) };
  }

  @Query({
    intent: "shMON balance of {owner}",
    params: { owner: address },
  })
  async balanceOf({ owner }: { owner: Address }) {
    const balance = await this.vault.read.balanceOf([owner]);
    return {
      token: SHMON_PROXY_ADDRESS,
      symbol: "shMON",
      decimals: 18,
      balance: balance.toString(),
    };
  }

  @Query({
    intent: "Current exchange rate: 1 shMON = {rate} MON",
    params: {},
  })
  async exchangeRate() {
    const rate = await this.vault.read.convertToAssets([10n ** 18n]);
    return { rate: rate.toString() };
  }

  @Query({
    intent: "Total MON staked in FastLane shMONAD",
    params: {},
  })
  async totalStaked() {
    const total = await this.vault.read.totalAssets();
    return { total: total.toString() };
  }
}
