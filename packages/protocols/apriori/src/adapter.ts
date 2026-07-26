import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Receipt,
  type ReceiptResult,
  UnsignedIntegerString,
} from "@themoss/core";
import { ERC20, ERC20Abi } from "@themoss/erc";
import { decodeEventLog, parseUnits } from "viem";
import { AprMonAbi } from "./abis/apriori.js";
import type { ClaimOutcome, StakeOutcome, UnstakeOutcome } from "./types.js";

// aPriori aprMON liquid staking token + vault on Monad mainnet.
// Canonical deployment sources:
// - official docs (mainnet address + integration reference):
//   https://apriori-docs.gitbook.io/apriori-docs/aprmon/smart-contract-integration
// - MonadScan (verified TransparentUpgradeableProxy labeled "aPriori: aprMON
//   Token"; upgrade history shows the current EIP-1967 implementation
//   0x7D2F8dc5a67CA1911bb1A2429552CDf507d106F2 set at block 40,124,891):
//   https://monadscan.com/address/0x0c65A0BC65a5D819235B71F554D210D3F80E0852
// The proxy linkage, bytecode, token metadata, and every vendored
// selector/topic are enforced on chain by test-online/abi-explorer.test.ts.
// ABI origin: vendored (ADR 0007) — see src/abis/apriori.ts
export const APRMON_ADDRESS: AddressValue = "0x0c65A0BC65a5D819235B71F554D210D3F80E0852" as const;

