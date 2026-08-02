/**
 * Aave v3 lending on the Monad mainnet market.
 *
 * Four Capabilities map one-to-one onto Moss verbs: `supply`, `withdraw`,
 * `borrow` and `repay`, all against the single Pool proxy. Two Queries read an
 * account's health and a reserve's current rates. Every Capability owns one
 * direct Pool transaction; `supply` and `repay` additionally nest one
 * exact-amount ERC-20 approval, because the Pool pulls the underlying with
 * `transferFrom`. Moss never signs and never sends.
 *
 * `borrow` is the interesting one for reconciliation: the asset flows in and
 * nothing flows out, because the cost is debt rather than an asset. Its Receipt
 * therefore proves an inflow plus a debt-token mint, and nothing else.
 *
 * The Monad market lists ERC-20 reserves only, with no native MON reserve and
 * no wrapped-native gateway in this adapter, so the asset parameter is an
 * address rather than a Token reference.
 *
 * Risk model (closed set per ADR 0003):
 *   - `fundOut`  - supply and repay send the underlying out of the account in
 *     the transaction itself, and withdraw burns the aToken position. All
 *     three are current-transaction asset outflow, which is what the label
 *     means.
 *   - `approval` - supply and repay grant the Pool an allowance.
 *   - `debt`     - borrow adds a repayment obligation. Nothing leaves the
 *     account in the transaction, which is the boundary `fundOut` draws and
 *     `debt` sits on the other side of.
 */
import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type CapabilityResult,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptChange,
  type ReceiptResult,
  toJsonSafe,
} from "@themoss/core";
import { ERC20, type ERC20Outcome } from "@themoss/erc";
import { decodeEventLog, formatUnits, getAddress, parseUnits } from "viem";
import { AavePoolAbi, AaveScaledTokenAbi } from "./abis/aave.js";
import { AAVE_V3_MONAD } from "./abis/address-book.js";
import { AAVE_RESERVES, type AaveReserve, reserveOf, reservePositionLabels } from "./tokens.js";
import type {
  AaveAccountData,
  AaveBorrowOutcome,
  AaveOperation,
  AavePositionChange,
  AaveRepayOutcome,
  AaveReserveData,
  AaveSupplyOutcome,
  AaveWithdrawOutcome,
} from "./types.js";

/**
 * Official Aave v3 deployment on Monad mainnet. Source: the Aave DAO address
 * book (`AaveV3Monad`, `CHAIN_ID` 143), vendored under `abis-src/` and derived
 * into `src/abis/address-book.ts`; the generator refuses any other chain id.
 * The live Monad suite checks deployed bytecode, the provider/Pool round trip
 * and the Pool proxy's ERC-1967 implementation slot.
 */
export const AAVE_POOL_ADDRESS: AddressValue = getAddress(AAVE_V3_MONAD.POOL);
export const AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS: AddressValue = getAddress(
  AAVE_V3_MONAD.POOL_ADDRESSES_PROVIDER,
);
export const AAVE_POOL_IMPLEMENTATION_ADDRESS: AddressValue = getAddress(AAVE_V3_MONAD.POOL_IMPL);

/**
 * Aave's `interestRateMode` enum is `NONE = 0, STABLE = 1, VARIABLE = 2`.
 * Aave v3.2 removed stable-rate borrowing and this deployment agrees: every
 * reserve reports `stableDebtTokenAddress = address(0)`, and a `borrow` with
 * mode 1 reverts on chain (checked on Monad mainnet, 2026-08-01). Variable is
 * the only reachable mode, so it is a constant here rather than a parameter an
 * Agent could get wrong.
 */
const VARIABLE_INTEREST_RATE_MODE = 2n;

/** Aave takes no referral fee; the code has been inert since v2. */
const NO_REFERRAL_CODE = 0;

/** Aave's year for interest maths (`MathUtils.SECONDS_PER_YEAR`, 365 days). */
const SECONDS_PER_YEAR = 31_536_000;
/** Reserve rates and indices are ray-scaled: 1 ray is 1e27. */
const RAY_DECIMALS = 27;
/** Aave reports a health factor with 18 decimals, and `uint256` max for none. */
const HEALTH_FACTOR_DECIMALS = 18;
const NO_DEBT_HEALTH_FACTOR = (1n << 256n) - 1n;

