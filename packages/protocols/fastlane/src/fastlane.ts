import {
  type ActionCtx,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type MossRuntime,
  NATIVE,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  TokenReference,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import { FastLaneStakingAbi } from "./abis/fastlane.js";
import type {
  BoostYieldOutcome,
  CompleteUnstakeOutcome,
  DepositOutcome,
  RedeemOutcome,
  RequestUnstakeOutcome,
} from "./types.js";

// FastLane ShMonad staking proxy on Monad mainnet (chain ID 143).
// This is the canonical, actively-used SHMON token + ERC-4626 staking vault:
// https://monadscan.com/address/0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c
// EIP-1967 implementation: 0x856a4019228c265dee336df705277607c4a18e1b
// The vault itself implements the ERC-20 interface for shMON shares, so the
// staking address is also the SHMON token address (no separate token contract).
// ABI origin: explorer (ADR 0007) — see src/abis/fastlane.ts
export const FASTLANE_STAKING_ADDRESS: AddressValue =
  "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c" as const;

// Static ERC-20 metadata for shMON. Exposed as constants (not Queries) because
// these values are immutable on-chain and do not belong in the dynamic Query
// surface. Callers that need display metadata should read these directly.
export const SHMON_NAME = "ShMonad" as const;
export const SHMON_SYMBOL = "shMON" as const;
export const SHMON_DECIMALS = 18 as const;

const depositParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Human-readable MON amount to stake; MON uses 18 decimals.",
  },
  receiver: {
    type: TokenReference,
    description: "Address that receives shMON shares.",
  },
} satisfies {
  amount: { type: typeof PositiveDecimalString; description: string };
  receiver: { type: typeof TokenReference; description: string };
};

const requestUnstakeParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable shMON shares to unstake.",
  },
} satisfies { shares: { type: typeof PositiveDecimalString; description: string } };

const completeUnstakeParams = {} satisfies Record<string, never>;

const redeemParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable shMON shares to atomically redeem for MON.",
  },
  receiver: {
    type: TokenReference,
    description: "Address that receives the native MON payout.",
  },
} satisfies {
  shares: { type: typeof PositiveDecimalString; description: string };
  receiver: { type: typeof TokenReference; description: string };
};

const boostYieldParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable shMON shares to boost yield.",
  },
  yieldOriginator: {
    type: TokenReference,
    description: "Address of the yield originator contract.",
  },
} satisfies {
  shares: { type: typeof PositiveDecimalString; description: string };
  yieldOriginator: { type: typeof TokenReference; description: string };
};

const previewDepositParams = {
  assets: {
    type: PositiveDecimalString,
    description: "Human-readable MON amount to preview; MON uses 18 decimals.",
  },
} satisfies { assets: { type: typeof PositiveDecimalString; description: string } };

const previewRedeemParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable shMON shares to preview; shMON uses 18 decimals.",
  },
} satisfies { shares: { type: typeof PositiveDecimalString; description: string } };

const convertToAssetsParams = {
  shares: {
    type: PositiveDecimalString,
    description: "Human-readable shMON shares to convert at the current exchange rate.",
  },
} satisfies { shares: { type: typeof PositiveDecimalString; description: string } };

@Protocol({
  name: "fastlane",
  category: "staking",
  description:
    "FastLane shMONAD liquid staking (ERC-4626 vault): deposit MON for shMON, atomically redeem or two-step unstake, and boost yield. shMON metadata: name=ShMonad, symbol=shMON, decimals=18.",
  contracts: {
    staking: {
      abi: FastLaneStakingAbi,
      addr: FASTLANE_STAKING_ADDRESS,
    },
  },
  protocols: {
    erc20: ERC20,
  },
  labels: {
    FastLane: FASTLANE_STAKING_ADDRESS,
  },
})
export class FastLane {
  declare runtime: MossRuntime;
  declare staking: Handle<typeof FastLaneStakingAbi>;
  declare erc20: ProtocolRef<ERC20>;

