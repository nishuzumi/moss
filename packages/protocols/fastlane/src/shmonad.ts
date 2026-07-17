// ============================================================
// FastLane shMONAD — Liquid Staking Protocol Adapter for Moss
//
// What it does:
//   shMONAD is FastLane's liquid staking token on Monad. Users
//   deposit native MON and receive shMON (a yield-bearing ERC-20
//   / ERC-4626 token) in return. The vault generates yield from
//   Monad staking rewards + MEV revenue.
//
// How it works (ERC-4626 pattern):
//   ┌──────────┐   deposit(MON)    ┌────────────────┐
//   │  User    │ ─────────────────→ │  shMONAD Vault │
//   │          │ ←───────────────── │  (ERC-4626)    │
//   └──────────┘   mint(shMON)      └────────────────┘
//
//   stake   = vault.deposit(assets, receiver) — MON in, shMON out
//   unstake = vault.redeem(shares, receiver, owner) — shMON in, MON out
//
// Key difference from WMON:
//   WMON is a 1:1 wrap (1 MON = 1 WMON always).
//   shMON has a variable exchange rate (1 shMON > 1 MON over time
//   as rewards accrue).
//
// Contract address (Monad mainnet):
//   0x1b68626dca36c7fe922fd2d55e4f631d962de19c
//   Source: www.fastlane.xyz (retrieved 2026-07-16)
//   Verification: on-chain bytecode check in E2E test
// ============================================================

import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type JsonSafeValue,
  type MossRuntime,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import { ShmonadAbi } from "./abis/shmond.js";
import type { ExchangeRateResult, StakeOutcome, UnstakeOutcome } from "./types.js";

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

/**
 * FastLane shMONAD vault address on Monad mainnet.
 *
 * Source: https://www.fastlane.xyz/ (retrieved 2026-07-16)
 * The E2E test verifies deployed bytecode at this address.
 *
 * This is an ERC-4626 vault that is ALSO the shMON ERC-20 token
 * contract (ERC-4626 extends ERC-20, so vault = token).
 */
export const SHMONAD_ADDRESS: AddressValue = "0x1b68626dca36c7fe922fd2d55e4f631d962de19c";

/** shMON uses 18 decimals (same as MON). */
const SHMON_DECIMALS = 18;

// ════════════════════════════════════════════════════════════
// Parameter specifications
//
// Moss uses a two-layer parameter model:
//   type  = a reusable Zod value contract (PositiveDecimalString,
//           Address, TokenReference, BasisPoints, etc.)
//   description = what this field *means* in this Capability/Query
//
// The type is context-free — it describes "what a valid value
// looks like" (e.g. a positive decimal string, a 0x address).
// The description gives context: "what role this value plays
// in this operation" (e.g. "MON amount to stake").
// ════════════════════════════════════════════════════════════

/** Parameters for stake/unstake: a human-readable MON or shMON amount. */
const amountParams = {
  amount: {
    // PositiveDecimalString: a base-10 decimal string like "1.5"
    // It's NOT a wei/bigint — the Protocol handles unit conversion.
    type: PositiveDecimalString,
    description:
      "Human-readable MON amount to stake, or shMON amount to unstake. " +
      "Both MON and shMON use 18 decimals.",
  },
} satisfies ParamsSpec;

/** Parameters for reading a balance: owner address. */
const balanceParams = {
  owner: {
    type: Address,
    description: "Address whose shMON balance is read.",
  },
} satisfies ParamsSpec;

// ════════════════════════════════════════════════════════════
// Protocol class
//
// @Protocol registers this as a self-describing adapter.
// The decorator injects contract Handles and Protocol dependencies
// at construction time (via Registry).
//
// What the decorator fields mean:
//   name       — unique slug used by MCP's discover/load tools
//   category   — one of the CATEGORIES set (here: "staking")
//   contracts  — named Handles to on-chain contracts
//   protocols  — other Protocols this one depends on (injected)
// ════════════════════════════════════════════════════════════

@Protocol({
  name: "fastlane-shmonad",
  category: "staking",
  description:
    "FastLane shMONAD — liquid staking on Monad. " +
    "Stake native MON to earn staking rewards + MEV revenue as shMON.",
  contracts: {
    // Handle name "vault" → this.vault typed as Handle<typeof ShmonadAbi>
    vault: { abi: ShmonadAbi, addr: SHMONAD_ADDRESS },
  },
  // No Protocol dependencies needed — shMONAD is self-contained.
  // (We don't need ERC-20 because the vault IS the token.)
})
export class Shmonad {
  // ════════════════════════════════════════════════════════════
  // Injected fields
  //
  // The @Protocol decorator generates a constructor that injects
  // these at runtime. The `declare` keyword tells TypeScript these
  // exist without defining them in the class body.
  // ════════════════════════════════════════════════════════════

