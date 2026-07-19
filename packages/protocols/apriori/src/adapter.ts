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
  Receipt,
  type ReceiptResult,
  UnsignedIntegerString,
} from "@themoss/core";
import { decodeEventLog, parseUnits } from "viem";
import { AprMonAbi, APRMON_ADDRESS } from "./abis/apriori.js";

const stakeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Human-readable MON amount to deposit; MON uses 18 decimals.",
  },
  receiver: {
    type: Address,
    description: "Address that receives the minted aprMON shares.",
  },
} satisfies ParamsSpec;

const unstakeParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable aprMON share amount to queue for withdrawal; aprMON uses 18 decimals.",
  },
  receiver: {
    type: Address,
    description: "Address that will own the withdrawal request and can claim MON.",
  },
} satisfies ParamsSpec;

const claimParams = {
  requestId: {
    type: UnsignedIntegerString,
    description: "Withdrawal request ID returned by the unstake (requestRedeem) step.",
  },
  receiver: {
    type: Address,
    description: "Address that receives the claimed MON.",
  },
} satisfies ParamsSpec;

type StakeOutcome = {
  operation: "stake";
  account: AddressValue;
  assets: string;
  shares: string;
};
type UnstakeOutcome = {
  operation: "unstake";
  account: AddressValue;
  shares: string;
  requestId: string;
};
type ClaimOutcome = {
  operation: "claim";
  account: AddressValue;
  requestId: string;
  assets: string;
};

@Protocol({
  name: "apriori",
  category: "staking",
  description:
    "aPriori aprMON liquid staking on Monad: deposit MON for aprMON (ERC4626 vault), queue withdrawals, and claim MON. Native-asset vault with async redemption.",
  contracts: {
    aprMon: { abi: AprMonAbi, addr: APRMON_ADDRESS },
  },
})
export class AprioriProtocol {
  declare aprMon: Handle<typeof AprMonAbi>;

  @Capability<AprioriProtocol, typeof stakeParams>({
    intent: "Deposit {amount} MON into aPriori for aprMON to {receiver}",
    verb: "stake",
    params: stakeParams,
    receipt: "stakeReceipt",
    risk: ["fundOut", "priceImpact"],
    tags: ["staking", "liquid-staking", "lst", "erc4626"],
  })
  async stake(params: InferParams<typeof stakeParams>) {
    const amountBase = parseUnits(params.amount, 18);
    const transaction = this.aprMon.deposit([amountBase, params.receiver], {
      value: amountBase,
    });
    return [transaction];
  }

  @Capability<AprioriProtocol, typeof unstakeParams>({
    intent: "Queue {shares} aprMON for withdrawal to {receiver}",
    verb: "unstake",
    params: unstakeParams,
    receipt: "unstakeReceipt",
    risk: ["priceImpact"],
    tags: ["staking", "liquid-staking", "withdrawal-queue"],
  })
  async unstake(params: InferParams<typeof unstakeParams>) {
    const sharesBase = parseUnits(params.shares, 18);
    const transaction = this.aprMon.requestRedeem([sharesBase, params.receiver]);
    return [transaction];
  }

  @Capability<AprioriProtocol, typeof claimParams>({
    intent: "Claim MON for withdrawal request {requestId} to {receiver}",
    verb: "claim",
    params: claimParams,
    receipt: "claimReceipt",
    risk: ["fundOut"],
    tags: ["staking", "liquid-staking", "withdrawal-queue"],
  })
  async claim(params: InferParams<typeof claimParams>) {
    const transaction = this.aprMon.redeem([
      [BigInt(params.requestId)],
      params.receiver,
    ]);
    return [transaction];
  }

  @Receipt()
  stakeReceipt(changes: readonly Change[]): ReceiptResult<StakeOutcome> {
    let deposited: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    let event: StakeOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (deposited) throw new Error("aPriori stake emitted multiple native transfers");
        deposited = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }
      if (change.kind !== "event") throw new Error("Unexpected Change kind");
      let decoded: ReturnType<typeof decodeEventLog<typeof AprMonAbi>>;
      try {
        decoded = decodeEventLog({
          abi: AprMonAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported aPriori event");
      }
      if (decoded.eventName !== "Deposit" || event) {
        throw new Error(`Unexpected Change: aPriori emitted ${decoded.eventName}`);
      }
      event = {
        operation: "stake",
        account: decoded.args.owner,
        assets: decoded.args.assets.toString(),
        shares: decoded.args.shares.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: event,
        text: `aPriori Stake: ${event.assets} MON → ${event.shares} aprMON by ${event.account}`,
      };
    });
    if (!event || !deposited || event.assets !== deposited.value) {
      throw new Error("aPriori stake Receipt requires matching Deposit event and native transfer");
    }
    return {
      kind: "receipt",
      outcome: event,
      text: `aPriori Stake: ${event.assets} MON → ${event.shares} aprMON by ${event.account}`,
      changes: parsed,
    };
  }

  @Receipt()
  unstakeReceipt(changes: readonly Change[]): ReceiptResult<UnstakeOutcome> {
    let event: UnstakeOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind !== "event") throw new Error("Unexpected Change kind");
      let decoded: ReturnType<typeof decodeEventLog<typeof AprMonAbi>>;
      try {
        decoded = decodeEventLog({
          abi: AprMonAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported aPriori event");
      }
      if (decoded.eventName !== "RequestRedeem" || event) {
        throw new Error(`Unexpected Change: aPriori emitted ${decoded.eventName}`);
      }
      event = {
        operation: "unstake",
        account: decoded.args.owner,
        shares: decoded.args.shares.toString(),
        requestId: decoded.args.requestId.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: event,
        text: `aPriori Unstake: ${event.shares} aprMON queued, request ${event.requestId} by ${event.account}`,
      };
    });
    if (!event) throw new Error("aPriori unstake Receipt requires a RequestRedeem event");
    return {
      kind: "receipt",
      outcome: event,
      text: `aPriori Unstake: ${event.shares} aprMON queued, request ${event.requestId} by ${event.account}`,
      changes: parsed,
    };
  }

  @Receipt()
  claimReceipt(changes: readonly Change[]): ReceiptResult<ClaimOutcome> {
    let event: ClaimOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind !== "event") throw new Error("Unexpected Change kind");
      let decoded: ReturnType<typeof decodeEventLog<typeof AprMonAbi>>;
      try {
        decoded = decodeEventLog({
          abi: AprMonAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported aPriori event");
      }
      if (decoded.eventName !== "Redeem" || event) {
        throw new Error(`Unexpected Change: aPriori emitted ${decoded.eventName}`);
      }
      const requestIds = (decoded.args.requestIds ?? []).map((x: bigint) => x.toString());
      event = {
        operation: "claim",
        account: decoded.args.owner,
        requestId: requestIds[0] ?? "0",
        assets: decoded.args.assets.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: event,
        text: `aPriori Claim: request ${requestIds.join(",")} → ${event.assets} MON by ${event.account}`,
      };
    });
    if (!event) throw new Error("aPriori claim Receipt requires a Redeem event");
    return {
      kind: "receipt",
      outcome: event,
      text: `aPriori Claim: request ${event.requestId} → ${event.assets} MON by ${event.account}`,
      changes: parsed,
    };
  }
}
