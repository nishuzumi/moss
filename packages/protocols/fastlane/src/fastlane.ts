import {
  type ActionCtx,
  Address,
  type AddressValue,
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
  type ReceiptResult,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import { ShMonadAbi } from "./abis/fastlane.js";
import type { FastLaneStakeOutcome, FastLaneUnstakeOutcome } from "./types.js";

// ──── Verified constants ────

/**
 * FastLane ShMonad proxy on Monad mainnet.
 *
 * Source: FastLane official deployment table
 * (use-shmonad/references/deployments-and-rpc.md, retrieved 2026-07-18).
 * Confirmed as the canonical proxy for ShMonad on Monad mainnet (chain ID 143).
 * Verified on-chain: nonempty code at proxy, EIP-1967 implementation slot
 * matches 0x856a4019228c265dee336df705277607c4a18e1b, name() == "ShMonad",
 * symbol() == "shMON", decimals() == 18.
 */
export const SHMONAD_ADDRESS: AddressValue = "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c";

const _SHMONAD_TOKEN = { address: SHMONAD_ADDRESS, symbol: "shMON", decimals: 18 } as const;

// ──── Parameter schemas ────

const stakeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Human-readable native MON amount to stake; MON uses 18 decimals.",
  },
  receiver: {
    type: Address,
    description: "Address that will receive the minted shMON shares.",
  },
} satisfies ParamsSpec;

const unstakeParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable shMON share amount to unstake; shMON uses 18 decimals.",
  },
  receiver: {
    type: Address,
    description: "Address that will receive the native MON from the unstake.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  owner: { type: Address, description: "Address whose shMON balance is read." },
} satisfies ParamsSpec;

const exchangeRateParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable shMON share amount to convert; shMON uses 18 decimals.",
  },
} satisfies ParamsSpec;

// ──── Protocol class ────

@Protocol({
  name: "fastlane",
  category: "staking",
  description:
    "FastLane ShMonad liquid staking: stake native MON for yield-bearing shMON shares and unstake back to MON.",
  contracts: { shmonad: { abi: ShMonadAbi, addr: SHMONAD_ADDRESS } },
  protocols: { erc20: ERC20 },
})
export class FastLane {
  declare shmonad: Handle<typeof ShMonadAbi>;
  declare erc20: ProtocolRef<ERC20>;

  // ──── Capability: stake ────

  @Capability<FastLane, typeof stakeParams>({
    intent: "Stake native MON to receive yield-bearing shMON from FastLane",
    verb: "stake",
    params: stakeParams,
    receipt: "stakeReceipt",
    risk: ["fundOut"],
    tags: ["lst", "liquid-staking"],
  })
  async stake(params: InferParams<typeof stakeParams>) {
    return [
      this.shmonad.deposit([parseUnits(params.amount, 18), params.receiver], {
        value: parseUnits(params.amount, 18),
      }),
    ];
  }

  // ──── Capability: unstake ────

  @Capability<FastLane, typeof unstakeParams>({
    intent: "Unstake shMON for native MON using the atomic redeem path (may include an atomic fee)",
    verb: "unstake",
    params: unstakeParams,
    receipt: "unstakeReceipt",
    risk: ["fundOut", "priceImpact"],
    tags: ["lst", "liquid-staking"],
  })
  async unstake(params: InferParams<typeof unstakeParams>, ctx: ActionCtx) {
    return [this.shmonad.redeem([parseUnits(params.shares, 18), params.receiver, ctx.account])];
  }

  // ──── Queries ────

  @Query({
    intent: "Preview how many shMON shares would be received for a given MON deposit",
    params: {
      assets: { type: PositiveDecimalString, description: "MON amount to preview." },
    },
    tags: ["preview"],
  })
  async previewDeposit(params: { assets: string }) {
    const shares = await this.shmonad.read.previewDeposit([parseUnits(params.assets, 18)]);
    return { assets: params.assets, shares: formatUnits(shares, 18) };
  }

  @Query({
    intent:
      "Preview how much MON would be received for redeeming a given shMON amount (atomic path)",
    params: {
      shares: { type: PositiveDecimalString, description: "shMON share amount to preview." },
    },
    tags: ["preview"],
  })
  async previewRedeem(params: { shares: string }) {
    const assets = await this.shmonad.read.previewRedeem([parseUnits(params.shares, 18)]);
    return { shares: params.shares, assets: formatUnits(assets, 18) };
  }

  @Query({ intent: "Read a shMON balance", params: balanceParams, tags: ["balance"] })
  async balanceOf(params: InferParams<typeof balanceParams>) {
    const balance = await this.shmonad.read.balanceOf([params.owner]);
    return {
      token: SHMONAD_ADDRESS,
      symbol: "shMON",
      decimals: 18,
      balance: balance.toString(),
    };
  }