  @Capability<FastLane, typeof depositParams>({
    intent: "Deposit MON into FastLane shMONAD staking to receive shMON shares",
    verb: "stake",
    params: depositParams,
    receipt: "depositReceipt",
    risk: ["fundOut"],
    tags: ["staking", "liquid-staking"],
  })
  async deposit(params: InferParams<typeof depositParams>) {
    const assets = parseUnits(params.amount, 18);
    if (params.receiver === NATIVE) {
      throw new Error("FastLane deposit requires an explicit shMON receiver address, not native");
    }
    return [this.staking.deposit([assets, params.receiver as AddressValue], { value: assets })];
  }

  @Capability<FastLane, typeof redeemParams>({
    intent:
      "Atomically redeem shMON shares for native MON via the ERC-4626 redeem path (may include an atomic exit fee)",
    verb: "unstake",
    params: redeemParams,
    receipt: "redeemReceipt",
    risk: ["fundOut", "priceImpact"],
    tags: ["staking", "liquid-staking", "atomic"],
  })
  async redeem(params: InferParams<typeof redeemParams>, ctx: ActionCtx) {
    if (params.receiver === NATIVE) {
      throw new Error("FastLane redeem requires an explicit MON receiver address, not native");
    }
    const shares = parseUnits(params.shares, 18);
    return [
      this.staking.redeem([shares, params.receiver as AddressValue, ctx.account as AddressValue]),
    ];
  }

  @Capability<FastLane, typeof requestUnstakeParams>({
    intent: "Request delayed unstaking of shMONAD shares to MON (waits for epoch completion)",
    verb: "unstake",
    params: requestUnstakeParams,
    receipt: "requestUnstakeReceipt",
    risk: ["fundOut"],
    tags: ["staking", "unstake", "delayed"],
  })
  async requestUnstake(params: InferParams<typeof requestUnstakeParams>) {
    const shares = parseUnits(params.shares, 18);
    return [this.staking.requestUnstake([shares])];
  }

  @Capability<FastLane, typeof completeUnstakeParams>({
    intent: "Complete a delayed unstaking request after epoch completion",
    verb: "unstake",
    params: completeUnstakeParams,
    receipt: "completeUnstakeReceipt",
    risk: ["fundOut"],
    tags: ["staking", "unstake", "delayed"],
  })
  async completeUnstake() {
    return [this.staking.completeUnstake([])];
  }

  @Capability<FastLane, typeof boostYieldParams>({
    intent: "Boost shMONAD yield by providing liquidity",
    verb: "swap",
    params: boostYieldParams,
    receipt: "boostYieldReceipt",
    risk: ["fundOut", "priceImpact"],
    tags: ["staking", "yield"],
  })
  async boostYield(params: InferParams<typeof boostYieldParams>, ctx: ActionCtx) {
    const shares = parseUnits(params.shares, 18);
    if (params.yieldOriginator === NATIVE) {
      throw new Error(
        "FastLane boostYield requires an explicit yield originator address, not native",
      );
    }
    return [
      this.staking.boostYield([
        shares,
        ctx.account as AddressValue,
        params.yieldOriginator as AddressValue,
      ]),
    ];
  }

  @Query({
    intent:
      "Read shMONAD staking balance for an account. Returns { account, balance (raw uint256 string in base units), formatted (18-decimal string) }",
    params: {
      account: {
        type: TokenReference,
        description: "Address whose shMON balance is queried.",
      },
    },
  })
  async balanceOf(
    params: InferParams<{ account: { type: typeof TokenReference; description: string } }>,
  ) {
    if (params.account === NATIVE) {
      throw new Error("balanceOf requires an explicit shMON address, not native");
    }
    const balance = await this.staking.read.balanceOf([params.account as AddressValue]);
    return {
      account: params.account,
      balance: balance.toString(),
      formatted: formatUnits(balance, 18),
    };
  }

  @Query({
    intent:
      "Read total shMON supply. Returns { supply (raw uint256 string), formatted (18-decimal string) }",
    params: {},
  })
  async totalSupply() {
    const supply = await this.staking.read.totalSupply();
    return { supply: supply.toString(), formatted: formatUnits(supply, 18) };
  }