// Static ERC-20 metadata for aprMON, verified on chain by the online suite.
// Exposed as constants (not Queries) because these values are immutable.
export const APRMON_NAME = "aPriori Monad LST" as const;
export const APRMON_SYMBOL = "aprMON" as const;
export const APRMON_DECIMALS = 18 as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
    description:
      "Human-readable aprMON share amount to queue for withdrawal; aprMON uses 18 decimals.",
  },
  controller: {
    type: Address,
    description:
      "Address that owns the withdrawal request and can claim the MON once it matures (aPriori's 'controller').",
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

// viem's parseUnits silently rounds excess fractional digits (at 18 decimals,
// "0.0000000000000000009" becomes 1n), so non-representable precision must be
// rejected before conversion.
function parseAmount18(value: string, field: string): bigint {
  const fraction = value.split(".")[1] ?? "";
  if (fraction.length > 18) {
    throw new Error(`aPriori ${field} supports at most 18 decimal places, got "${value}"`);
  }
  return parseUnits(value, 18);
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// Only decodes events actually emitted by the aprMON contract; a matching
// topic from any other emitter is not aPriori evidence and falls through to
// the ERC-20 dependency (which rejects what it cannot decode).
function tryDecodeAprioriEvent(change: Change) {
  if (change.kind !== "event" || !sameAddress(change.address, APRMON_ADDRESS)) {
    return undefined;
  }
  try {
    return decodeEventLog({
      abi: AprMonAbi,
      topics: change.topics as [`0x${string}`, ...`0x${string}`[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}

// Decodes an aprMON-emitted ERC-20 Transfer for cross-checking mint, escrow,
// and burn legs. The Change itself is still delegated to the erc20 dependency
// unchanged; this only feeds the correlation bookkeeping.
function tryDecodeAprMonTransfer(change: Change) {
  if (change.kind !== "event" || !sameAddress(change.address, APRMON_ADDRESS)) {
    return undefined;
  }
  try {
    const decoded = decodeEventLog({
      abi: ERC20Abi,
      topics: change.topics as [`0x${string}`, ...`0x${string}`[]],
      data: change.data,
      strict: true,
    });
    return decoded.eventName === "Transfer" ? decoded.args : undefined;
  } catch {
    return undefined;
  }
}

@Protocol({
  name: "apriori",
  category: "staking",
  description:
    "aPriori aprMON liquid staking on Monad: deposit MON for aprMON (ERC4626-style native-asset vault), queue withdrawals, and claim MON after the unbonding delay.",
  contracts: {
    aprMon: { abi: AprMonAbi, addr: APRMON_ADDRESS },
  },
  protocols: {
    erc20: ERC20,
  },
  labels: {
    aPriori: APRMON_ADDRESS,
  },
})
export class AprioriProtocol {
  declare aprMon: Handle<typeof AprMonAbi>;
  declare erc20: ProtocolRef<ERC20>;

  @Capability<AprioriProtocol, typeof stakeParams>({
    intent: "Deposit {amount} MON into aPriori for aprMON to {receiver}",
    verb: "stake",
    params: stakeParams,
    receipt: "stakeReceipt",
    risk: ["fundOut"],
    tags: ["staking", "liquid-staking", "lst", "erc4626"],
  })
  async stake(params: InferParams<typeof stakeParams>) {
    const amountBase = parseAmount18(params.amount, "stake amount");
    const transaction = this.aprMon.deposit([amountBase, params.receiver], {
      value: amountBase,
    });
    return [transaction];
  }

  @Capability<AprioriProtocol, typeof unstakeParams>({
    intent: "Queue {shares} aprMON for withdrawal, claimable by {controller}",
    verb: "unstake",
    params: unstakeParams,
    receipt: "unstakeReceipt",
    risk: ["fundOut"],
    tags: ["staking", "liquid-staking", "withdrawal-queue"],
  })
  async unstake(params: InferParams<typeof unstakeParams>, ctx: ActionCtx) {
    const sharesBase = parseAmount18(params.shares, "unstake shares");
    const transaction = this.aprMon.requestRedeem([
      sharesBase,
      params.controller,
      ctx.account as AddressValue,
    ]);
    return [transaction];
  }

  @Capability<AprioriProtocol, typeof claimParams>({
    intent: "Claim MON for withdrawal request {requestId} to {receiver}",
    verb: "claim",
    params: claimParams,
    receipt: "claimReceipt",
    // claim is inflow-only, but Registry rejects an empty risk list and the
    // closed RISK_LABELS set has no inflow/obligation label yet (#114).
    // Drop fundOut here as soon as #114 lands a correct minimal set.
    risk: ["fundOut"],
    tags: ["staking", "liquid-staking", "withdrawal-queue"],
  })
  async claim(params: InferParams<typeof claimParams>) {
    const transaction = this.aprMon.redeem([[BigInt(params.requestId)], params.receiver]);
    return [transaction];
  }

  // Live evidence shape (tx 0x0e949bd6…, Monad mainnet): aprMON mint Transfer
  // (zero → receiver), then Deposit, plus the caller → vault native MON
  // transfer. The mint Transfer is delegated to erc20 as a nested Receipt
  // (ADR 0011) and cross-checked against Deposit below.
  @Receipt()
  stakeReceipt(changes: readonly Change[]): ReceiptResult<StakeOutcome> {
    let event: StakeOutcome | undefined;
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    let mint: { to: string; value: bigint } | undefined;

    const parsed = changes.map((change): ReceiptResult["changes"][number] => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("aPriori stake Receipt saw multiple native transfers");
        native = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      const decoded = tryDecodeAprioriEvent(change);
      if (decoded?.eventName === "Deposit" && !event) {
        event = {
          operation: "stake",
          sender: decoded.args.sender,
          owner: decoded.args.owner,
          assets: decoded.args.assets.toString(),
          shares: decoded.args.shares.toString(),
        };
        return {
          kind: "change" as const,
          change,
          data: event,
          text: `aPriori Stake: ${event.assets} MON -> ${event.shares} aprMON for ${event.owner}`,
        };
      }

      const transfer = tryDecodeAprMonTransfer(change);
      if (transfer && sameAddress(transfer.from, ZERO_ADDRESS)) {
        if (mint) throw new Error("aPriori stake Receipt saw multiple aprMON mints");
        mint = { to: transfer.to, value: transfer.value };
      }
      return this.erc20.changesReceipt([change]);
    });

    if (!event || !native) {
      throw new Error("aPriori stake Receipt requires Deposit and native Changes");
    }
    if (
      native.value !== event.assets ||
      !sameAddress(native.to, APRMON_ADDRESS) ||
      !sameAddress(native.from, event.sender)
    ) {
      throw new Error(
        "aPriori stake Receipt requires the caller-to-vault native transfer to match Deposit",
      );
    }
    if (!mint || mint.value.toString() !== event.shares || !sameAddress(mint.to, event.owner)) {
      throw new Error("aPriori stake Receipt requires the aprMON mint to match Deposit");
    }

    return {
      kind: "receipt",
      outcome: event,
      text: `aPriori Stake: ${event.assets} MON -> ${event.shares} aprMON for ${event.owner}`,
      changes: parsed,
    };
  }

  // Live evidence shape (tx 0x68316b21…): aprMON Transfer owner → vault (the
  // vault escrows the shares at request time; the burn happens at claim),
  // then RedeemRequest. The escrow Transfer is delegated to erc20 and
  // cross-checked against RedeemRequest below.
  @Receipt()
  unstakeReceipt(changes: readonly Change[]): ReceiptResult<UnstakeOutcome> {
    let event: UnstakeOutcome | undefined;
    let escrow: { from: string; value: bigint } | undefined;

    const parsed = changes.map((change): ReceiptResult["changes"][number] => {
      if (change.kind === "nativeTransfer") {
        return this.erc20.changesReceipt([change]);
      }

      const decoded = tryDecodeAprioriEvent(change);
      if (decoded?.eventName === "RedeemRequest" && !event) {
        event = {
          operation: "unstake",
          controller: decoded.args.controller,
          owner: decoded.args.owner,
          sender: decoded.args.sender,
          requestId: decoded.args.requestId.toString(),
          shares: decoded.args.shares.toString(),
          assets: decoded.args.assets.toString(),
        };
        return {
          kind: "change" as const,
          change,
          data: event,
          text: `aPriori Unstake: ${event.shares} aprMON queued as request ${event.requestId} for ${event.controller}`,
        };
      }

      const transfer = tryDecodeAprMonTransfer(change);
      if (transfer && sameAddress(transfer.to, APRMON_ADDRESS)) {
        if (escrow) throw new Error("aPriori unstake Receipt saw multiple aprMON escrow transfers");
        escrow = { from: transfer.from, value: transfer.value };
      }
      return this.erc20.changesReceipt([change]);
    });

    if (!event) {
      throw new Error("aPriori unstake Receipt requires a RedeemRequest event");
    }
    if (
      !escrow ||
      escrow.value.toString() !== event.shares ||
      !sameAddress(escrow.from, event.owner)
    ) {
      throw new Error(
        "aPriori unstake Receipt requires the owner-to-vault aprMON escrow transfer to match RedeemRequest",
      );
    }

    return {
      kind: "receipt",
      outcome: event,
      text: `aPriori Unstake: ${event.shares} aprMON queued as request ${event.requestId} for ${event.controller}`,
      changes: parsed,
    };
  }

  // Live evidence shape (tx 0x7413c820…): the vault emits one (burn Transfer
  // vault → zero, Redeem) pair per claimed requestID, and pays the receiver
  // in native MON (no log; the simulator surfaces it as a nativeTransfer
  // Change). Redeem.assets is net of Redeem.fee. Burn Transfers are delegated
  // to erc20 and cross-checked in aggregate below.
  @Receipt()
  claimReceipt(changes: readonly Change[]): ReceiptResult<ClaimOutcome> {
    const events: {
      controller: AddressValue;
      receiver: AddressValue;
      requestId: bigint;
      shares: bigint;
      assets: bigint;
      fee: bigint;
    }[] = [];
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    let burned = 0n;

    const parsed = changes.map((change): ReceiptResult["changes"][number] => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("aPriori claim Receipt saw multiple native transfers");
        native = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }

      const decoded = tryDecodeAprioriEvent(change);
      if (decoded?.eventName === "Redeem") {
        const entry = {
          controller: decoded.args.controller,
          receiver: decoded.args.receiver,
          requestId: decoded.args.requestId,
          shares: decoded.args.shares,
          assets: decoded.args.assets,
          fee: decoded.args.fee,
        };
        events.push(entry);
        return {
          kind: "change" as const,
          change,
          data: {
            operation: "claim",
            requestId: entry.requestId.toString(),
            shares: entry.shares.toString(),
            assets: entry.assets.toString(),
            fee: entry.fee.toString(),
          },
          text: `aPriori Claim: request ${entry.requestId} -> ${entry.assets} MON (fee ${entry.fee}) to ${entry.receiver}`,
        };
      }

      const transfer = tryDecodeAprMonTransfer(change);
      if (
        transfer &&
        sameAddress(transfer.from, APRMON_ADDRESS) &&
        sameAddress(transfer.to, ZERO_ADDRESS)
      ) {
        burned += transfer.value;
      }
      return this.erc20.changesReceipt([change]);
    });

    const first = events[0];
    if (!first) {
      throw new Error("aPriori claim Receipt requires a Redeem event");
    }
    if (
      events.some(
        (entry) =>
          !sameAddress(entry.controller, first.controller) ||
          !sameAddress(entry.receiver, first.receiver),
      )
    ) {
      throw new Error(
        "aPriori claim Receipt saw Redeem events with mismatched controller or receiver",
      );
    }
    const totalShares = events.reduce((sum, entry) => sum + entry.shares, 0n);
    const totalAssets = events.reduce((sum, entry) => sum + entry.assets, 0n);
    const totalFee = events.reduce((sum, entry) => sum + entry.fee, 0n);

    if (burned !== totalShares) {
      throw new Error(
        "aPriori claim Receipt requires the vault-to-zero aprMON burns to match the Redeem shares",
      );
    }
    if (
      !native ||
      native.value !== totalAssets.toString() ||
      !sameAddress(native.from, APRMON_ADDRESS) ||
      !sameAddress(native.to, first.receiver)
    ) {
      throw new Error(
        "aPriori claim Receipt requires the vault-to-receiver native payout to match the Redeem assets",
      );
    }

    const outcome: ClaimOutcome = {
      operation: "claim",
      controller: first.controller,
      receiver: first.receiver,
      requestIds: events.map((entry) => entry.requestId.toString()),
      shares: totalShares.toString(),
      assets: totalAssets.toString(),
      fee: totalFee.toString(),
    };

    return {
      kind: "receipt",
      outcome,
      text: `aPriori Claim: request ${outcome.requestIds.join(",")} -> ${outcome.assets} MON (fee ${outcome.fee}) to ${outcome.receiver}`,
      changes: parsed,
    };
  }
}
