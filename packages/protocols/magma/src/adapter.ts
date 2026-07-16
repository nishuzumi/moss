/**
 * Magma — Monad 链上原生的 Liquid Staking 协议（流动性质押协议）。
 *
 * 本适配器（Adapter）支持用户将 MON 或 WMON 质押（Stake）进 Magma 金库并铸造 gMON，
 * 同时也支持基于 ERC-7540 标准的异步赎回流程（申请赎回 requestUnstake 和到期提取 claimUnstake）。
 *
 * 合约及代币地址已于 2026-07-16 在 Monad 主网上核对无误。
 */
import {
  type Address,
  address,
  Capability,
  type DecodedEvent,
  Event,
  fixedAmount,
  type Handle,
  NATIVE,
  nativeAmount,
  type ObserveCtx,
  Protocol,
  plan,
  Query,
  token,
  tokenAmount,
  type TokenRef,
  type TxStep,
  type ActionCtx,
} from "@themoss/core";
import { approveStep } from "@themoss/erc";
import { knownTokenAddress } from "@themoss/system";
import { MagmaAbi } from "./abis/magma.js";

// Magma 核心 Vault 合约地址，同时也是 gMON 代币合约地址。
export const MAGMA_VAULT_ADDRESS: Address = "0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081";
// 系统的 WMON 合约地址。
export const WMON_ADDRESS: Address = knownTokenAddress("WMON");

@Protocol({
  name: "magma",
  category: "staking",
  description: "Magma: Monad-native liquid staking protocol. Stake MON or WMON to earn PoS & MEV yield as gMON.",
  contracts: {
    vault: { abi: MagmaAbi, addr: MAGMA_VAULT_ADDRESS },
  },
})
export class Magma {
  // 声明 vault 句柄，用于在运行时被注入并类型化调用合约。
  declare vault: Handle<typeof MagmaAbi>;

  @Capability({
    intent: "Stake {amount} {asset} into Magma to receive gMON",
    verb: "stake",
    params: {
      asset: token,
      amount: tokenAmount("asset"),
    },
    risk: ["fundOut", "approval"],
    tags: ["lst", "staking"],
    confirms: ["stakeReceipt"],
  })
  async stake({ asset, amount }: { asset: TokenRef; amount: bigint }, ctx: ActionCtx) {
    const steps: TxStep[] = [];
    const nativeIn = asset === NATIVE;

    // 调用 previewDeposit 预估可兑换的 gMON shares，设置 1% 的滑点保护。
    const expectedShares = await this.vault.read.previewDeposit([amount]);
    const minShares = (expectedShares * 99n) / 100n;

    if (nativeIn) {
      // 质押 Native MON，调用 depositMON(receiver, referralId)，将 receiver 设为当前调用者 ctx.account。
      steps.push(
        this.vault.depositMON([ctx.account, 0n], { value: amount })
      );
    } else {
      if (asset.toLowerCase() !== WMON_ADDRESS.toLowerCase()) {
        throw new Error("Magma only supports staking MON or WMON");
      }
      // 质押 WMON，先 approve 授权，再调用 deposit(assets, receiver)，将 receiver 设为当前调用者 ctx.account。
      steps.push(approveStep(WMON_ADDRESS, this.vault.address, amount));
      steps.push(this.vault.deposit([amount, ctx.account]));
    }

    return plan(steps, {
      out: [{ token: asset, amountMax: amount }],
      in: [{ token: MAGMA_VAULT_ADDRESS, amountMin: minShares }],
    });
  }

  @Capability({
    intent: "Request unstake of {amount} gMON from Magma",
    verb: "unstake",
    params: {
      amount: fixedAmount(18, "gMON"),
    },
    risk: ["fundOut"],
    tags: ["lst", "staking"],
    confirms: ["requestReceipt"],
  })
  async requestUnstake({ amount }: { amount: bigint }, ctx: ActionCtx) {
    // 异步赎回第一步：调用 requestRedeem 锁定并申请赎回 shares。
    // controller 与 owner 均设为当前调用账户地址。
    const step = this.vault.requestRedeem([amount, ctx.account, ctx.account]);
    return plan([step], {
      out: [{ token: MAGMA_VAULT_ADDRESS, amountMax: amount }],
    });
  }