  @Query({
    intent:
      "Preview how many shMON shares would be minted for a given MON deposit at the current exchange rate. Returns { assets (input string), shares (raw uint256 string in base units), formatted (18-decimal shares string) }",
    params: previewDepositParams,
    tags: ["preview", "erc-4626"],
  })
  async previewDeposit(params: InferParams<typeof previewDepositParams>) {
    const shares = await this.staking.read.previewDeposit([parseUnits(params.assets, 18)]);
    return { assets: params.assets, shares: shares.toString(), formatted: formatUnits(shares, 18) };
  }

  @Query({
    intent:
      "Preview how much native MON would be returned for atomically redeeming a given shMON amount (ERC-4626 atomic path, may include exit fee). Returns { shares (input string), assets (raw uint256 string in base units), formatted (18-decimal assets string) }",
    params: previewRedeemParams,
    tags: ["preview", "erc-4626"],
  })
  async previewRedeem(params: InferParams<typeof previewRedeemParams>) {
    const assets = await this.staking.read.previewRedeem([parseUnits(params.shares, 18)]);
    return { shares: params.shares, assets: assets.toString(), formatted: formatUnits(assets, 18) };
  }

  @Query({
    intent:
      "Convert shMON shares to MON assets at the current vault exchange rate. Returns { shares (input string), assets (raw uint256 string in base units), formatted (18-decimal assets string) }",
    params: convertToAssetsParams,
    tags: ["exchange-rate", "erc-4626"],
  })
  async convertToAssets(params: InferParams<typeof convertToAssetsParams>) {
    const assets = await this.staking.read.convertToAssets([parseUnits(params.shares, 18)]);
    return { shares: params.shares, assets: assets.toString(), formatted: formatUnits(assets, 18) };
  }

