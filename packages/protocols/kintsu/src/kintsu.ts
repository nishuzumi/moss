import {
  Address,
  type AddressValue,
  BasisPoints,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  UnsignedIntegerString,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { parseUnits } from "viem";
import { StakedMonadAbi } from "./abis/staked-monad.js";

export const KINTSU_STAKED_MONAD_ADDRESS =
  "0xA3227C5969757783154C60bF0bC1944180ed81B9" as const;

const DEFAULT_SLIPPAGE_BPS = 50;
const UINT96_MAX = (1n << 96n) - 1n;
const KintsuSlippage = BasisPoints.max(9_999)
  .default(DEFAULT_SLIPPAGE_BPS)
  .describe("An integer basis-point count from 0 through 9999; 1 bps equals 0.01%.");
const PositiveRawShares = UnsignedIntegerString.refine(
  (value) => BigInt(value) > 0n,
  "Expected a positive integer share amount.",
).describe('A positive raw sMON share amount, such as "1" or "1000000000000000000".');

const quoteDepositParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Human-readable native MON amount to deposit; MON uses 18 decimals.",
  },
  slippage: {
    type: KintsuSlippage,
    description: "Maximum adverse movement allowed between quoting and execution.",
  },
} satisfies ParamsSpec;

const depositParams = {
  ...quoteDepositParams,
  receiver: {
    type: Address,
    description: "Address that receives the minted sMON shares.",
  },
} satisfies ParamsSpec;

const convertToAssetsParams = {
  shares: {
    type: PositiveRawShares,
    description: "Raw sMON share amount to convert into MON wei.",
  },
} satisfies ParamsSpec;

const totalSharesParams = {} satisfies ParamsSpec;

export type KintsuDepositOutcome = {
  operation: "deposit";
  sender: AddressValue;
  receiver: AddressValue;
  assets: string;
  shares: string;
};

interface PreparedDeposit {
  amount: bigint;
  quotedShares: bigint;
  minimumShares: bigint;
  slippage: number;
}

@Protocol({
  name: "kintsu",
  category: "staking",
  description: "Kintsu liquid staking deposits that mint sMON on Monad mainnet.",
  contracts: {
    stakedMonad: {
      abi: StakedMonadAbi,
      addr: KINTSU_STAKED_MONAD_ADDRESS,
    },
  },
  labels: { StakedMonad: KINTSU_STAKED_MONAD_ADDRESS },
  protocols: { erc20: ERC20 },
})
export class Kintsu {
  declare stakedMonad: Handle<typeof StakedMonadAbi>;
  declare erc20: ProtocolRef<ERC20>;

  @Query({
    intent: "Quote a protected Kintsu sMON deposit",
    params: quoteDepositParams,
    tags: ["liquid-staking", "quote"],
  })
  async quoteDeposit(params: InferParams<typeof quoteDepositParams>) {
    const prepared = await this.#prepareDeposit(params);
    return {
      amount: prepared.amount.toString(),
      quotedShares: prepared.quotedShares.toString(),
      minimumShares: prepared.minimumShares.toString(),
      slippage: prepared.slippage,
    };
  }

  @Query({
    intent: "Convert raw sMON shares into MON wei",
    params: convertToAssetsParams,
    tags: ["liquid-staking", "conversion"],
  })
  async convertToAssets(params: InferParams<typeof convertToAssetsParams>) {
    const assets = await this.stakedMonad.read.convertToAssets([BigInt(params.shares)]);
    return { shares: params.shares, assets: assets.toString() };
  }

  @Query({
    intent: "Read the total raw sMON shares",
    params: totalSharesParams,
    tags: ["liquid-staking"],
  })
  async totalShares(_params: InferParams<typeof totalSharesParams>) {
    const totalShares = await this.stakedMonad.read.totalShares();
    return { totalShares: totalShares.toString() };
  }

  @Capability<Kintsu, typeof depositParams>({
    intent: "Stake native MON through Kintsu and mint protected sMON shares",
    verb: "stake",
    params: depositParams,
    receipt: "depositReceipt",
    risk: ["fundOut", "priceImpact"],
    tags: ["liquid-staking"],
  })
  async deposit(params: InferParams<typeof depositParams>) {
    const prepared = await this.#prepareDeposit(params);
    return [
      this.stakedMonad.deposit([prepared.minimumShares, params.receiver], {
        value: prepared.amount,
      }),
    ];
  }

  @Receipt()
  depositReceipt(_changes: readonly Change[]): ReceiptResult<KintsuDepositOutcome> {
    throw new Error(
      "Kintsu deposit Receipt requires native transfer, minted sMON, and Deposit",
    );
  }

  async #prepareDeposit(
    params: InferParams<typeof quoteDepositParams>,
  ): Promise<PreparedDeposit> {
    const amount = parseUnits(params.amount, 18);
    if (amount > UINT96_MAX) {
      throw new Error("kintsu.deposit amount exceeds uint96");
    }
    const quotedShares = await this.stakedMonad.read.convertToShares([amount]);
    const minimumShares =
      (quotedShares * (10_000n - BigInt(params.slippage))) / 10_000n;
    if (quotedShares === 0n || minimumShares === 0n) {
      throw new Error("kintsu.deposit quote produced zero protected shares");
    }
    return {
      amount,
      quotedShares,
      minimumShares,
      slippage: params.slippage,
    };
  }
}