  /** Handle to the shMONAD vault contract — used to encode calls. */
  declare vault: Handle<typeof ShmonadAbi>;
  /** Moss runtime — provides client, account, and chain info. */
  declare runtime: MossRuntime;

  // ════════════════════════════════════════════════════════════
  // Capability: stake
  //
  // @Capability marks a method as a write intent. It:
  //   1. Declares the user-facing intent text (for Agents)
  //   2. Assigns a verb from the closed VERBS set
  //   3. Names the @Receipt method that will parse the result
  //   4. Lists risk labels (for safety classification)
  //   5. Adds free-form tags for discovery
  //
  // Capability method signature:
  //   (params, ctx?) => TransactionNode | CapabilityNode[]
  //
  // A Capability owns EXACTLY ONE direct TransactionNode.
  // Additional transactions belong to nested Capabilities.
  //
  // Here: deposit native MON → receive shMON shares.
  // The vault's deposit() function is payable — we send MON
  // via {value: assets}.
  // ════════════════════════════════════════════════════════════

  @Capability<Shmonad, typeof amountParams>({
    intent: "Stake native MON into FastLane shMONAD to receive liquid staking shMON",
    verb: "stake",
    params: amountParams,
    // "stakeReceipt" matches the @Receipt method name below.
    // Registry uses this to look up the right parser at runtime.
    receipt: "stakeReceipt",
    risk: ["fundOut"],
    tags: ["liquid-staking", "lst", "yield"],
  })
  async stake(params: InferParams<typeof amountParams>, ctx: ActionCtx) {
    const assets = parseUnits(params.amount, SHMON_DECIMALS);

    return [
      this.vault.deposit([assets, ctx.account], {
        value: assets,
      }),
    ];
  }

  // ════════════════════════════════════════════════════════════
  // Capability: unstake
  //
  // Redeem (burn) shMON shares → withdraw native MON from vault.
  //
  // ERC-4626 redeem(shares, receiver, owner):
  //   shares    = amount of shMON to burn
  //   receiver  = who receives the MON
  //   owner     = who owns the shares (must be msg.sender or approved)
  //
  // Since the user calls through the Handle (msg.sender = user),
  // and receiver = owner = user, no ERC-20 approval is needed.
  //
  // NOTE: If FastLane queues unstaking (unbonding period), the TX
  // will submit the request but MON may arrive later. The Receipt
  // parser handles both immediate and queued cases.
  // ════════════════════════════════════════════════════════════

  @Capability<Shmonad, typeof amountParams>({
    intent: "Unstake shMON from FastLane to withdraw native MON from the vault",
    verb: "unstake",
    params: amountParams,
    receipt: "unstakeReceipt",
    risk: ["fundOut"],
    tags: ["liquid-staking", "lst", "withdrawal"],
  })
  async unstake(params: InferParams<typeof amountParams>, ctx: ActionCtx) {
    const shares = parseUnits(params.amount, SHMON_DECIMALS);

    return [this.vault.redeem([shares, ctx.account, ctx.account])];
  }

  // ════════════════════════════════════════════════════════════
  // Query: balanceOf
  //
  // @Query marks a read-only method. It never produces a
  // transaction — just returns data directly.
  // ════════════════════════════════════════════════════════════

  @Query({
    intent: "Read the shMON balance of a FastLane staker",
    params: balanceParams,
    tags: ["balance"],
  })
  async balanceOf(params: InferParams<typeof balanceParams>, _ctx: ActionCtx) {
    const balance = await this.vault.read.balanceOf([params.owner]);

    return {
      token: SHMONAD_ADDRESS,
      symbol: "shMON",
      decimals: SHMON_DECIMALS,
      balance: balance.toString(),
    };
  }

  // ════════════════════════════════════════════════════════════
  // Query: exchangeRate
  //
  // Returns the current MON-per-shMON exchange rate.
  // Since shMON accumulates staking rewards, 1 shMON > 1 MON
  // over time. The rate increases as rewards are distributed.
  //
  // Formula: rate = totalAssets / totalSupply
  // ════════════════════════════════════════════════════════════