const supplyParams = {
  asset: {
    type: Address,
    description: "Reserve asset deposited into the market as an interest-bearing position.",
  },
  amount: { type: PositiveDecimalString, description: "Quantity of the reserve asset to deposit." },
} satisfies ParamsSpec;

const withdrawParams = {
  asset: { type: Address, description: "Reserve asset whose supply position is redeemed." },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the reserve asset to take back out of the market.",
  },
} satisfies ParamsSpec;

const borrowParams = {
  asset: {
    type: Address,
    description: "Reserve asset borrowed against the account's existing collateral.",
  },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the reserve asset to draw as variable-rate debt.",
  },
} satisfies ParamsSpec;

const repayParams = {
  asset: { type: Address, description: "Reserve asset whose variable-rate debt is paid down." },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the reserve asset to pay back.",
  },
} satisfies ParamsSpec;

const accountParams = {
  user: {
    type: Address,
    description: "Account whose market-wide collateral, debt and health are read.",
  },
} satisfies ParamsSpec;

const reserveParams = {
  asset: {
    type: Address,
    description: "Reserve asset whose current rates and position tokens are read.",
  },
} satisfies ParamsSpec;

type SupplyParams = InferParams<typeof supplyParams>;
type WithdrawParams = InferParams<typeof withdrawParams>;
type BorrowParams = InferParams<typeof borrowParams>;
type RepayParams = InferParams<typeof repayParams>;

type AavePoolEvent = ReturnType<typeof decodeEventLog<typeof AavePoolAbi>>;
type PoolEventName = "Supply" | "Withdraw" | "Borrow" | "Repay";
type OperationEvent<TName extends PoolEventName> = Extract<AavePoolEvent, { eventName: TName }>;
/** Which of a reserve's two position tokens an operation moves. */
type PositionSide = "aToken" | "variableDebtToken";
/** Whether the underlying moves before or after the position token changes. */
type FlowOrder = "underlyingFirst" | "positionFirst";

interface IndexedTransfer {
  outcome: Extract<ERC20Outcome, { operation: "transfer" }>;
  changeIndex: number;
}

/** The evidence the shared checks need, whichever operation produced it. */
interface Evidence {
  parsed: (ReceiptChange | ReceiptResult)[];
  reserve: AaveReserve;
  operation: AaveOperation;
  eventIndex: number;
  position: AavePositionChange;
  /** Account named by the position event's indexed owner argument. */
  positionOwner: AddressValue;
  positionIndex: number;
  transfers: readonly IndexedTransfer[];
  collateral: "enabled" | "disabled" | null;
}

interface Collected<TName extends PoolEventName> extends Evidence {
  event: OperationEvent<TName>;
}

@Protocol({
  name: "aave",
  category: "lending",
  description:
    "Aave v3 lending on Monad: supply and withdraw reserve assets, draw and repay variable-rate " +
    "debt, and read account health and reserve rates.",
  contracts: { pool: { abi: AavePoolAbi, addr: AAVE_POOL_ADDRESS } },
  labels: {
    Pool: AAVE_POOL_ADDRESS,
    PoolAddressesProvider: AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS,
    ...reservePositionLabels(),
  },
  protocols: { erc20: ERC20 },
})
export class Aave {
  declare pool: Handle<typeof AavePoolAbi>;
  declare erc20: ProtocolRef<ERC20>;

  @Capability<Aave, typeof supplyParams>({
    intent: "Supply {amount} of {asset} to the Aave v3 market on Monad",
    verb: "supply",
    params: supplyParams,
    receipt: "supplyReceipt",
    risk: ["fundOut", "approval"],
    tags: ["lending", "aave-v3", "collateral"],
  })
  async supply(params: SupplyParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const { reserve, amount } = prepare(params.asset, params.amount);
    return [
      await this.erc20.approve({
        token: reserve.underlying,
        spender: AAVE_POOL_ADDRESS,
        amount: amount.toString(),
      }),
      this.pool.supply([reserve.underlying, amount, ctx.account, NO_REFERRAL_CODE]),
    ];
  }

