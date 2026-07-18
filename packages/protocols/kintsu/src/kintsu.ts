import {
  Address,
  type AddressValue,
  BasisPoints,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type JsonSafeValue,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptChange,
  type ReceiptResult,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { decodeEventLog, formatUnits, getAddress, parseUnits } from "viem";
import { StakedMonadAbi } from "./abis/staked-monad.js";

// Kintsu official Monad mainnet deployment:
// https://github.com/monad-crypto/protocols/blob/main/mainnet/kintsu.jsonc
// The official npm artifact's 143_deployment.json names the same address.
export const KINTSU_SMON_ADDRESS = "0xA3227C5969757783154C60bF0bC1944180ed81B9" as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_UINT96 = (1n << 96n) - 1n;
const DEFAULT_SLIPPAGE_BPS = 50;

const stakeSlippage = BasisPoints.max(5_000)
  .default(DEFAULT_SLIPPAGE_BPS)
  .describe("An integer basis-point count from 0 through 5000; 1 bps equals 0.01%.");

const stakeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Human-readable native MON amount deposited into Kintsu; MON uses 18 decimals.",
  },
  receiver: { type: Address, description: "Address receiving the minted sMON shares." },
  slippageBps: {
    type: stakeSlippage,
    description: "Maximum quote movement allowed when deriving the minimum sMON shares.",
  },
} satisfies ParamsSpec;

const assetQuoteParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Human-readable MON amount converted into an estimated sMON share quantity.",
  },
} satisfies ParamsSpec;

const shareQuoteParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable sMON share quantity converted into its current MON value.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  owner: { type: Address, description: "Address whose sMON balance is read." },
} satisfies ParamsSpec;

export type KintsuStakeOutcome = {
  operation: "stake";
  account: AddressValue;
  receiver: AddressValue;
  monAmount: string;
  sMonShares: string;
};

@Protocol({
  name: "kintsu",
  category: "staking",
  description: "Stake native MON with Kintsu and receive transferable sMON shares.",
  contracts: { stakedMonad: { abi: StakedMonadAbi, addr: KINTSU_SMON_ADDRESS } },
  protocols: { erc20: ERC20 },
})
export class Kintsu {
  declare stakedMonad: Handle<typeof StakedMonadAbi>;
  declare erc20: ProtocolRef<ERC20>;

  @Capability<Kintsu, typeof stakeParams>({
    intent: "Stake native MON with Kintsu and receive sMON",
    verb: "stake",
    params: stakeParams,
    receipt: "stakeReceipt",
    risk: ["fundOut", "priceImpact"],
    tags: ["staking", "lst"],
  })
  async stake(params: InferParams<typeof stakeParams>) {
    const amount = toUint96(parseUnits(params.amount, 18), "amount");
    const quotedShares = await this.stakedMonad.read.convertToShares([amount]);
    if (quotedShares === 0n) throw new ParameterError("Kintsu quote returned zero sMON shares");
    const minShares =
      (quotedShares * (10_000n - BigInt(params.slippageBps ?? DEFAULT_SLIPPAGE_BPS))) / 10_000n;
    if (minShares === 0n) throw new ParameterError("minimum sMON shares rounds to zero");
    return [this.stakedMonad.deposit([minShares, params.receiver], { value: amount })];
  }

  @Query({ intent: "Quote sMON shares received for staking MON", params: assetQuoteParams })
  async convertToShares(params: InferParams<typeof assetQuoteParams>) {
    const assets = toUint96(parseUnits(params.amount, 18), "amount");
    const shares = await this.stakedMonad.read.convertToShares([assets]);
    return { amount: params.amount, shares: formatUnits(shares, 18) };
  }

  @Query({ intent: "Quote the MON value of sMON shares", params: shareQuoteParams })
  async convertToAssets(params: InferParams<typeof shareQuoteParams>) {
    const shares = toUint96(parseUnits(params.shares, 18), "shares");
    const assets = await this.stakedMonad.read.convertToAssets([shares]);
    return { shares: params.shares, amount: formatUnits(assets, 18) };
  }

