/**
 * Aave v3 — lending protocol on Monad.
 *
 * Core capabilities: supply, withdraw, borrow, repay. Each maps 1:1 onto
 * a Moss verb. Queries: user health factor, reserve data, reserves list.
 *
 * Pool proxy verified on-chain 2026-07-15:
 *   0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef (ERC-1967 → 0x9539531e…)
 */
import {
  type ActionCtx,
  type Address,
  address,
  Capability,
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
} from "@themoss/core";
import { approveStep } from "@themoss/erc";
import { Event } from "@themoss/core";
import type { DecodedEvent } from "@themoss/core";
import { PoolAbi } from "./abis/aave.js";

/** Pool proxy on Monad */
export const POOL_ADDRESS: Address =
  "0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef";

/** Aave uses address(0) for native MON. */
const NATIVE_SENTINEL: Address = "0x0000000000000000000000000000000000000000";
const toAaveAsset = (t: TokenRef): Address =>
  t === NATIVE ? NATIVE_SENTINEL : (t as Address);

@Protocol({
  name: "aave-v3",
  category: "lending",
  description:
    "Aave v3: the original DeFi lending protocol on Monad. Supply, withdraw, " +
    "borrow, and repay across multiple reserves.",
  contracts: {
    pool: { abi: PoolAbi, addr: POOL_ADDRESS },
  },
})
export class AaveV3 {
  declare pool: Handle<typeof PoolAbi>;

  @Capability({
    intent: "Supply {amount} of {asset} to Aave v3",
    verb: "supply",
    params: { asset: token, amount: tokenAmount("asset") },
    risk: ["fundOut", "approval"],
    tags: ["lending", "collateral"],
    confirms: ["supplyReceipt"],
  })
  async supply(
    { asset, amount }: { asset: TokenRef; amount: bigint },
    ctx: ActionCtx,
  ) {
    const aaveAsset = toAaveAsset(asset);
    const isNative = asset === NATIVE;
    const supplyStep = this.pool.supply([aaveAsset, amount, ctx.account, 0]);
    const steps = isNative
      ? [supplyStep]
      : [approveStep(aaveAsset, POOL_ADDRESS, amount), supplyStep];
    return plan(steps, { out: [{ token: asset, amountMax: amount }] });
  }

  @Capability({
    intent: "Withdraw {amount} of {asset} from Aave v3",
    verb: "withdraw",
    params: { asset: token, amount: tokenAmount("asset") },
    risk: ["fundOut"],
    tags: ["lending"],
    confirms: ["withdrawReceipt"],
  })
  async withdraw(
    { asset, amount }: { asset: TokenRef; amount: bigint },
    ctx: ActionCtx,
  ) {
    const step = this.pool.withdraw([toAaveAsset(asset), amount, ctx.account]);
    return plan([step], { in: [{ token: asset, amountMin: amount }] });
  }

  @Capability({
    intent: "Borrow {amount} of {asset} from Aave v3 at variable rate",
    verb: "borrow",
    params: { asset: token, amount: tokenAmount("asset") },
    risk: ["fundOut"],
    tags: ["lending", "variable-rate"],
    confirms: ["borrowReceipt"],
  })
  async borrow(
    { asset, amount }: { asset: TokenRef; amount: bigint },
    ctx: ActionCtx,
  ) {
    // interestRateMode: 2 = variable
    const step = this.pool.borrow([toAaveAsset(asset), amount, 2n, 0, ctx.account]);
    return plan([step], { in: [{ token: asset, amountMin: amount }] });
  }

  @Capability({
    intent: "Repay {amount} of {asset} on Aave v3",
    verb: "repay",
    params: { asset: token, amount: tokenAmount("asset") },
    risk: ["fundOut", "approval"],
    tags: ["lending"],
    confirms: ["repayReceipt"],
  })
  async repay(
    { asset, amount }: { asset: TokenRef; amount: bigint },
    ctx: ActionCtx,
  ) {
    const aaveAsset = toAaveAsset(asset);
    const isNative = asset === NATIVE;
    const repayStep = this.pool.repay([aaveAsset, amount, 2n, ctx.account]);
    const steps = isNative
      ? [repayStep]
      : [approveStep(aaveAsset, POOL_ADDRESS, amount), repayStep];
    return plan(steps, { out: [{ token: asset, amountMax: amount }] });
  }

  // ── @Event observations ──

  @Event<AaveV3>({
    events: { pool: ["Supply"] },
    intent: "Supplied {amount} of {assetSymbol} to Aave v3",
  })
  async supplyReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const e = events.find((ev) => ev.name === "Supply");
    if (!e) return null;
    const { reserve, amount } = e.args as {
      reserve: Address; amount: bigint;
    };
    const t = await ctx.token(reserve);
    return { amount: t.format(amount), assetSymbol: t.symbol };
  }

  @Event<AaveV3>({
    events: { pool: ["Withdraw"] },
    intent: "Withdrew {amount} of {assetSymbol} from Aave v3",
  })
  async withdrawReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const e = events.find((ev) => ev.name === "Withdraw");
    if (!e) return null;
    const { reserve, amount } = e.args as { reserve: Address; amount: bigint };
    const t = await ctx.token(reserve);
    return { amount: t.format(amount), assetSymbol: t.symbol };
  }

  @Event<AaveV3>({
    events: { pool: ["Borrow"] },
    intent: "Borrowed {amount} of {assetSymbol} from Aave v3",
  })
  async borrowReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const e = events.find((ev) => ev.name === "Borrow");
    if (!e) return null;
    const { reserve, amount } = e.args as { reserve: Address; amount: bigint };
    const t = await ctx.token(reserve);
    return { amount: t.format(amount), assetSymbol: t.symbol };
  }

  @Event<AaveV3>({
    events: { pool: ["Repay"] },
    intent: "Repaid {amount} of {assetSymbol} on Aave v3",
  })
  async repayReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const e = events.find((ev) => ev.name === "Repay");
    if (!e) return null;
    const { reserve, amount } = e.args as { reserve: Address; amount: bigint };
    const t = await ctx.token(reserve);
    return { amount: t.format(amount), assetSymbol: t.symbol };
  }

  // ── Queries ──

  @Query({
    intent: "Aave v3 user account data for {user}",
    params: { user: address },
  })
  async userAccountData({ user }: { user: Address }) {
    const data = await this.pool.read.getUserAccountData([user]);
    const [totalCollateralBase, totalDebtBase, availableBorrowsBase,
           currentLiquidationThreshold, ltv, healthFactor] = data as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
    return {
      totalCollateralBase: totalCollateralBase.toString(),
      totalDebtBase: totalDebtBase.toString(),
      availableBorrowsBase: availableBorrowsBase.toString(),
      currentLiquidationThreshold: currentLiquidationThreshold.toString(),
      ltv: ltv.toString(),
      healthFactor: healthFactor.toString(),
    };
  }

  @Query({
    intent: "Aave v3 reserve data for {asset}",
    params: { asset: address },
  })
  async reserveData({ asset }: { asset: Address }) {
    const data = await this.pool.read.getReserveData([asset]);
    const d = data as unknown as readonly [
      bigint, bigint, bigint, bigint, bigint,
      bigint, bigint, bigint, Address, Address,
      Address, Address, bigint
    ];
    return {
      aTokenAddress: d[8],
      stableDebtTokenAddress: d[9],
      variableDebtTokenAddress: d[10],
      liquidityRate: d[4].toString(),
      variableBorrowRate: d[5].toString(),
    };
  }
}