  @Capability<Aave, typeof withdrawParams>({
    intent: "Withdraw {amount} of {asset} from the Aave v3 market on Monad",
    verb: "withdraw",
    params: withdrawParams,
    receipt: "withdrawReceipt",
    risk: ["fundOut"],
    tags: ["lending", "aave-v3"],
  })
  async withdraw(params: WithdrawParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const { reserve, amount } = prepare(params.asset, params.amount);
    return [this.pool.withdraw([reserve.underlying, amount, ctx.account])];
  }

  @Capability<Aave, typeof borrowParams>({
    intent: "Borrow {amount} of {asset} against Aave v3 collateral on Monad",
    verb: "borrow",
    params: borrowParams,
    receipt: "borrowReceipt",
    // Nothing leaves the account here: the cost is the obligation, not an
    // outflow, so this is `debt` rather than `fundOut`.
    risk: ["debt"],
    tags: ["lending", "aave-v3", "debt"],
  })
  async borrow(params: BorrowParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const { reserve, amount } = prepare(params.asset, params.amount);
    return [
      this.pool.borrow([
        reserve.underlying,
        amount,
        VARIABLE_INTEREST_RATE_MODE,
        NO_REFERRAL_CODE,
        ctx.account,
      ]),
    ];
  }

  @Capability<Aave, typeof repayParams>({
    intent: "Repay {amount} of {asset} of Aave v3 debt on Monad",
    verb: "repay",
    params: repayParams,
    receipt: "repayReceipt",
    risk: ["fundOut", "approval"],
    tags: ["lending", "aave-v3", "debt"],
  })
  async repay(params: RepayParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const { reserve, amount } = prepare(params.asset, params.amount);
    return [
      await this.erc20.approve({
        token: reserve.underlying,
        spender: AAVE_POOL_ADDRESS,
        amount: amount.toString(),
      }),
      this.pool.repay([reserve.underlying, amount, VARIABLE_INTEREST_RATE_MODE, ctx.account]),
    ];
  }

  @Query({
    intent: "Read {user}'s Aave v3 collateral, debt, borrowing power and health factor",
    params: accountParams,
    tags: ["lending", "aave-v3", "health"],
  })
  async accountData(params: InferParams<typeof accountParams>): Promise<AaveAccountData> {
    const [collateral, debt, availableBorrows, liquidationThreshold, ltv, healthFactor] =
      await this.pool.read.getUserAccountData([params.user]);
    return {
      user: params.user,
      totalCollateralBase: collateral.toString(),
      totalDebtBase: debt.toString(),
      availableBorrowsBase: availableBorrows.toString(),
      currentLiquidationThreshold: Number(liquidationThreshold),
      ltv: Number(ltv),
      healthFactor:
        healthFactor === NO_DEBT_HEALTH_FACTOR
          ? null
          : formatUnits(healthFactor, HEALTH_FACTOR_DECIMALS),
    };
  }

  @Query({
    intent: "Read the current Aave v3 supply and variable borrow rates for {asset}",
    params: reserveParams,
    tags: ["lending", "aave-v3", "apy"],
  })
  async reserve(params: InferParams<typeof reserveParams>): Promise<AaveReserveData> {
    const reserve = requireReserve(params.asset, "asset");
    const data = await this.pool.read.getReserveData([reserve.underlying]);
    // The static table is what the Receipt parsers trust as legitimate
    // emitters, so a Query that touches a reserve re-checks it against the
    // Pool's own view instead of assuming the listing never moved.
    if (
      !sameAddress(data.aTokenAddress, reserve.aToken) ||
      !sameAddress(data.variableDebtTokenAddress, reserve.variableDebtToken)
    ) {
      throw new Error(
        `Aave reserve ${reserve.symbol} reports position tokens this package does not know; re-run update:abis`,
      );
    }
    return {
      asset: reserve.underlying,
      symbol: reserve.symbol,
      decimals: reserve.decimals,
      aToken: reserve.aToken,
      variableDebtToken: reserve.variableDebtToken,
      supplyApr: formatUnits(data.currentLiquidityRate, RAY_DECIMALS),
      supplyApy: annualPercentageYield(data.currentLiquidityRate),
      variableBorrowApr: formatUnits(data.currentVariableBorrowRate, RAY_DECIMALS),
      variableBorrowApy: annualPercentageYield(data.currentVariableBorrowRate),
      liquidityIndex: data.liquidityIndex.toString(),
      variableBorrowIndex: data.variableBorrowIndex.toString(),
    };
  }

