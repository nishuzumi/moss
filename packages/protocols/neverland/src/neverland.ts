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
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { ERC20, ERC20Abi, WETH9Abi } from "@themoss/erc";
import { WMON_ADDRESS } from "@themoss/system";
import { decodeEventLog, parseUnits } from "viem";
import {
  NeverlandATokenAbi,
  NeverlandPoolAbi,
  NeverlandRewardsAbi,
  NeverlandVariableDebtTokenAbi,
  PriceObservedAbi,
  WrappedTokenGatewayAbi,
} from "./abis/neverland.js";

// Official Neverland lending deployment on Monad mainnet:
// https://docs.neverland.money/smart-contracts (retrieved 2026-07-25), mirrored
// in Neverland-Money/neverland-tokenomics deployments/mainnet/addresses.json.
// The live tests verify deployed bytecode; abis.json pins the Pool's ERC-1967
// implementation so an upgrade turns the online cross-check red.
export const NEVERLAND_POOL_ADDRESS = "0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585" as const;
export const NEVERLAND_GATEWAY_ADDRESS = "0x800409dBd7157813BB76501c30e04596Cc478f25" as const;

// Neverland's rewards controller (inherits the Aave IRewardsDistributor surface
// and emits `Accrued` on every nToken / debt-token action). It is not part of
// the Pool or gateway ABIs, so the Receipt recognises its reward events here.
// Canonical source: Neverland-Money/neverland-tokenomics
//   deployments/mainnet/addresses.json (DustRewardsController proxy).
export const NEVERLAND_REWARDS_CONTROLLER = "0x57ea245cCbfab074babb9d01d1f0c60525e52cec" as const;

// Zero address doubles as the "burn/mint" marker on ERC-20 Transfers: a token
// contract moving units to/from zero (or through the pool/gateway) for an
// operation actor at the operation amount is, within the pure Receipt boundary,
// the operation's own reserve token. Mint/Burn debiting of that token therefore
// carries its identity.
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// aToken/interest-index scaling can make a minted nToken or debt-token unit
// amount differ from the Pool event amount by a few wei (observed: 1 wei on a
// live Monad supply). Reserve-token identity tolerates that rounding, while an
// attacker's fabricated transfer of an unrelated magnitude still fails closed.
const RESERVE_TOKEN_ROUNDING_TOLERANCE = 2n;

// Auxiliary decode helper for the reserve tokens (nToken / variable-debt token)
// that the Pool mints/burns atomically with each operation. These are Aave V3
// standard `Mint` / `Burn` accounting events emitted by dynamically discovered
// token addresses — they are not ERC-20 events, so erc20.changesReceipt would
// reject them. They are accepted as auxiliary evidence without altering the
// authoritative Pool operation record.
// The aToken and VariableDebtToken ABIs are vendored from @aave/core-v3's
// full-hardhat-artifact artifacts (ADR 0007). Their `Mint`/`Burn` events
// are emitted by dynamically discovered reserve-token addresses — the
// combined ABI is used solely for Receipt evidence coverage.
const NeverlandReserveTokenAbi = [...NeverlandATokenAbi, ...NeverlandVariableDebtTokenAbi] as const;

// Neverland retains Aave V3 signatures; stable-rate borrowing intentionally
// reverts in this release, so the adapter only offers variable-rate debt.
const VARIABLE_RATE_MODE = 2n;
const REFERRAL_CODE = 0;

const supplyParams = {
  asset: {
    type: Address,
    description: "Asset to deposit as collateral into Neverland.",
  },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the reserve asset to supply, in its display units.",
  },
  onBehalfOf: {
    type: Address.optional(),
    description: "Account that receives nTokens; defaults to the caller.",
  },
} satisfies ParamsSpec;

const supplyNativeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of native MON to wrap and supply; MON uses 18 decimals.",
  },
  onBehalfOf: {
    type: Address.optional(),
    description: "Account that receives nWMON; defaults to the caller.",
  },
} satisfies ParamsSpec;

const withdrawParams = {
  asset: {
    type: Address,
    description: "Asset to withdraw from Neverland.",
  },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the reserve asset to withdraw, in its display units.",
  },
  to: {
    type: Address.optional(),
    description: "Account that receives the withdrawn asset; defaults to the caller.",
  },
} satisfies ParamsSpec;

const withdrawNativeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of MON to withdraw and unwrap; MON uses 18 decimals.",
  },
  to: {
    type: Address.optional(),
    description: "Account that receives the native MON; defaults to the caller.",
  },
} satisfies ParamsSpec;

const borrowParams = {
  asset: {
    type: Address,
    description: "Asset to borrow from Neverland.",
  },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the reserve asset to borrow, in its display units.",
  },
  onBehalfOf: {
    type: Address.optional(),
    description: "Account that takes on the variable-rate debt; defaults to the caller.",
  },
} satisfies ParamsSpec;

const repayParams = {
  asset: {
    type: Address,
    description: "Asset whose debt is being repaid.",
  },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the reserve asset to repay, in its display units.",
  },
  onBehalfOf: {
    type: Address.optional(),
    description: "Account whose variable-rate debt is repaid; defaults to the caller.",
  },
} satisfies ParamsSpec;

const reserveParams = {
  asset: {
    type: Address,
    description: "Neverland reserve asset whose data is queried.",
  },
} satisfies ParamsSpec;

const noParams = {} satisfies ParamsSpec;

const accountParams = {
  user: { type: Address, description: "Account whose lending position is read." },
} satisfies ParamsSpec;

const accountReserveParams = {
  asset: {
    type: Address,
    description: "Neverland reserve asset whose account position is queried.",
  },
  user: { type: Address, description: "Account whose reserve position is read." },
} satisfies ParamsSpec;

type PriceObservation = {
  event: "PriceObserved";
  emitter: AddressValue;
  asset: AddressValue;
  price: string;
  baseUnit: string;
  oracle: AddressValue;
  action: number;
  ok: boolean;
  user: AddressValue;
  timestamp: string;
};

type RewardObservation = {
  event: "Accrued";
  emitter: AddressValue;
  asset: AddressValue;
  reward: AddressValue;
  user: AddressValue;
  assetIndex: string;
  userIndex: string;
  rewardsAccrued: string;
};

type ReserveUpdate = {
  event: "ReserveDataUpdated";
  reserve: AddressValue;
  liquidityRate: string;
  stableBorrowRate: string;
  variableBorrowRate: string;
  liquidityIndex: string;
  variableBorrowIndex: string;
};

type BaseNeverlandOutcome = {
  protocol: "neverland";
  asset: AddressValue;
  amount: string;
  priceObservations: readonly PriceObservation[];
  rewardObservations: readonly RewardObservation[];
};

export type NeverlandOutcome =
  | (BaseNeverlandOutcome & {
      operation: "supply" | "supplyNative";
      user: AddressValue;
      onBehalfOf: AddressValue;
    })
  | (BaseNeverlandOutcome & {
      operation: "withdraw" | "withdrawNative";
      user: AddressValue;
      to: AddressValue;
    })
  | (BaseNeverlandOutcome & {
      operation: "borrow";
      user: AddressValue;
      onBehalfOf: AddressValue;
    })
  | (BaseNeverlandOutcome & {
      operation: "repay";
      user: AddressValue;
      repayer: AddressValue;
    });

type NeverlandOperation = NeverlandOutcome["operation"];

const OPERATION_ACTION = {
  supply: 1,
  supplyNative: 1,
  borrow: 2,
  repay: 3,
  withdraw: 7,
  withdrawNative: 7,
} as const satisfies Record<NeverlandOperation, number>;

const OPERATION_EVENT = {
  supply: "Supply",
  supplyNative: "Supply",
  withdraw: "Withdraw",
  withdrawNative: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
} as const satisfies Record<NeverlandOperation, string>;

type InferredParams<S extends ParamsSpec> = InferParams<S>;
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type SupplyInput = WithOptional<InferredParams<typeof supplyParams>, "onBehalfOf">;
type SupplyNativeInput = WithOptional<InferredParams<typeof supplyNativeParams>, "onBehalfOf">;
type WithdrawInput = WithOptional<InferredParams<typeof withdrawParams>, "to">;
type WithdrawNativeInput = WithOptional<InferredParams<typeof withdrawNativeParams>, "to">;
type BorrowInput = WithOptional<InferredParams<typeof borrowParams>, "onBehalfOf">;
type RepayInput = WithOptional<InferredParams<typeof repayParams>, "onBehalfOf">;