  @Capability({
    intent: "Claim unstaked MON/WMON from Magma by burning {amount} gMON",
    verb: "withdraw",
    params: {
      amount: fixedAmount(18, "gMON"),
    },
    risk: ["fundOut"],
    tags: ["lst", "staking"],
    confirms: ["claimReceipt"],
  })
  async claimUnstake({ amount }: { amount: bigint }, ctx: ActionCtx) {
    // 异步赎回第二步：过延迟期后，调用 redeem 销毁已申请的 shares，提取底层 MON/WMON。
    const expectedAssets = await this.vault.read.convertToAssets([amount]);
    const minAssets = (expectedAssets * 99n) / 100n; // 1% 滑点保护。
    const step = this.vault.redeem([amount, ctx.account, ctx.account]);

    return plan([step], {
      out: [{ token: MAGMA_VAULT_ADDRESS, amountMax: amount }],
      in: [{ token: WMON_ADDRESS, amountMin: minAssets }],
    });
  }

  @Event<Magma>({
    events: { vault: ["Deposit"] },
    intent: "Staked {amount} {asset} into Magma for {shares} gMON",
  })
  async stakeReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const hit = events.find((e) => e.name === "Deposit");
    if (!hit) return null;

    const { assets, shares } = hit.args as { assets: bigint; shares: bigint };
    const monToken = await ctx.token(NATIVE);
    const gMonToken = await ctx.token(MAGMA_VAULT_ADDRESS);

    return {
      amount: monToken.format(assets),
      asset: "MON",
      shares: gMonToken.format(shares),
    };
  }

  @Event<Magma>({
    events: { vault: ["RedeemRequest"] },
    intent: "Requested unstake of {shares} gMON from Magma (Request ID: {requestId})",
  })
  async requestReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const hit = events.find((e) => e.name === "RedeemRequest");
    if (!hit) return null;

    const { shares, requestId } = hit.args as { shares: bigint; requestId: bigint };
    const gMonToken = await ctx.token(MAGMA_VAULT_ADDRESS);

    return {
      shares: gMonToken.format(shares),
      requestId: requestId.toString(),
    };
  }

  @Event<Magma>({
    events: { vault: ["Withdraw"] },
    intent: "Claimed {amount} MON/WMON from Magma by burning {shares} gMON",
  })
  async claimReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const hit = events.find((e) => e.name === "Withdraw");
    if (!hit) return null;

    const { assets, shares } = hit.args as { assets: bigint; shares: bigint };
    const monToken = await ctx.token(NATIVE);
    const gMonToken = await ctx.token(MAGMA_VAULT_ADDRESS);

    return {
      amount: monToken.format(assets),
      shares: gMonToken.format(shares),
    };
  }

  @Query({
    intent: "Preview stake of {amount} {asset} into Magma",
    params: {
      asset: token,
      amount: tokenAmount("asset"),
    },
  })
  async previewStake({ asset, amount }: { asset: TokenRef; amount: bigint }) {
    if (asset !== NATIVE && asset.toLowerCase() !== WMON_ADDRESS.toLowerCase()) {
      throw new Error("Magma only supports staking MON or WMON");
    }
    const shares = await this.vault.read.previewDeposit([amount]);
    return {
      shares: shares.toString(),
      gMON: (shares / 10n ** 18n).toString(),
    };
  }

  @Query({
    intent: "gMON balance of {owner}",
    params: { owner: address },
  })
  async balanceOf({ owner }: { owner: Address }) {
    const balance = await this.vault.read.balanceOf([owner]);
    return { token: MAGMA_VAULT_ADDRESS, symbol: "gMON", decimals: 18, balance: balance.toString() };
  }
}