  @Receipt()
  supplyReceipt(changes: readonly Change[]): ReceiptResult<AaveSupplyOutcome> {
    const found = this.#collect("supply", "Supply", "aToken", changes);
    const { args } = found.event;
    // SupplyLogic pulls the underlying, then mints the aToken, then the Pool
    // announces the supply. A supply always mints: it never removes balance.
    requirePosition(found, { owner: args.onBehalfOf, event: "Mint" });
    requireUnderlyingFlow(found, {
      from: args.user,
      to: found.reserve.aToken,
      amount: args.amount,
      order: "underlyingFirst",
    });
    const outcome: AaveSupplyOutcome = {
      operation: "supply",
      protocol: "aave",
      asset: getAddress(args.reserve),
      symbol: found.reserve.symbol,
      amount: args.amount.toString(),
      user: getAddress(args.user),
      onBehalfOf: getAddress(args.onBehalfOf),
      position: found.position,
      collateral: found.collateral === "enabled" ? "enabled" : null,
    };
    return {
      kind: "receipt",
      outcome,
      text: `Aave Supply: ${outcome.amount} ${outcome.asset} for ${outcome.onBehalfOf}`,
      changes: found.parsed,
    };
  }

  @Receipt()
  withdrawReceipt(changes: readonly Change[]): ReceiptResult<AaveWithdrawOutcome> {
    const found = this.#collect("withdraw", "Withdraw", "aToken", changes);
    const { args } = found.event;
    requirePosition(found, { owner: args.user });
    requireUnderlyingFlow(found, {
      from: found.reserve.aToken,
      to: args.to,
      amount: args.amount,
      order: "positionFirst",
    });
    const outcome: AaveWithdrawOutcome = {
      operation: "withdraw",
      protocol: "aave",
      asset: getAddress(args.reserve),
      symbol: found.reserve.symbol,
      amount: args.amount.toString(),
      user: getAddress(args.user),
      to: getAddress(args.to),
      position: found.position,
      collateral: found.collateral === "disabled" ? "disabled" : null,
    };
    return {
      kind: "receipt",
      outcome,
      text: `Aave Withdraw: ${outcome.amount} ${outcome.asset} to ${outcome.to}`,
      changes: found.parsed,
    };
  }

  @Receipt()
  borrowReceipt(changes: readonly Change[]): ReceiptResult<AaveBorrowOutcome> {
    const found = this.#collect("borrow", "Borrow", "variableDebtToken", changes);
    const { args } = found.event;
    if (BigInt(args.interestRateMode) !== VARIABLE_INTEREST_RATE_MODE) {
      throw new Error(
        `Aave borrow Receipt saw interest rate mode ${args.interestRateMode}; only variable exists`,
      );
    }
    requirePosition(found, { owner: args.onBehalfOf, event: "Mint" });
    requireUnderlyingFlow(found, {
      from: found.reserve.aToken,
      to: args.user,
      amount: args.amount,
      order: "positionFirst",
    });
    const outcome: AaveBorrowOutcome = {
      operation: "borrow",
      protocol: "aave",
      asset: getAddress(args.reserve),
      symbol: found.reserve.symbol,
      amount: args.amount.toString(),
      user: getAddress(args.user),
      onBehalfOf: getAddress(args.onBehalfOf),
      position: found.position,
      interestRateMode: "variable",
      borrowRate: args.borrowRate.toString(),
    };
    return {
      kind: "receipt",
      outcome,
      text: `Aave Borrow: ${outcome.amount} ${outcome.asset} to ${outcome.user} as variable-rate debt for ${outcome.onBehalfOf}`,
      changes: found.parsed,
    };
  }

