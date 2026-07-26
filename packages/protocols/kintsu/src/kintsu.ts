import {
  type ActionCtx,
  Address,
  type AddressValue,
  BasisPoints,
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
  type ReceiptChange,
  type ReceiptResult,
  UnsignedIntegerString,
} from "@themoss/core";
import { ERC20, type ERC20Outcome } from "@themoss/erc";
import { decodeEventLog, isAddressEqual, parseUnits, zeroAddress } from "viem";
import { StakedMonadAbi } from "./abis/staked-monad.js";

export const KINTSU_STAKED_MONAD_ADDRESS = "0xA3227C5969757783154C60bF0bC1944180ed81B9" as const;

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
  async deposit(params: InferParams<typeof depositParams>, _ctx: ActionCtx) {
    const prepared = await this.#prepareDeposit(params);
    return [
      this.stakedMonad.deposit([prepared.minimumShares, params.receiver], {
        value: prepared.amount,
      }),
    ];
  }

  @Receipt()
  depositReceipt(changes: readonly Change[]): ReceiptResult<KintsuDepositOutcome> {
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    let deposited:
      | {
          receiver: AddressValue;
          shares: string;
          assets: string;
        }
      | undefined;
    const mints: Extract<ERC20Outcome, { operation: "transfer" }>[] = [];

    const parsed = changes.map((change): ReceiptChange | ReceiptResult => {
      if (change.kind === "nativeTransfer") {
        if (native) {
          throw new Error("Kintsu deposit Receipt contains multiple native transfers");
        }
        native = change;
        return {
          kind: "change" as const,
          change,
          data: {
            operation: "nativeTransfer",
            from: change.from,
            to: change.to,
            value: change.value,
          },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }
      if (!isAddressEqual(change.address, KINTSU_STAKED_MONAD_ADDRESS)) {
        throw new Error(`Unexpected Change: unsupported emitter ${change.address}`);
      }

      let decoded: ReturnType<typeof decodeEventLog<typeof StakedMonadAbi>>;
      try {
        decoded = decodeEventLog({
          abi: StakedMonadAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: malformed Kintsu event");
      }

      if (decoded.eventName === "Transfer") {
        const receipt = this.erc20.changesReceipt([change]);
        const [outcome] = receipt.outcome;
        if (outcome?.operation === "transfer" && isAddressEqual(outcome.from, zeroAddress)) {
          mints.push(outcome);
        }
        return receipt;
      }
      if (decoded.eventName === "VirtualSharesSnapshot") {
        const data = {
          event: "VirtualSharesSnapshot",
          shares: decoded.args.shares.toString(),
        } as const;
        return {
          kind: "change" as const,
          change,
          data,
          text: `Kintsu Virtual Shares Snapshot: ${data.shares}`,
        };
      }
      if (decoded.eventName === "Deposit") {
        if (deposited) {
          throw new Error("Kintsu deposit Receipt contains multiple Deposit events");
        }
        deposited = {
          receiver: decoded.args.staker,
          shares: decoded.args.shares.toString(),
          assets: decoded.args.value.toString(),
        };
        return {
          kind: "change" as const,
          change,
          data: { event: "Deposit", ...deposited },
          text: `Kintsu Deposit: ${deposited.assets} MON wei for ${deposited.shares} sMON shares to ${deposited.receiver}`,
        };
      }
      throw new Error(`Unexpected Change: Kintsu emitted ${decoded.eventName}`);
    });

    if (!native || !deposited) {
      throw new Error("Kintsu deposit Receipt requires native transfer, minted sMON, and Deposit");
    }
    const deposit = deposited;
    if (!isAddressEqual(native.to, KINTSU_STAKED_MONAD_ADDRESS)) {
      throw new Error("Kintsu deposit native transfer has an unexpected recipient");
    }
    if (native.value !== deposit.assets) {
      throw new Error("Kintsu deposit native transfer does not match Deposit value");
    }
    const matchingMints = mints.filter(
      (mint) =>
        isAddressEqual(mint.to, deposit.receiver) &&
        mint.amount === deposit.shares &&
        mint.token !== "native" &&
        isAddressEqual(mint.token, KINTSU_STAKED_MONAD_ADDRESS),
    );
    if (matchingMints.length !== 1) {
      throw new Error("Kintsu deposit Receipt requires one matching sMON mint");
    }

    const outcome: KintsuDepositOutcome = {
      operation: "deposit",
      sender: native.from,
      receiver: deposit.receiver,
      assets: deposit.assets,
      shares: deposit.shares,
    };
    return {
      kind: "receipt",
      outcome,
      text: `Kintsu Deposit: ${outcome.assets} MON wei from ${outcome.sender} minted ${outcome.shares} sMON shares to ${outcome.receiver}`,
      changes: parsed,
    };
  }

  async #prepareDeposit(params: InferParams<typeof quoteDepositParams>): Promise<PreparedDeposit> {
    const amount = parseUnits(params.amount, 18);
    if (amount > UINT96_MAX) {
      throw new Error("kintsu.deposit amount exceeds uint96");
    }
    const quotedShares = await this.stakedMonad.read.convertToShares([amount]);
    const minimumShares = (quotedShares * (10_000n - BigInt(params.slippage))) / 10_000n;
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