  @Receipt()
  depositReceipt(changes: readonly Change[]): ReceiptResult<DepositOutcome> {
    let event: DepositOutcome | undefined;
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("FastLane deposit emitted multiple native transfers");
        native = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      const decoded = tryDecodeFastLaneEvent(change as Extract<Change, { kind: "event" }>);
      if (decoded?.eventName !== "Deposit" || event) {
        return this.erc20.changesReceipt([change]);
      }

      event = {
        operation: "deposit",
        sender: decoded.args.sender,
        receiver: decoded.args.owner,
        assets: decoded.args.assets.toString(),
        shares: decoded.args.shares.toString(),
      };

      return {
        kind: "change" as const,
        change,
        data: event,
        text: `FastLane Deposit: ${event.assets} MON -> ${event.shares} shMON by ${event.sender}`,
      };
    });

    if (!event || !native || event.assets !== native.value) {
      throw new Error("FastLane deposit Receipt requires matching Deposit and native Changes");
    }

    return {
      kind: "receipt",
      outcome: event,
      text: `FastLane Deposit: ${event.assets} MON -> ${event.shares} shMON by ${event.sender}`,
      changes: parsed,
    };
  }

  @Receipt()
  redeemReceipt(changes: readonly Change[]): ReceiptResult<RedeemOutcome> {
    let event: RedeemOutcome | undefined;
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("FastLane redeem emitted multiple native transfers");
        native = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      const decoded = tryDecodeFastLaneEvent(change as Extract<Change, { kind: "event" }>);
      // The ERC-4626 redeem path emits a Withdraw event plus a burn Transfer
      // (from owner to zero address). Withdraw is the canonical outcome source;
      // the burn Transfer is delegated to the ERC20 dependency.
      if (decoded?.eventName !== "Withdraw" || event) {
        return this.erc20.changesReceipt([change]);
      }

      event = {
        operation: "redeem",
        sender: decoded.args.sender,
        receiver: decoded.args.receiver,
        owner: decoded.args.owner,
        assets: decoded.args.assets.toString(),
        shares: decoded.args.shares.toString(),
      };

      return {
        kind: "change" as const,
        change,
        data: event,
        text: `FastLane Redeem: ${event.shares} shMON -> ${event.assets} MON to ${event.receiver}`,
      };
    });

    if (!event || !native || event.assets !== native.value) {
      throw new Error("FastLane redeem Receipt requires matching Withdraw and native Changes");
    }

    return {
      kind: "receipt",
      outcome: event,
      text: `FastLane Redeem: ${event.shares} shMON -> ${event.assets} MON to ${event.receiver}`,
      changes: parsed,
    };
  }

  @Receipt()
  requestUnstakeReceipt(changes: readonly Change[]): ReceiptResult<RequestUnstakeOutcome> {
    let event: RequestUnstakeOutcome | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        return this.erc20.changesReceipt([change]);
      }

      const decoded = tryDecodeFastLaneEvent(change as Extract<Change, { kind: "event" }>);
      if (decoded?.eventName !== "RequestUnstake" || event) {
        return this.erc20.changesReceipt([change]);
      }

      event = {
        operation: "requestUnstake",
        owner: decoded.args.owner,
        shares: decoded.args.shares.toString(),
        amountMon: decoded.args.amountMon.toString(),
        completionEpoch: decoded.args.completionEpoch.toString(),
      };

      return {
        kind: "change" as const,
        change,
        data: event,
        text: `FastLane Unstake Request: ${event.shares} shMON -> ${event.amountMon} MON (epoch ${event.completionEpoch})`,
      };
    });

    if (!event) {
      throw new Error("FastLane requestUnstake Receipt requires RequestUnstake event");
    }

    return {
      kind: "receipt",
      outcome: event,
      text: `FastLane Unstake Request: ${event.shares} shMON -> ${event.amountMon} MON (epoch ${event.completionEpoch})`,
      changes: parsed,
    };
  }

  @Receipt()
  completeUnstakeReceipt(changes: readonly Change[]): ReceiptResult<CompleteUnstakeOutcome> {
    let event: CompleteUnstakeOutcome | undefined;
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("FastLane completeUnstake emitted multiple native transfers");
        native = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      const decoded = tryDecodeFastLaneEvent(change as Extract<Change, { kind: "event" }>);
      if (decoded?.eventName !== "CompleteUnstake" || event) {
        return this.erc20.changesReceipt([change]);
      }

      event = {
        operation: "completeUnstake",
        owner: decoded.args.owner,
        amountMon: decoded.args.amountMon.toString(),
      };

      return {
        kind: "change" as const,
        change,
        data: event,
        text: `FastLane Unstake Complete: ${event.amountMon} MON to ${event.owner}`,
      };
    });

    if (!event || !native || event.amountMon !== native.value) {
      throw new Error(
        "FastLane completeUnstake Receipt requires matching CompleteUnstake and native Changes",
      );
    }

    return {
      kind: "receipt",
      outcome: event,
      text: `FastLane Unstake Complete: ${event.amountMon} MON to ${event.owner}`,
      changes: parsed,
    };
  }

  @Receipt()
  boostYieldReceipt(changes: readonly Change[]): ReceiptResult<BoostYieldOutcome> {
    let event: BoostYieldOutcome | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        return this.erc20.changesReceipt([change]);
      }

      const decoded = tryDecodeFastLaneEvent(change as Extract<Change, { kind: "event" }>);
      if (decoded?.eventName !== "Transfer" || event) {
        return this.erc20.changesReceipt([change]);
      }

      event = {
        operation: "boostYield",
        from: decoded.args.from,
        shares: decoded.args.value.toString(),
        yieldOriginator: decoded.args.to,
      };

      return {
        kind: "change" as const,
        change,
        data: event,
        text: `FastLane Boost Yield: ${event.shares} shMON from ${event.from} to ${event.yieldOriginator}`,
      };
    });

    if (!event) {
      throw new Error("FastLane boostYield Receipt requires Transfer event");
    }

    return {
      kind: "receipt",
      outcome: event,
      text: `FastLane Boost Yield: ${event.shares} shMON from ${event.from} to ${event.yieldOriginator}`,
      changes: parsed,
    };
  }
}

function tryDecodeFastLaneEvent(change: Extract<Change, { kind: "event" }>) {
  try {
    return decodeEventLog({
      abi: FastLaneStakingAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}