  @Query({
    intent: "Read the current shMON-to-MON exchange rate from FastLane shMONAD",
    params: {} as ParamsSpec,
    tags: ["rate", "apy", "exchange-rate"],
  })
  async exchangeRate(): Promise<ExchangeRateResult> {
    // totalAssets() = total MON under management
    // totalSupply() = total shMON in circulation
    const [totalAssets, totalSupply] = await Promise.all([
      this.vault.read.totalAssets(),
      this.vault.read.totalSupply(),
    ]);

    // Calculate rate = totalAssets / totalSupply (precision: 18 decimals)
    // If totalSupply is 0 (no deposits yet), default to 1.0
    const rate =
      totalSupply > 0n
        ? formatUnits((totalAssets * 10n ** BigInt(SHMON_DECIMALS)) / totalSupply, SHMON_DECIMALS)
        : "1.0";

    return {
      token: SHMONAD_ADDRESS,
      symbol: "shMON",
      decimals: SHMON_DECIMALS,
      rate,
      totalAssets: totalAssets.toString(),
      totalShares: totalSupply.toString(),
    };
  }

  // ════════════════════════════════════════════════════════════
  // Receipt: stakeReceipt
  //
  // A Receipt parser is a PURE function with these rules:
  //   1. Receives ONLY the ordered Changes from one successful TX
  //      (immutable event logs + native MON transfers)
  //   2. Cannot call RPC, Handle read, or any external state
  //   3. Must cover EVERY Change (exact object identity + order)
  //   4. Returns structured Outcome + presentation text
  //
  // For a stake (deposit), the Changes (in execution order) are:
  //   [0] event Transfer(0x0, receiver, shares) — shMON minted
  //   [1] event Deposit(sender, receiver, assets, shares)
  //   [2] nativeTransfer(user → vault) — MON sent
  //
  // The exact order may vary by contract implementation — this
  // parser handles them by type, not by index.
  // ════════════════════════════════════════════════════════════

