import {
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
import { ShMonadAbi } from "./abis/shmonad.js";

export const SHMONAD_ADDRESS: AddressValue = "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c";

/**
 * The ShMonad implementation behind the SHMONAD_ADDRESS proxy
 * (TransparentUpgradeableProxy, ERC-1967). The committed ABI is fetched from
 * this address because explorer `getabi` on the proxy returns the proxy's own
 * ABI, not the staking surface. scripts/abis.ts records it as the fetch source
 * and the live e2e pins it to the proxy's ERC-1967 implementation slot, so an
 * upgrade is caught instead of silently shipping a stale ABI.
 */
export const SHMONAD_IMPLEMENTATION_ADDRESS: AddressValue =
  "0x856A4019228c265DEE336DF705277607c4A18e1B";

const stakeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of native MON to stake; MON uses 18 decimals.",
  },
  receiver: {
    type: Address,
    description: "Account that receives the minted shMON tokens.",
  },
} satisfies ParamsSpec;

const unstakeParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Quantity of shMON to redeem; shMON uses 18 decimals.",
  },
  receiver: {
    type: Address,
    description: "Account that receives the redeemed MON.",
  },
  owner: {
    type: Address,
    description: "Account whose shMON is redeemed.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  owner: {
    type: Address,
    description: "Address whose shMON balance is read.",
  },
} satisfies ParamsSpec;

type StakeOutcome = {
  operation: "stake";
  depositor: AddressValue;
  receiver: AddressValue;
  assets: string;
  shares: string;
};

type UnstakeOutcome = {
  operation: "unstake";
  owner: AddressValue;
  receiver: AddressValue;
  assets: string;
  shares: string;
};

@Protocol({
  name: "shmonad",
  category: "staking",
  description: "FastLane liquid staking: stake MON for shMON, earn staking and MEV rewards.",
  contracts: { shmonad: { abi: ShMonadAbi, addr: SHMONAD_ADDRESS } },
  protocols: { erc20: ERC20 },
})
export class ShMonad {
  declare shmonad: Handle<typeof ShMonadAbi>;
  declare erc20: ProtocolRef<ERC20>;

  @Capability<ShMonad, typeof stakeParams>({
    intent: "Stake {amount} MON into shMON",
    verb: "stake",
    params: stakeParams,
    receipt: "stakeReceipt",
    risk: ["fundOut"],
    tags: ["staking"],
  })
  async stake(params: InferParams<typeof stakeParams>) {
    const amount = parseUnits(params.amount, 18);
    return [this.shmonad.deposit([amount, params.receiver], { value: amount })];
  }

  @Capability<ShMonad, typeof unstakeParams>({
    intent: "Redeem {shares} shMON for MON",
    verb: "unstake",
    params: unstakeParams,
    receipt: "unstakeReceipt",
    risk: ["fundOut"],
    tags: ["staking"],
  })
  async unstake(params: InferParams<typeof unstakeParams>) {
    return [this.shmonad.redeem([parseUnits(params.shares, 18), params.receiver, params.owner])];
  }