  @Query({
    intent: "Convert shMON shares to MON assets (current exchange rate)",
    params: exchangeRateParams,
    tags: ["exchange-rate"],
  })
  async convertToAssets(params: InferParams<typeof exchangeRateParams>) {
    const assets = await this.shmonad.read.convertToAssets([parseUnits(params.shares, 18)]);
    return {
      shares: params.shares,
      assets: formatUnits(assets, 18),
    };
  }

  // ──── Receipt: stake ────

  @Receipt()
  stakeReceipt(changes: readonly Change[]): ReceiptResult<FastLaneStakeOutcome> {
    let depositEvent: FastLaneStakeOutcome | undefined;
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("FastLane stake emitted multiple native transfers");
        native = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", ...change },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      let decoded: ReturnType<typeof decodeEventLog<typeof ShMonadAbi>>;
      try {
        decoded = decodeEventLog({
          abi: ShMonadAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported FastLane event during stake");
      }

      if (decoded.eventName === "Transfer") {
        // Mint Transfer (from zero address) — delegate to erc20
        if (decoded.args.from !== "0x0000000000000000000000000000000000000000") {
          throw new Error("Unexpected Change: FastLane stake emitted non-mint Transfer");
        }
        return this.erc20.changesReceipt([change]);
      }

      if (decoded.eventName !== "Deposit") {
        throw new Error(`Unexpected Change: FastLane stake emitted ${decoded.eventName}`);
      }
      if (depositEvent) throw new Error("FastLane stake emitted multiple Deposit events");
      depositEvent = {
        operation: "stake",
        depositor: decoded.args.sender,
        receiver: decoded.args.owner,
        assets: decoded.args.assets.toString(),
        shares: decoded.args.shares.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: depositEvent,
        text: `FastLane Stake: ${depositEvent.assets} MON → ${depositEvent.shares} shMON for ${depositEvent.receiver}`,
      };
    });

    if (!depositEvent || !native) {
      throw new Error("FastLane stake Receipt requires a Deposit event and native transfer");
    }
    if (depositEvent.assets !== native.value) {
      throw new Error("FastLane stake: Deposit assets differ from native transfer value");
    }
    const outcome: FastLaneStakeOutcome = depositEvent;
    return {
      kind: "receipt",
      outcome,
      text: `FastLane Stake: ${outcome.assets} MON → ${outcome.shares} shMON for ${outcome.receiver}`,
      changes: parsed,
    };
  }

  // ──── Receipt: unstake ────

  @Receipt()
  unstakeReceipt(changes: readonly Change[]): ReceiptResult<FastLaneUnstakeOutcome> {
    let withdrawEvent: FastLaneUnstakeOutcome | undefined;
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("FastLane unstake emitted multiple native transfers");
        native = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", ...change },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      let decoded: ReturnType<typeof decodeEventLog<typeof ShMonadAbi>>;
      try {
        decoded = decodeEventLog({
          abi: ShMonadAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported FastLane event during unstake");
      }

      if (decoded.eventName === "Transfer") {
        // Burn Transfer (to zero address) — delegate to erc20
        if (decoded.args.to !== "0x0000000000000000000000000000000000000000") {
          throw new Error("Unexpected Change: FastLane unstake emitted non-burn Transfer");
        }
        return this.erc20.changesReceipt([change]);
      }

      if (decoded.eventName !== "Withdraw") {
        throw new Error(`Unexpected Change: FastLane unstake emitted ${decoded.eventName}`);
      }
      if (withdrawEvent) throw new Error("FastLane unstake emitted multiple Withdraw events");
      withdrawEvent = {
        operation: "unstake",
        redeemer: decoded.args.sender,
        receiver: decoded.args.receiver,
        assets: decoded.args.assets.toString(),
        shares: decoded.args.shares.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: withdrawEvent,
        text: `FastLane Unstake: ${withdrawEvent.shares} shMON → ${withdrawEvent.assets} MON to ${withdrawEvent.receiver}`,
      };
    });

    if (!withdrawEvent || !native) {
      throw new Error("FastLane unstake Receipt requires a Withdraw event and native transfer");
    }
    if (withdrawEvent.assets !== native.value) {
      throw new Error("FastLane unstake: Withdraw assets differ from native transfer value");
    }
    const outcome: FastLaneUnstakeOutcome = withdrawEvent;
    return {
      kind: "receipt",
      outcome,
      text: `FastLane Unstake: ${outcome.shares} shMON → ${outcome.assets} MON to ${outcome.receiver}`,
      changes: parsed,
    };
  }
}