  @Receipt()
  stakeReceipt(changes: readonly Change[]): ReceiptResult<StakeOutcome> {
    // ── State accumulated across the loop ─────
    let depositEvent:
      | {
          sender: AddressValue;
          owner: AddressValue;
          assets: string;
          shares: string;
        }
      | undefined;

    // ── Iterate over every Change ─────────────
    const parsed = changes.map((change) => {
      // ── Case 1: native MON transfer ─────────
      if (change.kind === "nativeTransfer") {
        return {
          kind: "change" as const,
          change,
          data: {
            operation: "nativeTransfer",
            from: change.from,
            to: change.to,
            value: change.value,
          } as JsonSafeValue,
          text: `Native MON Transfer: ${change.value} wei from ${change.from} to ${change.to}`,
        };
      }

      // ── Case 2: contract event ────────────
      let event: ReturnType<typeof decodeEventLog<typeof ShmonadAbi>>;
      try {
        event = decodeEventLog({
          abi: ShmonadAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error(`Unexpected Change: ${change.address} emitted an unsupported event`);
      }

      // ── Case 2a: Transfer event ──────────
      if (event.eventName === "Transfer") {
        return {
          kind: "change" as const,
          change,
          data: {
            event: "Transfer",
            from: event.args.from,
            to: event.args.to,
            value: event.args.value.toString(),
          } as JsonSafeValue,
          text: `shMON Transfer: ${event.args.value.toString()} from ${event.args.from} to ${event.args.to}`,
        };
      }

      // ── Case 2b: Deposit event ────────────
      if (event.eventName === "Deposit") {
        if (depositEvent) {
          throw new Error("shMONAD stake: multiple Deposit events");
        }

        depositEvent = {
          sender: event.args.sender,
          owner: event.args.owner,
          assets: event.args.assets.toString(),
          shares: event.args.shares.toString(),
        };

        return {
          kind: "change" as const,
          change,
          data: {
            event: "Deposit",
            ...depositEvent,
          } as JsonSafeValue,
          text: [
            `shMONAD Deposit: ${depositEvent.owner} deposited`,
            `${depositEvent.assets} MON → ${depositEvent.shares} shMON`,
          ].join(" "),
        };
      }

      // ── Case 2c: unexpected event ────────
      throw new Error(`Unexpected Change: shMONAD emitted ${event.eventName}`);
    });

    // ── Validate ─────────────────────────────
    if (!depositEvent) {
      throw new Error("shMONAD stake Receipt requires a Deposit event");
    }

    // ── Build structured Outcome ────────────
    const outcome: StakeOutcome = {
      operation: "stake",
      account: depositEvent.owner,
      assets: depositEvent.assets,
      shares: depositEvent.shares,
    };

    // ── Return Receipt ──────────────────────
    return {
      kind: "receipt",
      // The structured outcome — authoritative data for SDK consumers
      outcome,
      // The presentation text — human-readable, a projection of outcome
      text: `Staked ${outcome.assets} MON → ${outcome.shares} shMON for ${outcome.account}`,
      // Every Change covered, in exact order
      changes: parsed,
    };
  }

  // ════════════════════════════════════════════════════════════
  // Receipt: unstakeReceipt
  //
  // For redeem (unstake), the expected Changes are:
  //   [0] event Transfer(owner, 0x0, shares) — shMON burned
  //   [1] event Withdraw(sender, receiver, owner, assets, shares)
  //   [2] nativeTransfer(vault → receiver) — MON returned
  //
  // If FastLane queues unstaking, there may be NO immediate
  // nativeTransfer — the Withdraw event confirms the request
  // was accepted, and MON arrives later.
  // ════════════════════════════════════════════════════════════

  @Receipt()
  unstakeReceipt(changes: readonly Change[]): ReceiptResult<UnstakeOutcome> {
    let withdrawEvent:
      | {
          sender: AddressValue;
          receiver: AddressValue;
          owner: AddressValue;
          assets: string;
          shares: string;
        }
      | undefined;

    const parsed = changes.map((change) => {
      // ── Case 1: native MON transfer ─────────
      if (change.kind === "nativeTransfer") {
        return {
          kind: "change" as const,
          change,
          data: {
            operation: "nativeTransfer",
            from: change.from,
            to: change.to,
            value: change.value,
          } as JsonSafeValue,
          text: `Native MON Transfer: ${change.value} wei from ${change.from} to ${change.to}`,
        };
      }

      // ── Case 2: contract event ────────────
      let event: ReturnType<typeof decodeEventLog<typeof ShmonadAbi>>;
      try {
        event = decodeEventLog({
          abi: ShmonadAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error(`Unexpected Change: ${change.address} emitted an unsupported event`);
      }

      // ── Case 2a: Transfer event (burn) ──
      if (event.eventName === "Transfer") {
        return {
          kind: "change" as const,
          change,
          data: {
            event: "Transfer",
            from: event.args.from,
            to: event.args.to,
            value: event.args.value.toString(),
          } as JsonSafeValue,
          text: `shMON Transfer: ${event.args.value.toString()} from ${event.args.from} to ${event.args.to}`,
        };
      }

      // ── Case 2b: Withdraw event ─────────
      if (event.eventName === "Withdraw") {
        if (withdrawEvent) {
          throw new Error("shMONAD unstake: multiple Withdraw events");
        }

        withdrawEvent = {
          sender: event.args.sender,
          receiver: event.args.receiver,
          owner: event.args.owner,
          assets: event.args.assets.toString(),
          shares: event.args.shares.toString(),
        };

        return {
          kind: "change" as const,
          change,
          data: {
            event: "Withdraw",
            ...withdrawEvent,
          } as JsonSafeValue,
          text: [
            `shMONAD Withdraw: ${withdrawEvent.receiver} redeemed`,
            `${withdrawEvent.shares} shMON → ${withdrawEvent.assets} MON`,
          ].join(" "),
        };
      }

      throw new Error(`Unexpected Change: shMONAD emitted ${event.eventName}`);
    });

    if (!withdrawEvent) {
      throw new Error("shMONAD unstake Receipt requires a Withdraw event");
    }

    const outcome: UnstakeOutcome = {
      operation: "unstake",
      account: withdrawEvent.receiver,
      shares: withdrawEvent.shares,
      assets: withdrawEvent.assets,
    };

    // Note: if unstaking is queued, nativeTransfer may be absent.
    // That's OK — the Withdraw event proves the request was accepted.
    const hasNativeTransfer = parsed.some((r) => r.change.kind === "nativeTransfer");

    return {
      kind: "receipt",
      outcome,
      text:
        `Unstaked ${outcome.shares} shMON → ${outcome.assets} MON for ${outcome.account}` +
        (hasNativeTransfer ? "" : " (queued — MON arrives after unbonding)"),
      changes: parsed,
    };
  }
}