  @Query({
    intent: "Read a shMON balance",
    params: balanceParams,
    tags: ["balance"],
  })
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
    intent: "Read the current shMON-to-MON exchange rate",
    params: {},
    tags: ["rate"],
  })
  async exchangeRate() {
    const oneShare = 10n ** 18n;
    const assets = await this.shmonad.read.convertToAssets([oneShare]);
    return {
      sharesUnit: "1000000000000000000",
      assetsPerShare: assets.toString(),
      humanRate: formatUnits(assets, 18),
    };
  }

  @Receipt()
  stakeReceipt(changes: readonly Change[]): ReceiptResult<StakeOutcome> {
    let depositEvent:
      | { depositor: AddressValue; receiver: AddressValue; assets: string; shares: string }
      | undefined;
    let nativeTransfer: Extract<Change, { kind: "nativeTransfer" }> | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (nativeTransfer) throw new Error("shMONAD stake emitted multiple native transfers");
        nativeTransfer = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", ...change },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      let event: ReturnType<typeof decodeEventLog<typeof ShMonadAbi>>;
      try {
        event = decodeEventLog({
          abi: ShMonadAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error(
          `Unexpected Change: ${change.address} emitted an unsupported shMONAD event`,
        );
      }

      if (event.eventName === "Transfer" || event.eventName === "Approval") {
        return this.erc20.changesReceipt([change]);
      }

      if (event.eventName !== "Deposit") {
        throw new Error(`Unexpected Change: shMONAD stake received ${event.eventName}`);
      }
      if (depositEvent) {
        throw new Error("shMONAD stake emitted multiple Deposit events");
      }

      depositEvent = {
        depositor: event.args.sender,
        receiver: event.args.owner,
        assets: event.args.assets.toString(),
        shares: event.args.shares.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: { operation: "deposit", ...depositEvent },
        text: `shMONAD Stake: ${depositEvent.assets} MON → ${depositEvent.shares} shMON for ${depositEvent.receiver}`,
      };
    });

    if (!depositEvent || !nativeTransfer) {
      throw new Error("shMONAD stake Receipt requires both a Deposit event and a native transfer");
    }
    if (depositEvent.assets !== nativeTransfer.value) {
      throw new Error("shMONAD stake assets differ between Deposit event and native transfer");
    }

    const outcome: StakeOutcome = { operation: "stake", ...depositEvent };
    return {
      kind: "receipt",
      outcome,
      text: `shMONAD Stake: ${outcome.assets} MON → ${outcome.shares} shMON for ${outcome.receiver}`,
      changes: parsed,
    };
  }

  @Receipt()
  unstakeReceipt(changes: readonly Change[]): ReceiptResult<UnstakeOutcome> {
    let withdrawEvent:
      | { owner: AddressValue; receiver: AddressValue; assets: string; shares: string }
      | undefined;
    let nativeTransfer: Extract<Change, { kind: "nativeTransfer" }> | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (nativeTransfer) throw new Error("shMONAD unstake emitted multiple native transfers");
        nativeTransfer = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", ...change },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      let event: ReturnType<typeof decodeEventLog<typeof ShMonadAbi>>;
      try {
        event = decodeEventLog({
          abi: ShMonadAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error(
          `Unexpected Change: ${change.address} emitted an unsupported shMONAD event`,
        );
      }

      if (event.eventName === "Transfer" || event.eventName === "Approval") {
        return this.erc20.changesReceipt([change]);
      }

      if (event.eventName !== "Withdraw") {
        throw new Error(`Unexpected Change: shMONAD unstake received ${event.eventName}`);
      }
      if (withdrawEvent) {
        throw new Error("shMONAD unstake emitted multiple Withdraw events");
      }

      withdrawEvent = {
        owner: event.args.owner,
        receiver: event.args.receiver,
        assets: event.args.assets.toString(),
        shares: event.args.shares.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: { operation: "withdraw", ...withdrawEvent },
        text: `shMONAD Unstake: ${withdrawEvent.shares} shMON → ${withdrawEvent.assets} MON to ${withdrawEvent.receiver}`,
      };
    });

    if (!withdrawEvent || !nativeTransfer) {
      throw new Error(
        "shMONAD unstake Receipt requires both a Withdraw event and a native transfer",
      );
    }
    if (withdrawEvent.assets !== nativeTransfer.value) {
      throw new Error("shMONAD unstake assets differ between Withdraw event and native transfer");
    }

    const outcome: UnstakeOutcome = { operation: "unstake", ...withdrawEvent };
    return {
      kind: "receipt",
      outcome,
      text: `shMONAD Unstake: ${outcome.shares} shMON → ${outcome.assets} MON to ${outcome.receiver}`,
      changes: parsed,
    };
  }
}
