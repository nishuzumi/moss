/**
 * Aave v3 — lending protocol on Monad.
 *
 * Core capabilities: supply (plus ERC20 approve), withdraw, borrow (variable
 * rate), and repay (plus ERC20 approve). Each maps 1:1 onto a Moss verb.
 *
 * Pool proxy verified on-chain 2026-07-15 against rpc.monad.xyz:
 *   0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef (ERC-1967, 1.8KB)
 *   Implementation: 0x9539531ea4f6563a66421a7449506152609985be (21KB)
 *
 * ⚠️ Native MON limitation: Pool.supply/withdraw/borrow/repay are all
 *    non-payable. Users MUST supply WMON (0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A),
 *    not native MON. The adapter rejects native MON with a clear error.
 *
 * This adapter follows the PR #31 Capability + Receipt framework:
 *   - supply/repay return composed capabilities [erc20.approve, pool.supply]
 *   - withdraw/borrow return single-transaction capabilities [pool.<method>]
 *   - @Receipt methods decode Aave v3 events from Changes
 */
import {
  Address,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult as MossReceipt,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import { PoolAbi } from "./abis/aave.js";

// ── Constants ───────────────────────────────────────────────────────────────

/** Aave v3 Pool proxy — the canonical address for all lending interactions. */
export const POOL_ADDRESS: `0x${string}` =
  "0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef";

/** WMON — the wrapped MON token used by Aave v3 (Pool is non-payable). */
const WMON_ADDRESS: `0x${string}` =
  "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";

/** NATIVE MON sentinel used by Aave v3. */
const NATIVE_SENTINEL: `0x${string}` =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const POOL_ADDR_LOWER = POOL_ADDRESS.toLowerCase();

// Base unit multiplier; most Monad tokens use 18 decimals.
const DECIMALS = 18;
const MAX_APPROVAL = (1n << 256n) - 1n;

// ── Parameter specs ─────────────────────────────────────────────────────────

const assetAmountParams = {
  asset: {
    type: Address,
    description:
      "Address of the reserve asset on Aave. Must be an ERC-20 token " +
      "(e.g. WMON at 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A). " +
      "Native MON is NOT supported — the Pool contract is non-payable.",
  },
  amount: {
    type: PositiveDecimalString,
    description:
      "Human-readable amount of the asset (e.g. '1.5'). " +
      "Assumes the token uses 18 decimals (as most Monad tokens do).",
  },
} satisfies ParamsSpec;

const userParam = {
  user: {
    type: Address,
    description: "Address to query Aave account data for.",
  },
} satisfies ParamsSpec;

const reserveParam = {
  asset: {
    type: Address,
    description: "Address of the reserve asset to read data for.",
  },
} satisfies ParamsSpec;

// ── Event filters for decoding ───────────────────────────────────────────────

const SupplyEventAbi = PoolAbi.filter(
  (item) => item.type === "event" && item.name === "Supply",
);
const WithdrawEventAbi = PoolAbi.filter(
  (item) => item.type === "event" && item.name === "Withdraw",
);
const BorrowEventAbi = PoolAbi.filter(
  (item) => item.type === "event" && item.name === "Borrow",
);
const RepayEventAbi = PoolAbi.filter(
  (item) => item.type === "event" && item.name === "Repay",
);

// ── Guard ────────────────────────────────────────────────────────────────────

function assertNotNative(asset: `0x${string}`, method: string): void {
  if (asset.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) {
    throw new Error(
      `aave-v3.${method}(): Pool contract is non-payable. Supply WMON ` +
        `(${WMON_ADDRESS}) instead of native MON.`,
    );
  }
}

// ── Protocol class ───────────────────────────────────────────────────────────

@Protocol({
  name: "aave-v3",
  category: "lending",
  description:
    "Aave v3: the original DeFi lending protocol on Monad. Supply, withdraw, " +
    "borrow, and repay. Native MON not supported directly — use WMON instead.",
  contracts: {
    pool: { abi: PoolAbi, addr: POOL_ADDRESS },
  },
  protocols: { erc20: ERC20 },
})
export class AaveV3 {
  declare pool: Handle<typeof PoolAbi>;
  declare erc20: ProtocolRef<ERC20>;

  // ═════════════════════════════════════════════════════════════════════════
  //  Capability: supply
  // ═════════════════════════════════════════════════════════════════════════

  @Capability<AaveV3, typeof assetAmountParams>({
    intent: "Supply {amount} of {asset} to Aave v3",
    verb: "supply",
    params: assetAmountParams,
    receipt: "supplyReceipt",
    risk: ["fundOut", "approval"],
    tags: ["lending", "collateral"],
  })
  async supply(
    params: InferParams<typeof assetAmountParams>,
    ctx: { account: `0x${string}` },
  ) {
    assertNotNative(params.asset, "supply");
    const wei = parseUnits(params.amount, DECIMALS);
    const approveCap = await this.erc20.approve({
      token: params.asset,
      spender: POOL_ADDRESS,
      amount: MAX_APPROVAL.toString(),
    });
    return [approveCap, this.pool.supply([params.asset, wei, ctx.account, 0])];
  }

  @Receipt()
  supplyReceipt(
    changes: readonly Change[],
  ): MossReceipt<{ operation: "supply" }> {
    return aaveReceipt(changes, "supply", SupplyEventAbi);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  Capability: withdraw
  // ═════════════════════════════════════════════════════════════════════════

  @Capability<AaveV3, typeof assetAmountParams>({
    intent: "Withdraw {amount} of {asset} from Aave v3",
    verb: "withdraw",
    params: assetAmountParams,
    receipt: "withdrawReceipt",
    risk: ["fundOut"],
    tags: ["lending"],
  })
  async withdraw(
    params: InferParams<typeof assetAmountParams>,
    ctx: { account: `0x${string}` },
  ) {
    assertNotNative(params.asset, "withdraw");
    const wei = parseUnits(params.amount, DECIMALS);
    return [this.pool.withdraw([params.asset, wei, ctx.account])];
  }

  @Receipt()
  withdrawReceipt(
    changes: readonly Change[],
  ): MossReceipt<{ operation: "withdraw" }> {
    return aaveReceipt(changes, "withdraw", WithdrawEventAbi);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  Capability: borrow
  // ═════════════════════════════════════════════════════════════════════════

  @Capability<AaveV3, typeof assetAmountParams>({
    intent: "Borrow {amount} of {asset} from Aave v3 at variable rate",
    verb: "borrow",
    params: assetAmountParams,
    receipt: "borrowReceipt",
    risk: ["fundOut"],
    tags: ["lending", "variable-rate"],
  })
  async borrow(
    params: InferParams<typeof assetAmountParams>,
    ctx: { account: `0x${string}` },
  ) {
    assertNotNative(params.asset, "borrow");
    const wei = parseUnits(params.amount, DECIMALS);
    // interestRateMode: 2 = variable rate, 0 = referralCode, ctx.account = onBehalfOf
    return [this.pool.borrow([params.asset, wei, 2n, 0, ctx.account])];
  }

  @Receipt()
  borrowReceipt(
    changes: readonly Change[],
  ): MossReceipt<{ operation: "borrow" }> {
    return aaveReceipt(changes, "borrow", BorrowEventAbi);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  Capability: repay
  // ═════════════════════════════════════════════════════════════════════════

  @Capability<AaveV3, typeof assetAmountParams>({
    intent: "Repay {amount} of {asset} on Aave v3",
    verb: "repay",
    params: assetAmountParams,
    receipt: "repayReceipt",
    risk: ["fundOut", "approval"],
    tags: ["lending"],
  })
  async repay(
    params: InferParams<typeof assetAmountParams>,
    ctx: { account: `0x${string}` },
  ) {
    assertNotNative(params.asset, "repay");
    const wei = parseUnits(params.amount, DECIMALS);
    const approveCap = await this.erc20.approve({
      token: params.asset,
      spender: POOL_ADDRESS,
      amount: MAX_APPROVAL.toString(),
    });
    // interestRateMode: 2 = variable rate
    return [approveCap, this.pool.repay([params.asset, wei, 2n, ctx.account])];
  }

  @Receipt()
  repayReceipt(
    changes: readonly Change[],
  ): MossReceipt<{ operation: "repay" }> {
    return aaveReceipt(changes, "repay", RepayEventAbi);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  Queries
  // ═════════════════════════════════════════════════════════════════════════

  @Query({
    intent: "Aave v3 user account data for {user}",
    params: userParam,
    tags: ["account-data"],
  })
  async userAccountData(
    params: InferParams<typeof userParam>,
    _ctx: { account: `0x${string}` },
  ) {
    const data = await this.pool.read.getUserAccountData([params.user]);
    const result = data as readonly [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
    ];
    return {
      totalCollateralBase: result[0].toString(),
      totalDebtBase: result[1].toString(),
      availableBorrowsBase: result[2].toString(),
      currentLiquidationThreshold: result[3].toString(),
      ltv: result[4].toString(),
      healthFactor: result[5].toString(),
    };
  }

  @Query({
    intent: "Aave v3 reserve data for {asset}",
    params: reserveParam,
    tags: ["reserve-data"],
  })
  async reserveData(
    params: InferParams<typeof reserveParam>,
    _ctx: { account: `0x${string}` },
  ) {
    const data = await this.pool.read.getReserveData([params.asset]);
    const d = data as unknown as readonly [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      number,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      string,
      bigint,
    ];
    return {
      liquidityRate: d[3].toString(),
      variableBorrowRate: d[4].toString(),
      aTokenAddress: d[8],
      stableDebtTokenAddress: d[9],
      variableDebtTokenAddress: d[10],
    };
  }
}

// ── Receipt helper ───────────────────────────────────────────────────────────

type ReceivableOperation = "supply" | "withdraw" | "borrow" | "repay";

/**
 * Build a MossReceipt from ordered Changes by decoding events that match
 * the Aave Pool address. Each decoded Change retains original object identity
 * to satisfy verifyReceiptCoverage.
 */
function aaveReceipt<O extends ReceivableOperation>(
  changes: readonly Change[],
  operation: O,
  eventAbi:
    | typeof SupplyEventAbi
    | typeof WithdrawEventAbi
    | typeof BorrowEventAbi
    | typeof RepayEventAbi,
): MossReceipt<{ operation: O }> {
  let found:
    | { reserve: `0x${string}`; user: `0x${string}`; amount: string }
    | undefined;
  const parsed = changes.map((change) => {
    if (change.kind !== "event" || change.address.toLowerCase() !== POOL_ADDR_LOWER) {
      return {
        kind: "change" as const,
        change,
        data: {} as Record<string, string>,
        text: `Observed ${operation} change`,
      };
    }
    const decoded = decodeEventLog({
      abi: eventAbi,
      data: change.data,
      topics: change.topics as [Hex, ...Hex[]],
      strict: true,
    }) as { eventName: string; args: Record<string, unknown> };
    if (found) {
      throw new Error(
        `aave-v3.${operation} Receipt: multiple Aave events not supported`,
      );
    }
    const args = decoded.args as {
      reserve: `0x${string}`;
      amount: bigint;
      user: `0x${string}` | undefined;
      to: `0x${string}` | undefined;
    };
    // Withdraw uses 'to' instead of 'user'. Normalise.
    const user = (args.to ?? args.user) as `0x${string}`;
    const formatted = formatUnits(args.amount, DECIMALS);
    found = { reserve: args.reserve, user, amount: formatted };
    return {
      kind: "change" as const,
      change,
      data: { operation, reserve: args.reserve, user, amount: formatted },
      text: describeAaveEvent(operation, args.reserve, user, formatted),
    };
  });
  if (!found) {
    return {
      kind: "receipt",
      outcome: { operation },
      text: describeAaveEvent(operation, "0x0" as `0x${string}`, "0x0" as `0x${string}`, "0"),
      changes: parsed,
    };
  }
  return {
    kind: "receipt",
    outcome: { operation },
    text: describeAaveEvent(operation, found.reserve, found.user, found.amount),
    changes: parsed,
  };
}

function describeAaveEvent(
  operation: string,
  reserve: `0x${string}`,
  user: `0x${string}`,
  amount: string,
): string {
  const labels: Record<string, string> = {
    supply: "Supplied",
    withdraw: "Withdrew",
    borrow: "Borrowed",
    repay: "Repaid",
  };
  const label = labels[operation] ?? operation;
  return `${label} ${amount} from reserve ${reserve} on behalf of ${user}`;
}
