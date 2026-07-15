/**
 * Aave v3 — lending protocol on Monad.
 *
 * Core capabilities: supply, withdraw, borrow, repay. Each maps 1:1 onto
 * a Moss verb. Queries: user health factor, reserve data.
 *
 * Pool proxy verified on-chain 2026-07-15:
 *   0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef (ERC-1967 → 0x9539531e…)
 *
 * ⚠️  Native MON limitation: Pool.supply() / .repay() are non-payable.
 *      Users must supply/repay WMON, not raw MON. Aave v3 uses a separate
 *      WrappedTokenGateway contract for native → wrapped conversion, which
 *      is out of scope for this adapter (uses a different contract ABI).
 *      For native MON flows, supply "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A"
 *      (WMON) instead of "native".
 */
import {
  type ActionCtx,
  type Address,
  address,
  Capability,
  type Handle,
  NATIVE,
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

export const POOL_ADDRESS: Address =
  "0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef";

function assertNotNative(asset: TokenRef, method: string): asserts asset is Address {
  if (asset === NATIVE) {
    throw new Error(
      `aave-v3.${method}(): Pool is non-payable. Supply WMON ` +
      `(0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A) instead of native MON.`,
    );
  }
}

@Protocol({
  name: "aave-v3",
  category: "lending",
  description:
    "Aave v3: the original DeFi lending protocol on Monad. Supply, withdraw, " +
    "borrow, and repay. Native MON not supported directly — use WMON instead.",
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
    assertNotNative(asset, "supply");
    const step = this.pool.supply([asset, amount, ctx.account, 0]);
    return plan([approveStep(asset, POOL_ADDRESS, amount), step], {
      out: [{ token: asset, amountMax: amount }],
    });
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
    assertNotNative(asset, "withdraw");
    const step = this.pool.withdraw([asset, amount, ctx.account]);
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
    assertNotNative(asset, "borrow");
    const step = this.pool.borrow([asset, amount, 2n, 0, ctx.account]);
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
    assertNotNative(asset, "repay");
    const step = this.pool.repay([asset, amount, 2n, ctx.account]);
    return plan([approveStep(asset, POOL_ADDRESS, amount), step], {
      out: [{ token: asset, amountMax: amount }],
    });
  }

  // ── Events ──

  @Event<AaveV3>({ events: { pool: ["Supply"] }, intent: "Supplied {amount} of {assetSymbol} to Aave v3" })
  async supplyReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const e = events.find((ev) => ev.name === "Supply");
    if (!e) return null;
    const { reserve, amount } = e.args as { reserve: Address; amount: bigint };
    const t = await ctx.token(reserve);
    return { amount: t.format(amount), assetSymbol: t.symbol };
  }

  @Event<AaveV3>({ events: { pool: ["Withdraw"] }, intent: "Withdrew {amount} of {assetSymbol} from Aave v3" })
  async withdrawReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const e = events.find((ev) => ev.name === "Withdraw");
    if (!e) return null;
    const { reserve, amount } = e.args as { reserve: Address; amount: bigint };
    const t = await ctx.token(reserve);
    return { amount: t.format(amount), assetSymbol: t.symbol };
  }

  @Event<AaveV3>({ events: { pool: ["Borrow"] }, intent: "Borrowed {amount} of {assetSymbol} from Aave v3" })
  async borrowReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const e = events.find((ev) => ev.name === "Borrow");
    if (!e) return null;
    const { reserve, amount } = e.args as { reserve: Address; amount: bigint };
    const t = await ctx.token(reserve);
    return { amount: t.format(amount), assetSymbol: t.symbol };
  }

  @Event<AaveV3>({ events: { pool: ["Repay"] }, intent: "Repaid {amount} of {assetSymbol} on Aave v3" })
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
    const [a, b, c, d, e, f] = data as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
    return {
      totalCollateralBase: a.toString(),
      totalDebtBase: b.toString(),
      availableBorrowsBase: c.toString(),
      currentLiquidationThreshold: d.toString(),
      ltv: e.toString(),
      healthFactor: f.toString(),
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
      bigint, bigint, number, Address, Address,
      Address, Address, bigint,
    ];
    return {
      aTokenAddress: d[8],
      stableDebtTokenAddress: d[9],
      variableDebtTokenAddress: d[10],
      liquidityRate: d[3].toString(), // index 3 = currentLiquidityRate
      variableBorrowRate: d[4].toString(), // index 4 = currentVariableBorrowRate
    };
  }
}