@Protocol({
  name: "neverland",
  category: "lending",
  description:
    "Neverland lending on Monad: supply and borrow reserves, with native MON via the wrapped-token gateway.",
  contracts: {
    pool: { abi: NeverlandPoolAbi, addr: NEVERLAND_POOL_ADDRESS },
    gateway: { abi: WrappedTokenGatewayAbi, addr: NEVERLAND_GATEWAY_ADDRESS },
  },
  labels: {
    Pool: NEVERLAND_POOL_ADDRESS,
    Gateway: NEVERLAND_GATEWAY_ADDRESS,
  },
  protocols: { erc20: ERC20 },
})
export class Neverland {
  declare pool: Handle<typeof NeverlandPoolAbi>;
  declare gateway: Handle<typeof WrappedTokenGatewayAbi>;
  declare erc20: ProtocolRef<ERC20>;

  supply(params: SupplyInput, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Neverland, typeof supplyParams>({
    intent: "Supply a reserve asset into Neverland to earn interest",
    verb: "supply",
    params: supplyParams,
    receipt: "supplyReceipt",
    risk: ["fundOut", "approval"],
    tags: ["lending", "aave-v3"],
  })
  async supply(params: SupplyInput, ctx: ActionCtx) {
    const amount = await this.#baseUnits(params.asset, params.amount);
    const approval = await this.erc20.approve({
      token: params.asset,
      spender: this.pool.address,
      amount: amount.toString(),
    });
    return [
      approval,
      this.pool.supply([params.asset, amount, params.onBehalfOf ?? ctx.account, REFERRAL_CODE]),
    ];
  }

  supplyNative(params: SupplyNativeInput, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Neverland, typeof supplyNativeParams>({
    intent: "Wrap native MON and supply it into Neverland",
    verb: "supply",
    params: supplyNativeParams,
    receipt: "supplyNativeReceipt",
    risk: ["fundOut"],
    tags: ["lending", "aave-v3", "native"],
  })
  async supplyNative(params: SupplyNativeInput, ctx: ActionCtx) {
    const amount = parseUnits(params.amount, 18);
    return [
      this.gateway.depositETH(
        [this.pool.address, params.onBehalfOf ?? ctx.account, REFERRAL_CODE],
        {
          value: amount,
        },
      ),
    ];
  }

  withdraw(params: WithdrawInput, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Neverland, typeof withdrawParams>({
    intent: "Withdraw a supplied reserve asset from Neverland",
    verb: "withdraw",
    params: withdrawParams,
    receipt: "withdrawReceipt",
    risk: ["fundOut"],
    tags: ["lending", "aave-v3"],
  })
  async withdraw(params: WithdrawInput, ctx: ActionCtx) {
    const amount = await this.#baseUnits(params.asset, params.amount);
    return [this.pool.withdraw([params.asset, amount, params.to ?? ctx.account])];
  }

  withdrawNative(params: WithdrawNativeInput, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Neverland, typeof withdrawNativeParams>({
    intent: "Withdraw supplied WMON from Neverland and unwrap it into native MON",
    verb: "withdraw",
    params: withdrawNativeParams,
    receipt: "withdrawNativeReceipt",
    risk: ["fundOut", "approval"],
    tags: ["lending", "aave-v3", "native"],
  })
  async withdrawNative(params: WithdrawNativeInput, ctx: ActionCtx) {
    const amount = parseUnits(params.amount, 18);
    const reserve = await this.pool.read.getReserveData([WMON_ADDRESS]);
    const approval = await this.erc20.approve({
      token: reserve.aTokenAddress,
      spender: this.gateway.address,
      amount: amount.toString(),
    });
    return [
      approval,
      this.gateway.withdrawETH([this.pool.address, amount, params.to ?? ctx.account]),
    ];
  }

  borrow(params: BorrowInput, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Neverland, typeof borrowParams>({
    intent: "Borrow a reserve asset from Neverland at the variable rate",
    verb: "borrow",
    params: borrowParams,
    receipt: "borrowReceipt",
    risk: ["debt", "priceImpact"],
    tags: ["lending", "aave-v3", "debt"],
  })
  async borrow(params: BorrowInput, ctx: ActionCtx) {
    const amount = await this.#baseUnits(params.asset, params.amount);
    return [
      this.pool.borrow([
        params.asset,
        amount,
        VARIABLE_RATE_MODE,
        REFERRAL_CODE,
        params.onBehalfOf ?? ctx.account,
      ]),
    ];
  }

  repay(params: RepayInput, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Neverland, typeof repayParams>({
    intent: "Repay variable-rate debt on a Neverland reserve",
    verb: "repay",
    params: repayParams,
    receipt: "repayReceipt",
    risk: ["fundOut", "approval"],
    tags: ["lending", "aave-v3", "debt"],
  })
  async repay(params: RepayInput, ctx: ActionCtx) {
    const amount = await this.#baseUnits(params.asset, params.amount);
    const approval = await this.erc20.approve({
      token: params.asset,
      spender: this.pool.address,
      amount: amount.toString(),
    });
    return [
      approval,
      this.pool.repay([params.asset, amount, VARIABLE_RATE_MODE, params.onBehalfOf ?? ctx.account]),
    ];
  }

  @Query({
    intent: "List Neverland reserves with their tokens and current rates",
    params: noParams,
    tags: ["lending"],
  })
  async reserves() {
    const assets = await this.pool.read.getReservesList();
    return Promise.all(
      assets.map(async (asset) => {
        const [data, metadata] = await Promise.all([
          this.pool.read.getReserveData([asset]),
          this.erc20.metadata({ token: asset }),
        ]);
        return {
          asset,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          nToken: data.aTokenAddress,
          variableDebtToken: data.variableDebtTokenAddress,
          liquidityRate: data.currentLiquidityRate.toString(),
          variableBorrowRate: data.currentVariableBorrowRate.toString(),
        };
      }),
    );
  }

  @Query({
    intent: "Read a Neverland reserve's tokens and rates",
    params: reserveParams,
    tags: ["lending"],
  })
  async reserveData(params: InferParams<typeof reserveParams>) {
    const data = await this.pool.read.getReserveData([params.asset]);
    return {
      asset: params.asset,
      nToken: data.aTokenAddress,
      stableDebtToken: data.stableDebtTokenAddress,
      variableDebtToken: data.variableDebtTokenAddress,
      liquidityIndex: data.liquidityIndex.toString(),
      currentLiquidityRate: data.currentLiquidityRate.toString(),
      variableBorrowIndex: data.variableBorrowIndex.toString(),
      currentVariableBorrowRate: data.currentVariableBorrowRate.toString(),
      lastUpdateTimestamp: Number(data.lastUpdateTimestamp),
    };
  }

  @Query({
    intent: "Read a Neverland account's collateral, debt, and health factor",
    params: accountParams,
    tags: ["lending", "position"],
  })
  async accountData(params: InferParams<typeof accountParams>) {
    const [
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    ] = await this.pool.read.getUserAccountData([params.user]);
    return {
      user: params.user,
      totalCollateralBase: totalCollateralBase.toString(),
      totalDebtBase: totalDebtBase.toString(),
      availableBorrowsBase: availableBorrowsBase.toString(),
      currentLiquidationThreshold: currentLiquidationThreshold.toString(),
      ltv: ltv.toString(),
      healthFactor: healthFactor.toString(),
    };
  }

  @Query({
    intent: "Read a Neverland account's supplied and borrowed amounts on one reserve",
    params: accountReserveParams,
    tags: ["lending", "position"],
  })
  async accountReserve(params: InferParams<typeof accountReserveParams>) {
    const data = await this.pool.read.getReserveData([params.asset]);
    const [supplied, debt] = await Promise.all([
      this.erc20.balanceOf({ token: data.aTokenAddress, owner: params.user }),
      this.erc20.balanceOf({ token: data.variableDebtTokenAddress, owner: params.user }),
    ]);
    return {
      asset: params.asset,
      user: params.user,
      nToken: data.aTokenAddress,
      nTokenBalance: supplied.balance,
      variableDebtToken: data.variableDebtTokenAddress,
      variableDebtBalance: debt.balance,
    };
  }

  @Receipt()
  supplyReceipt(changes: readonly Change[]): ReceiptResult<NeverlandOutcome> {
    return this.#operationReceipt("supply", changes);
  }

  @Receipt()
  supplyNativeReceipt(changes: readonly Change[]): ReceiptResult<NeverlandOutcome> {
    return this.#operationReceipt("supplyNative", changes);
  }

  @Receipt()
  withdrawReceipt(changes: readonly Change[]): ReceiptResult<NeverlandOutcome> {
    return this.#operationReceipt("withdraw", changes);
  }

  @Receipt()
  withdrawNativeReceipt(changes: readonly Change[]): ReceiptResult<NeverlandOutcome> {
    return this.#operationReceipt("withdrawNative", changes);
  }

  @Receipt()
  borrowReceipt(changes: readonly Change[]): ReceiptResult<NeverlandOutcome> {
    return this.#operationReceipt("borrow", changes);
  }

  @Receipt()
  repayReceipt(changes: readonly Change[]): ReceiptResult<NeverlandOutcome> {
    return this.#operationReceipt("repay", changes);
  }

  async #baseUnits(asset: AddressValue, amount: string): Promise<bigint> {
    const metadata = await this.erc20.metadata({ token: asset });
    return parseUnits(amount, metadata.decimals);
  }

  #operationReceipt(
    operation: NeverlandOperation,
    changes: readonly Change[],
  ): ReceiptResult<NeverlandOutcome> {
    const expectedEvent = OPERATION_EVENT[operation];
    const expectedAction = OPERATION_ACTION[operation];
    let poolEvent: NeverlandOutcome | undefined;
    const priceObservations: PriceObservation[] = [];
    const rewardObservations: RewardObservation[] = [];
    const reserveUpdates: ReserveUpdate[] = [];
    const reserveTokenEvents: Array<{
      eventName: "Mint" | "Burn";
      emitter: AddressValue;
      args: Record<string, unknown>;
    }> = [];
    const collateralToggles: Array<{
      event: "ReserveUsedAsCollateralEnabled" | "ReserveUsedAsCollateralDisabled";
      reserve: AddressValue;
      user: AddressValue;
    }> = [];
    // Every ERC-20 Transfer in the trace, kept for reserve-token identity.
    // The operation-specific nToken/debt-token address is the one that moves a
    // non-asset token while involving an operation actor; evidence emitters
    // (PriceObserved, Mint/Burn) must come from it, not from foreign contracts.
    const transfers: Array<{
      emitter: AddressValue;
      from: AddressValue;
      to: AddressValue;
      value: string;
    }> = [];
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") return this.erc20.changesReceipt([change]);

      if (sameAddress(change.address, NEVERLAND_POOL_ADDRESS)) {
        const event = decodePoolEvent(change);
        if (event.eventName === "ReserveDataUpdated") {
          const update = {
            event: "ReserveDataUpdated" as const,
            reserve: event.args.reserve,
            liquidityRate: event.args.liquidityRate.toString(),
            stableBorrowRate: event.args.stableBorrowRate.toString(),
            variableBorrowRate: event.args.variableBorrowRate.toString(),
            liquidityIndex: event.args.liquidityIndex.toString(),
            variableBorrowIndex: event.args.variableBorrowIndex.toString(),
          };
          reserveUpdates.push(update);
          return {
            kind: "change" as const,
            change,
            data: update,
            text: `Neverland Reserve Update: rates and indexes for ${update.reserve}`,
          };
        }
        // Collateral toggles are emitted by the Pool as auxiliary accounting
        // (e.g. the first supply auto-enables the reserve as collateral). They
        // are bound to the operation's reserve and involved account and their
        // reserve/user facts are kept in the projection.
        if (
          event.eventName === "ReserveUsedAsCollateralEnabled" ||
          event.eventName === "ReserveUsedAsCollateralDisabled"
        ) {
          const toggle = {
            event: event.eventName,
            reserve: event.args.reserve,
            user: event.args.user,
          } as const;
          collateralToggles.push(toggle);
          return {
            kind: "change" as const,
            change,
            data: { ...toggle, emitter: change.address },
            text: `Neverland ${toggle.event}: reserve ${toggle.reserve} for user ${toggle.user}`,
          };
        }
        if (event.eventName !== expectedEvent) {
          throw new Error(`Unexpected Change: Neverland pool emitted ${event.eventName}`);
        }
        if (poolEvent) {
          throw new Error(`Neverland ${operation} emitted multiple ${expectedEvent} events`);
        }
        poolEvent = poolOutcome(operation, event);
        return {
          kind: "change" as const,
          change,
          data: poolEvent,
          text: describeOutcome(poolEvent),
        };
      }

      const observed = tryDecode(PriceObservedAbi, change);
      if (observed) {
        if (observed.eventName !== "PriceObserved") {
          throw new Error(`Unexpected Change: ${change.address} emitted ${observed.eventName}`);
        }
        if (Number(observed.args.action) !== expectedAction) {
          throw new Error(
            `Neverland ${operation} observed unexpected PriceObserved action ${observed.args.action}`,
          );
        }
        const observation: PriceObservation = {
          event: "PriceObserved",
          emitter: change.address,
          asset: observed.args.asset,
          price: observed.args.price.toString(),
          baseUnit: observed.args.baseUnit.toString(),
          oracle: observed.args.oracle,
          action: Number(observed.args.action),
          ok: observed.args.ok,
          user: observed.args.user,
          timestamp: observed.args.timestamp.toString(),
        };
        priceObservations.push(observation);
        return {
          kind: "change" as const,
          change,
          data: observation,
          text: `Neverland Price Observation: ${observation.price} for ${observation.asset} by ${observation.oracle}`,
        };
      }

      const accrued = tryDecode(NeverlandRewardsAbi, change);
      if (accrued && sameAddress(change.address, NEVERLAND_REWARDS_CONTROLLER)) {
        if (accrued.eventName !== "Accrued") {
          throw new Error(`Unexpected Change: ${change.address} emitted ${accrued.eventName}`);
        }
        const observation: RewardObservation = {
          event: "Accrued",
          emitter: change.address,
          asset: accrued.args.asset,
          reward: accrued.args.reward,
          user: accrued.args.user,
          assetIndex: accrued.args.assetIndex.toString(),
          userIndex: accrued.args.userIndex.toString(),
          rewardsAccrued: accrued.args.rewardsAccrued.toString(),
        };
        rewardObservations.push(observation);
        return {
          kind: "change" as const,
          change,
          data: observation,
          text: `Neverland Reward Accrued: ${observation.rewardsAccrued} of ${observation.reward} for ${observation.user}`,
        };
      }

      const wmon = tryDecode(WETH9Abi, change);
      if (
        wmon &&
        (wmon.eventName === "Deposit" || wmon.eventName === "Withdrawal") &&
        sameAddress(change.address, WMON_ADDRESS)
      ) {
        const data = {
          event: wmon.eventName,
          emitter: change.address,
          account: wmon.eventName === "Deposit" ? wmon.args.dst : wmon.args.src,
          amount: wmon.args.wad.toString(),
        } as const;
        return {
          kind: "change" as const,
          change,
          data,
          text: `WMON ${data.event}: ${data.amount} for ${data.account}`,
        };
      }

      const reserveToken = tryDecode(NeverlandReserveTokenAbi, change);
      if (
        reserveToken &&
        (reserveToken.eventName === "Mint" || reserveToken.eventName === "Burn")
      ) {
        reserveTokenEvents.push({
          eventName: reserveToken.eventName,
          emitter: change.address,
          args: reserveToken.args as Record<string, unknown>,
        });
        return {
          kind: "change" as const,
          change,
          data: { event: reserveToken.eventName, emitter: change.address },
          text: `Neverland reserve token ${reserveToken.eventName}: ${change.address}`,
        };
      }

      const transfer = tryDecode(ERC20Abi, change);
      if (transfer && transfer.eventName === "Transfer") {
        transfers.push({
          emitter: change.address,
          from: transfer.args.from,
          to: transfer.args.to,
          value: transfer.args.value.toString(),
        });
      }

      return this.erc20.changesReceipt([change]);
    });

    if (!poolEvent)
      throw new Error(`Neverland ${operation} Receipt requires a ${expectedEvent} event`);

    // The two sides of an operation: the initiating user and the per-shape
    // counterparty (onBehalfOf for supply/borrow, to for withdraw, repayer for
    // repay). Auxiliary evidence must be attributable to one of them.
    const counterparty =
      "onBehalfOf" in poolEvent
        ? poolEvent.onBehalfOf
        : "to" in poolEvent
          ? poolEvent.to
          : poolEvent.repayer;
    const actors = [poolEvent.user, counterparty];

    // Reserve-token identity within the pure Receipt boundary: the nToken or
    // variable-debt token is the address that moved the operation's units
    // into/out of an operation actor — a Transfer from/to zero (mint/burn) or
    // through the pool/gateway. The reserve asset's own transfers are never
    // reserve-token evidence. The minted units may round by a few wei against
    // the aToken liquidity index, so the amount is compared within a tolerance.
    const reserveTokens = new Set<string>();
    for (const transfer of transfers) {
      if (sameAddress(transfer.emitter, poolEvent.asset)) continue;
      const delta = BigInt(transfer.value) - BigInt(poolEvent.amount);
      if (delta < -RESERVE_TOKEN_ROUNDING_TOLERANCE || delta > RESERVE_TOKEN_ROUNDING_TOLERANCE)
        continue;
      const fromSpecial = isProtocolAddress(transfer.from);
      const toSpecial = isProtocolAddress(transfer.to);
      const fromActor = actors.some((actor) => sameAddress(transfer.from, actor));
      const toActor = actors.some((actor) => sameAddress(transfer.to, actor));
      if ((fromSpecial && toActor) || (toSpecial && fromActor)) {
        reserveTokens.add(transfer.emitter.toLowerCase());
      }
    }
    // Per-shape role PriceObserved must name: the holder of the minted/burned
    // reserve token (onBehalfOf for supply/borrow, `to` for withdraw, `user`
    // for repay).
    const observedRole =
      "to" in poolEvent
        ? poolEvent.to
        : "repayer" in poolEvent
          ? poolEvent.user
          : poolEvent.onBehalfOf;

    for (const update of reserveUpdates) {
      if (!sameAddress(update.reserve, poolEvent.asset)) {
        throw new Error(
          `Neverland ${operation} observed ReserveDataUpdated for unrelated reserve ${update.reserve}`,
        );
      }
    }
    if (
      (priceObservations.length > 0 || reserveTokenEvents.length > 0) &&
      reserveTokens.size === 0
    ) {
      throw new Error(
        `Neverland ${operation} could not establish the operation's reserve-token identity`,
      );
    }
    for (const obs of priceObservations) {
      if (!sameAddress(obs.asset, poolEvent.asset)) {
        throw new Error(
          `Neverland ${operation} PriceObserved asset ${obs.asset} does not match operation reserve ${poolEvent.asset}`,
        );
      }
      if (!reserveTokens.has(obs.emitter.toLowerCase())) {
        throw new Error(
          `Neverland ${operation} PriceObserved emitted by ${obs.emitter} is not the operation's reserve token`,
        );
      }
      if (!sameAddress(obs.user, observedRole)) {
        throw new Error(
          `Neverland ${operation} PriceObserved user ${obs.user} does not match operation actor ${observedRole}`,
        );
      }
    }
    for (const obs of rewardObservations) {
      if (!sameAddress(obs.asset, poolEvent.asset) && !reserveTokens.has(obs.asset.toLowerCase())) {
        throw new Error(
          `Neverland ${operation} Accrued asset ${obs.asset} does not match the operation's reserve`,
        );
      }
      if (!actors.some((actor) => sameAddress(obs.user, actor))) {
        throw new Error(
          `Neverland ${operation} Accrued user ${obs.user} does not match operation actor`,
        );
      }
    }
    for (const toggle of collateralToggles) {
      if (!sameAddress(toggle.reserve, poolEvent.asset)) {
        throw new Error(
          `Neverland ${operation} ${toggle.event} for unrelated reserve ${toggle.reserve}`,
        );
      }
      if (!actors.some((actor) => sameAddress(toggle.user, actor))) {
        throw new Error(
          `Neverland ${operation} ${toggle.event} user ${toggle.user} does not match operation actor`,
        );
      }
    }
    for (const token of reserveTokenEvents) {
      if (!reserveTokens.has(token.emitter.toLowerCase())) {
        throw new Error(
          `Neverland ${operation} reserve-token ${token.eventName} emitted by ${token.emitter} is not the operation's reserve token`,
        );
      }
      const participants = [
        token.args.caller,
        token.args.onBehalfOf,
        token.args.user,
        token.args.borrower,
        token.args.from,
        token.args.target,
      ].filter((value): value is string => typeof value === "string");
      if (
        !participants.some((participant) => actors.some((actor) => sameAddress(participant, actor)))
      ) {
        throw new Error(
          `Neverland ${operation} reserve-token ${token.eventName} does not involve operation actor`,
        );
      }
    }
    const outcome: NeverlandOutcome = { ...poolEvent, priceObservations, rewardObservations };
    return {
      kind: "receipt",
      outcome,
      text: describeOutcome(outcome),
      changes: parsed,
    };
  }
}

function isProtocolAddress(address: string): boolean {
  return (
    sameAddress(address, ZERO_ADDRESS) ||
    sameAddress(address, NEVERLAND_POOL_ADDRESS) ||
    sameAddress(address, NEVERLAND_GATEWAY_ADDRESS)
  );
}

type PoolEvent = ReturnType<typeof decodePoolEvent>;

function poolOutcome(operation: NeverlandOperation, event: PoolEvent): NeverlandOutcome {
  if (event.eventName === "Supply") {
    return {
      operation: operation as "supply" | "supplyNative",
      protocol: "neverland",
      asset: event.args.reserve,
      amount: event.args.amount.toString(),
      user: event.args.user,
      onBehalfOf: event.args.onBehalfOf,
      priceObservations: [],
      rewardObservations: [],
    };
  }
  if (event.eventName === "Withdraw") {
    return {
      operation: operation as "withdraw" | "withdrawNative",
      protocol: "neverland",
      asset: event.args.reserve,
      amount: event.args.amount.toString(),
      user: event.args.user,
      to: event.args.to,
      priceObservations: [],
      rewardObservations: [],
    };
  }
  if (event.eventName === "Borrow") {
    return {
      operation: "borrow" as const,
      protocol: "neverland",
      asset: event.args.reserve,
      amount: event.args.amount.toString(),
      user: event.args.user,
      onBehalfOf: event.args.onBehalfOf,
      priceObservations: [],
      rewardObservations: [],
    };
  }
  if (event.eventName === "Repay") {
    return {
      operation: "repay" as const,
      protocol: "neverland",
      asset: event.args.reserve,
      amount: event.args.amount.toString(),
      user: event.args.user,
      repayer: event.args.repayer,
      priceObservations: [],
      rewardObservations: [],
    };
  }
  throw new Error(`Unexpected Change: Neverland pool emitted ${event.eventName}`);
}

const OPERATION_LABEL: Record<NeverlandOperation, string> = {
  supply: "Supply",
  supplyNative: "Supply Native",
  withdraw: "Withdraw",
  withdrawNative: "Withdraw Native",
  borrow: "Borrow",
  repay: "Repay",
};

function describeOutcome(outcome: NeverlandOutcome): string {
  const actor =
    "onBehalfOf" in outcome ? outcome.onBehalfOf : "to" in outcome ? outcome.to : outcome.repayer;
  return `Neverland ${OPERATION_LABEL[outcome.operation]}: ${outcome.amount} of ${outcome.asset} for ${actor}`;
}

function decodePoolEvent(change: Extract<Change, { kind: "event" }>) {
  const event = tryDecode(NeverlandPoolAbi, change);
  if (!event) {
    throw new Error(
      `Unexpected Change: ${change.address} emitted an unsupported Neverland pool event`,
    );
  }
  return event;
}

function tryDecode<
  TAbi extends
    | typeof NeverlandPoolAbi
    | typeof NeverlandRewardsAbi
    | typeof PriceObservedAbi
    | typeof WETH9Abi
    | typeof ERC20Abi
    | typeof NeverlandReserveTokenAbi,
>(abi: TAbi, change: Extract<Change, { kind: "event" }>) {
  try {
    return decodeEventLog({
      abi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}
