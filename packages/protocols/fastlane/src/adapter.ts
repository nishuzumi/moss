import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { formatUnits, parseUnits } from "viem";
import { ShMonadAbi } from "./abis/shmonad.js";

export const FASTLANE_SHMONAD_ADDRESS = "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c" as const;

const stakeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Human-readable MON amount to stake into the shMONAD vault.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  owner: { type: Address, description: "Address whose vault shares are read." },
} satisfies ParamsSpec;

const exchangeRateParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Number of vault shares to convert to MON assets.",
  },
} satisfies ParamsSpec;

const totalStakedParams = {} satisfies ParamsSpec;

type StakeOutcome = { operation: "stake"; account: AddressValue; amount: string };

@Protocol({
  name: "fastlane",
  category: "staking",
  description: "FastLane shMONAD staking adapter for MON deposits into the ERC-4626 vault.",
  contracts: { vault: { abi: ShMonadAbi, addr: FASTLANE_SHMONAD_ADDRESS } },
})
export class FastLaneProtocol {
  declare runtime: MossRuntime;
  declare vault: Handle<typeof ShMonadAbi>;

  @Capability<FastLaneProtocol, typeof stakeParams>({
    intent: "Stake native MON into the FastLane shMONAD vault",
    verb: "stake",
    params: stakeParams,
    receipt: "stakeReceipt",
    risk: ["fundOut"],
    tags: ["staking"],
  })
  async stake(params: InferParams<typeof stakeParams>, ctx: ActionCtx) {
    const amount = parseUnits(params.amount, 18);
    return [this.vault.deposit([amount, ctx.account], { value: amount })];
  }

  @Query({ intent: "Read a FastLane shMONAD vault balance", params: balanceParams, tags: ["balance"] })
  async balanceOf(params: InferParams<typeof balanceParams>) {
    const [shares, decimals, symbol] = await Promise.all([
      this.vault.read.balanceOf([params.owner]),
      this.vault.read.decimals(),
      this.vault.read.symbol(),
    ]);
    return {
      owner: params.owner,
      shares: shares.toString(),
      symbol,
      decimals: Number(decimals),
    };
  }

  @Query({ intent: "Read the exchange rate from shares to assets", params: exchangeRateParams })
  async exchangeRate(params: InferParams<typeof exchangeRateParams>) {
    const [assets, decimals] = await Promise.all([
      this.vault.read.convertToAssets([parseUnits(params.shares, 18)]),
      this.vault.read.decimals(),
    ]);
    return {
      shares: params.shares,
      assets: formatUnits(assets, Number(decimals)),
      decimals: Number(decimals),
    };
  }

  @Query({ intent: "Read the total staked amount in the vault", params: totalStakedParams })
  async totalStaked() {
    const [assets, decimals] = await Promise.all([this.vault.read.totalAssets(), this.vault.read.decimals()]);
    return {
      totalAssets: formatUnits(assets, Number(decimals)),
      decimals: Number(decimals),
    };
  }

  @Receipt()
  stakeReceipt(changes: readonly Change[]): ReceiptResult<StakeOutcome> {
    const [nativeTransfer] = changes.filter((change) => change.kind === "nativeTransfer");
    if (!nativeTransfer) throw new Error("FastLane stake Receipt requires a native transfer");
    const outcome: StakeOutcome = {
      operation: "stake",
      account: nativeTransfer.from,
      amount: nativeTransfer.value,
    };
    return {
      kind: "receipt",
      outcome,
      text: `FastLane stake: ${outcome.amount} MON for ${outcome.account}`,
      changes: changes.map((change) => ({
        kind: "change" as const,
        change,
        data: outcome,
        text: `FastLane stake change: ${change.kind}`,
      })),
    };
  }
}