  @Receipt()
  repayReceipt(changes: readonly Change[]): ReceiptResult<AaveRepayOutcome> {
    const found = this.#collect("repay", "Repay", "variableDebtToken", changes);
    const { args } = found.event;
    if (args.useATokens) {
      throw new Error("Aave repay Receipt saw an aToken repayment; this Capability pays in kind");
    }
    requirePosition(found, { owner: args.user });
    requireUnderlyingFlow(found, {
      from: args.repayer,
      to: found.reserve.aToken,
      amount: args.amount,
      order: "positionFirst",
    });
    const outcome: AaveRepayOutcome = {
      operation: "repay",
      protocol: "aave",
      asset: getAddress(args.reserve),
      symbol: found.reserve.symbol,
      amount: args.amount.toString(),
      user: getAddress(args.user),
      repayer: getAddress(args.repayer),
      position: found.position,
      interestRateMode: "variable",
    };
    return {
      kind: "receipt",
      outcome,
      text: `Aave Repay: ${outcome.amount} ${outcome.asset} of ${outcome.user}'s variable-rate debt, paid by ${outcome.repayer}`,
      changes: found.parsed,
    };
  }

  /**
   * The evidence every lending Receipt shares. One pass classifies each Change
   * and keeps the original object, then the collected records are checked:
   * exactly one Pool event of the expected kind emitted by the Pool itself,
   * exactly one scaled-balance event emitted by that reserve's own position
   * token, and no token movements outside the reserve's two tokens.
   */
  #collect<TName extends PoolEventName>(
    operation: AaveOperation,
    expected: TName,
    side: PositionSide,
    changes: readonly Change[],
  ): Collected<TName> {
    let operationEvent:
      | { event: OperationEvent<TName>; reserve: AddressValue; changeIndex: number }
      | undefined;
    let collateral: "enabled" | "disabled" | null = null;
    const positions: { data: AavePositionChange; owner: AddressValue; changeIndex: number }[] = [];
    const transfers: IndexedTransfer[] = [];
    const tokensTouched = new Set<string>();

    const parsed = changes.map((change, changeIndex): ReceiptChange | ReceiptResult => {
      if (change.kind === "nativeTransfer") {
        throw new Error(`Unexpected Change: Aave ${operation} moved native MON`);
      }

      if (sameAddress(change.address, AAVE_POOL_ADDRESS)) {
        const event = decodePoolEvent(change, operation);
        const data = { event: event.eventName, args: toJsonSafe(event.args) };
        if (
          event.eventName === "Supply" ||
          event.eventName === "Withdraw" ||
          event.eventName === "Borrow" ||
          event.eventName === "Repay"
        ) {
          // Narrowed to the four operation events, which all carry `reserve`.
          if (event.eventName !== expected) {
            throw new Error(
              `Unexpected Change: the Aave Pool emitted ${event.eventName} during a ${operation}`,
            );
          }
          if (operationEvent) {
            throw new Error(`Aave ${operation} emitted multiple Pool ${expected} events`);
          }
          // Sound because of the equality guard directly above: TypeScript
          // cannot narrow a union against a still-generic literal itself.
          operationEvent = {
            event: event as OperationEvent<TName>,
            reserve: getAddress(event.args.reserve),
            changeIndex,
          };
          return {
            kind: "change",
            change,
            data,
            text: `Aave Pool ${event.eventName}: ${describeArgs(event.args)}`,
          };
        }
        if (event.eventName === "ReserveDataUpdated") {
          return {
            kind: "change",
            change,
            data,
            text: `Aave Reserve Rates Updated: ${event.args.reserve} supply ${event.args.liquidityRate}, variable borrow ${event.args.variableBorrowRate} (ray)`,
          };
        }
        if (
          event.eventName === "ReserveUsedAsCollateralEnabled" ||
          event.eventName === "ReserveUsedAsCollateralDisabled"
        ) {
          if (collateral) {
            throw new Error(`Aave ${operation} toggled collateral use more than once`);
          }
          collateral =
            event.eventName === "ReserveUsedAsCollateralEnabled" ? "enabled" : "disabled";
          return {
            kind: "change",
            change,
            data,
            text: `Aave Collateral ${collateral}: ${event.args.reserve} for ${event.args.user}`,
          };
        }
        throw new Error(
          `Unexpected Change: the Aave Pool emitted ${event.eventName} during a ${operation}`,
        );
      }

      const scaled = tryDecodeScaledEvent(change);
      if (scaled && (scaled.eventName === "Mint" || scaled.eventName === "Burn")) {
        const owner = getAddress(
          scaled.eventName === "Mint" ? scaled.args.onBehalfOf : scaled.args.from,
        );
        const data: AavePositionChange = {
          event: scaled.eventName,
          token: getAddress(change.address),
          amount: scaled.args.value.toString(),
          balanceIncrease: scaled.args.balanceIncrease.toString(),
          index: scaled.args.index.toString(),
        };
        positions.push({ data, owner, changeIndex });
        tokensTouched.add(data.token.toLowerCase());
        return {
          kind: "change",
          change,
          data,
          text: `Aave Position ${data.event}: ${data.amount} of ${data.token} for ${owner}, ${data.balanceIncrease} interest accrued`,
        };
      }

      const receipt = this.erc20.changesReceipt([change]);
      for (const outcome of receipt.outcome) {
        if (outcome.token !== "native") tokensTouched.add(outcome.token.toLowerCase());
        if (outcome.operation === "transfer" && outcome.token !== "native") {
          transfers.push({ outcome, changeIndex });
        }
      }
      return receipt;
    });

    if (!operationEvent) {
      throw new Error(`Aave ${operation} Receipt requires the Pool ${expected} event`);
    }
    const reserve = reserveOf(operationEvent.reserve);
    if (!reserve) {
      throw new Error(
        `Aave ${operation} Receipt names reserve ${operationEvent.reserve}, which this package does not list`,
      );
    }
    const [position] = positions;
    if (!position || positions.length !== 1) {
      throw new Error(
        `Aave ${operation} Receipt requires exactly one position Mint or Burn; saw ${positions.length}`,
      );
    }
    if (!sameAddress(position.data.token, reserve[side])) {
      throw new Error(
        `Aave ${operation} Receipt position event came from ${position.data.token}, not ${reserve.symbol}'s ${side}`,
      );
    }
    const allowed = new Set([reserve.underlying.toLowerCase(), reserve[side].toLowerCase()]);
    for (const token of tokensTouched) {
      if (!allowed.has(token)) {
        throw new Error(
          `Unexpected Change: Aave ${operation} touched ${token}, which is neither ${reserve.symbol} nor its ${side}`,
        );
      }
    }

    return {
      parsed,
      reserve,
      event: operationEvent.event,
      eventIndex: operationEvent.changeIndex,
      position: position.data,
      positionOwner: position.owner,
      positionIndex: position.changeIndex,
      transfers,
      collateral,
      operation,
    } satisfies Collected<TName>;
  }
}