  @Query({ intent: "Read an sMON balance", params: balanceParams, tags: ["balance"] })
  async balanceOf(params: InferParams<typeof balanceParams>) {
    const balance = await this.stakedMonad.read.balanceOf([params.owner]);
    return {
      token: KINTSU_SMON_ADDRESS,
      symbol: "sMON",
      decimals: 18,
      owner: params.owner,
      balance: balance.toString(),
    };
  }

  @Receipt()
  stakeReceipt(changes: readonly Change[]): ReceiptResult<KintsuStakeOutcome> {
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    let deposit: { receiver: AddressValue; shares: string; value: string } | undefined;
    let mint: { from: AddressValue; to: AddressValue; value: string } | undefined;
    let snapshots = 0;

    const parsed = changes.map<ReceiptChange | ReceiptResult<JsonSafeValue>>((change) => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("Kintsu stake emitted multiple native transfers");
        if (!sameAddress(change.to, KINTSU_SMON_ADDRESS)) {
          throw new Error("Kintsu stake native transfer has the wrong recipient");
        }
        native = change;
        return receiptChange(
          change,
          { operation: "nativeTransfer", ...change },
          `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        );
      }
      if (!sameAddress(change.address, KINTSU_SMON_ADDRESS)) {
        throw new Error(`Unexpected Change: event emitted by ${change.address}`);
      }

      let event: ReturnType<typeof decodeEventLog<typeof StakedMonadAbi>>;
      try {
        event = decodeEventLog({
          abi: StakedMonadAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported Kintsu event");
      }

      if (event.eventName === "Transfer") {
        if (mint) throw new Error("Kintsu stake emitted multiple sMON Transfer events");
        mint = {
          from: event.args.from,
          to: event.args.to,
          value: event.args.value.toString(),
        };
        return this.erc20.changesReceipt([change]);
      }
      if (event.eventName === "VirtualSharesSnapshot") {
        snapshots += 1;
        if (snapshots > 1) throw new Error("Kintsu stake emitted multiple fee snapshots");
        const value = event.args.shares.toString();
        return receiptChange(
          change,
          { event: "VirtualSharesSnapshot", shares: value },
          `Kintsu Virtual Shares Snapshot: ${value}`,
        );
      }
      if (event.eventName !== "Deposit" || deposit) {
        throw new Error(`Unexpected Change: Kintsu stake received ${event.eventName}`);
      }
      deposit = {
        receiver: event.args.staker,
        shares: event.args.shares.toString(),
        value: event.args.value.toString(),
      };
      return receiptChange(
        change,
        { operation: "stake", ...deposit },
        `Kintsu Stake: ${deposit.value} MON for ${deposit.shares} sMON to ${deposit.receiver}`,
      );
    });

    if (!native || !deposit || !mint) {
      throw new Error("Kintsu stake Receipt requires native transfer, sMON mint, and Deposit");
    }
    if (!sameAddress(mint.from, ZERO_ADDRESS))
      throw new Error("Kintsu stake Transfer is not a mint");
    if (!sameAddress(mint.to, deposit.receiver) || mint.value !== deposit.shares) {
      throw new Error("Kintsu stake sMON mint differs from Deposit");
    }
    if (native.value !== deposit.value) {
      throw new Error("Kintsu stake MON amount differs between native transfer and Deposit");
    }
    const outcome: KintsuStakeOutcome = {
      operation: "stake",
      account: getAddress(native.from),
      receiver: deposit.receiver,
      monAmount: deposit.value,
      sMonShares: deposit.shares,
    };
    return {
      kind: "receipt",
      outcome,
      text: `Kintsu Stake: ${outcome.monAmount} MON for ${outcome.sMonShares} sMON to ${outcome.receiver}`,
      changes: parsed,
    };
  }
}

function toUint96(value: bigint, field: string): bigint {
  if (value > MAX_UINT96) throw new ParameterError(`${field} exceeds the Kintsu uint96 limit`);
  return value;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function receiptChange(change: Change, data: JsonSafeValue, text: string): ReceiptChange {
  return { kind: "change", change, data, text };
}