function prepare(asset: AddressValue, amount: string): { reserve: AaveReserve; amount: bigint } {
  const reserve = requireReserve(asset, "asset");
  const units = parseUnits(amount, reserve.decimals);
  if (units <= 0n) {
    throw new ParameterError(
      `amount rounds to zero in ${reserve.symbol}'s ${reserve.decimals} decimals`,
    );
  }
  return { reserve, amount: units };
}

function requireReserve(asset: AddressValue, field: string): AaveReserve {
  const reserve = reserveOf(asset);
  if (!reserve) {
    throw new ParameterError(
      `${field} ${asset} is not an Aave v3 reserve on Monad; listed reserves are ${AAVE_RESERVES.map(({ symbol }) => symbol).join(", ")}`,
    );
  }
  return reserve;
}

/**
 * Aave prices reserve rates per year in ray and compounds them per second, the
 * same convention `MathUtils.calculateCompoundedInterest` uses on chain, so
 * `APY = (1 + APR / SECONDS_PER_YEAR) ^ SECONDS_PER_YEAR - 1`.
 */
function annualPercentageYield(ratePerYearRay: bigint): string {
  const apr = Number(formatUnits(ratePerYearRay, RAY_DECIMALS));
  return Math.expm1(SECONDS_PER_YEAR * Math.log1p(apr / SECONDS_PER_YEAR)).toFixed(18);
}

/**
 * The one underlying movement this operation is allowed to make, matched on
 * token, both ends and the exact amount the Pool reported. A second transfer of
 * the same reserve is a Change the Receipt cannot explain, so it fails.
 *
 * Aave's logic libraries also fix the order: a supply transfers the underlying
 * in before minting the aToken, while a withdraw, a borrow and a repay change
 * the position token first and move the underlying after. Both have to land
 * before the Pool announces the operation.
 */
function requireUnderlyingFlow(
  found: Evidence,
  expected: { from: string; to: string; amount: bigint; order: FlowOrder },
): void {
  const underlying = found.transfers.filter(({ outcome }) =>
    sameAddress(outcome.token, found.reserve.underlying),
  );
  const [matched] = underlying.filter(
    ({ outcome }) =>
      sameAddress(outcome.from, expected.from) &&
      sameAddress(outcome.to, expected.to) &&
      outcome.amount === expected.amount.toString(),
  );
  if (!matched) {
    throw new Error(
      `Aave ${found.operation} Receipt requires one ${found.reserve.symbol} transfer of ${expected.amount} from ${expected.from} to ${expected.to}`,
    );
  }
  if (underlying.length !== 1) {
    throw new Error(
      `Aave ${found.operation} Receipt saw ${underlying.length} ${found.reserve.symbol} transfers; exactly one belongs to this operation`,
    );
  }
  if (matched.changeIndex >= found.eventIndex) {
    throw new Error(
      `Aave ${found.operation} Receipt saw its ${found.reserve.symbol} transfer after the Pool event`,
    );
  }
  const ordered =
    expected.order === "underlyingFirst"
      ? matched.changeIndex < found.positionIndex
      : found.positionIndex < matched.changeIndex;
  if (!ordered) {
    throw new Error(
      `Aave ${found.operation} Receipt saw its ${found.reserve.symbol} transfer and position event in the wrong order`,
    );
  }
}

/**
 * The position event has to name the account the Pool named. `event` pins the
 * kind where only one is reachable: a supply or a borrow always mints. A
 * withdraw or a repay normally burns, but `_burnScaled` mints the difference
 * when accrued interest exceeds the amount removed, so those accept both.
 */
function requirePosition(found: Evidence, expected: { owner: string; event?: "Mint" }): void {
  if (expected.event && found.position.event !== expected.event) {
    throw new Error(
      `Aave ${found.operation} Receipt expected a position ${expected.event}, saw ${found.position.event}`,
    );
  }
  if (!sameAddress(found.positionOwner, expected.owner)) {
    throw new Error(
      `Aave ${found.operation} Receipt position event names ${found.positionOwner}, not ${expected.owner}`,
    );
  }
  if (found.positionIndex >= found.eventIndex) {
    throw new Error(`Aave ${found.operation} Receipt saw its position event after the Pool event`);
  }
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function decodePoolEvent(change: Extract<Change, { kind: "event" }>, operation: AaveOperation) {
  try {
    return decodeEventLog({
      abi: AavePoolAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    throw new Error(
      `Unexpected Change: the Aave Pool emitted an event this adapter cannot decode during a ${operation}`,
    );
  }
}

function tryDecodeScaledEvent(change: Extract<Change, { kind: "event" }>) {
  try {
    return decodeEventLog({
      abi: AaveScaledTokenAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}

function describeArgs(args: unknown): string {
  return Object.entries(args as Record<string, unknown>)
    .map(([key, value]) => `${key} ${String(value)}`)
    .join(", ");
}
