/**
 * FastLane shMONAD — liquid staking on Monad.
 *
 * shMONAD is an ERC-4626 vault + ERC-20 receipt token. Staking native MON
 * mints shMON (the receipt token); burning (redeeming) shMON returns the
 * underlying MON, which grows over time as staking rewards accrue.
 *
 * All addresses verified on-chain 2026-07-14 against rpc.monad.xyz:
 *   - Proxy (0x1B68626d…): ERC-1967 proxy, the address agents interact with.
 *   - Implementation (0x856A4019…): vault/receipt contract logic.
 *   - asset() returns 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE (native MON).
 *
 * This adapter follows the PR #31 Capability + Receipt framework:
 *   - Each @Capability returns exactly one direct TransactionNode.
 *   - Each @Capability names a @Receipt method for post-simulation parsing.
 *   - @Receipt methods are pure — they receive raw Changes, never touch
 *     Runtime or Handles.
 */
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import {
  type AddressValue,
  Address,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  Query,
  Receipt,
  type ReceiptResult as MossReceipt,
} from "@themoss/core";
import { ShMonadAbi } from "./abis/fastlane.js";

// ── Constants ───────────────────────────────────────────────────────────────

/** shMON proxy — the canonical address for all interactions. */
export const SHMON_PROXY_ADDRESS: AddressValue =
  "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c";

/** Implementation contract — not used directly but useful for EIP-1967 inspection. */
export const SHMON_IMPL_ADDRESS: AddressValue =
  "0x856A4019228c265DEE336DF705277607c4A18e1B";

/** Token ref for the shMON receipt token (same address as the proxy). */
export const SHMON: AddressValue = SHMON_PROXY_ADDRESS;

// ── Parameter specs ─────────────────────────────────────────────────────────

const stakeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Amount of native MON to stake.",
  },
} satisfies ParamsSpec;

const unstakeParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Amount of shMON to unstake.",
  },
} satisfies ParamsSpec;

const balanceOfParams = {
  owner: {
    type: Address,
    description: "Address to query the shMON balance of.",
  },
} satisfies ParamsSpec;

const emptyParams = {} satisfies ParamsSpec;

// ── Event ABIs for decoding (one per named receipt) ─────────────────────────

const DepositAbi = ShMonadAbi.filter(
  (item) => item.type === "event" && item.name === "Deposit",
);
const WithdrawAbi = ShMonadAbi.filter(
  (item) => item.type === "event" && item.name === "Withdraw",
);
const VAULT_ADDR_LOWER = SHMON_PROXY_ADDRESS.toLowerCase();

// ── Protocol class ───────────────────────────────────────────────────────────

@Protocol({
  name: "fastlane",
  category: "staking",
  description:
    "FastLane shMONAD: liquid staking on Monad. Stake native MON to receive shMON, " +
    "a reward-bearing receipt token that grows in value relative to MON over time.",
  contracts: {
    vault: { abi: ShMonadAbi, addr: SHMON_PROXY_ADDRESS },
  },
})
export class FastLane {
  declare vault: Handle<typeof ShMonadAbi>;

  // ═════════════════════════════════════════════════════════════════════════
  //  Capability: stake
  // ═════════════════════════════════════════════════════════════════════════

  @Capability<FastLane, typeof stakeParams>({
    intent: "Stake {amount} MON into FastLane shMONAD liquid staking",
    verb: "stake",
    params: stakeParams,
    receipt: "stakeReceipt",
    risk: ["fundOut"],
    tags: ["liquid-staking"],
  })
  async stake(
    { amount }: InferParams<typeof stakeParams>,
    ctx: { account: AddressValue },
  ) {
    // ERC-4626 deposit(assets, receiver) — payable, value=assets
    const wei = parseUnits(amount, 18);
    return [this.vault.deposit([wei, ctx.account], { value: wei })];
  }

  @Receipt()
  stakeReceipt(changes: readonly Change[]): MossReceipt<{ operation: "stake" }> {
    return wrapReceipt(changes, "stake", (change) => {
      if (change.kind !== "event" || change.address.toLowerCase() !== VAULT_ADDR_LOWER) {
        return null;
      }
      const decoded = decodeEventLog({
        abi: DepositAbi,
        data: change.data,
        topics: change.topics,
      }) as { args: { assets: bigint; shares: bigint } };
      const { assets, shares } = decoded.args;
      return {
        text: `Deposited ${formatUnits(assets, 18)} MON, minted ${shares.toString()} shMON`,
        data: { operation: "stake" as const, amount: formatUnits(assets, 18), shares: shares.toString() },
      };
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  Capability: unstake
  // ═════════════════════════════════════════════════════════════════════════

  @Capability<FastLane, typeof unstakeParams>({
    intent: "Unstake {amount} shMON back into native MON from FastLane",
    verb: "unstake",
    params: unstakeParams,
    receipt: "unstakeReceipt",
    risk: ["fundOut"],
    tags: ["liquid-staking"],
  })
  async unstake(
    { amount }: InferParams<typeof unstakeParams>,
    ctx: { account: AddressValue },
  ) {
    // ERC-4626 redeem(shares, receiver, owner)
    const wei = parseUnits(amount, 18);
    return [this.vault.redeem([wei, ctx.account, ctx.account])];
  }

  @Receipt()
  unstakeReceipt(
    changes: readonly Change[],
  ): MossReceipt<{ operation: "unstake" }> {
    return wrapReceipt(changes, "unstake", (change) => {
      if (change.kind !== "event" || change.address.toLowerCase() !== VAULT_ADDR_LOWER) {
        return null;
      }
      const decoded = decodeEventLog({
        abi: WithdrawAbi,
        data: change.data,
        topics: change.topics,
      }) as { args: { assets: bigint; shares: bigint } };
      const { assets, shares } = decoded.args;
      return {
        text: `Redeemed ${shares.toString()} shMON, received ${formatUnits(assets, 18)} MON`,
        data: {
          operation: "unstake" as const,
          amount: formatUnits(assets, 18),
          shares: shares.toString(),
        },
      };
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  Queries
  // ═════════════════════════════════════════════════════════════════════════

  @Query({
    intent: "shMON balance of {owner}",
    params: balanceOfParams,
  })
  async balanceOf(
    { owner }: InferParams<typeof balanceOfParams>,
    _ctx: { account: AddressValue },
  ) {
    const balance = await this.vault.read.balanceOf([owner]);
    return {
      token: SHMON_PROXY_ADDRESS,
      symbol: "shMON",
      decimals: 18,
      balance: balance.toString(),
    };
  }

  @Query({
    intent: "Current exchange rate: 1 shMON = {rate} MON",
    params: emptyParams,
  })
  async exchangeRate() {
    const rate = await this.vault.read.convertToAssets([1000000000000000000n]);
    return { rate: rate.toString() };
  }

  @Query({
    intent: "Total MON staked in FastLane shMONAD",
    params: emptyParams,
  })
  async totalStaked() {
    const total = await this.vault.read.totalAssets();
    return { total: total.toString() };
  }
}

// ── Receipt helper ───────────────────────────────────────────────────────────

/**
 * Build a MossReceipt from ordered Changes, decoding each that matches the
 * protocol's vault contract.
 *
 * Each decoded Change must retain the **original Change object identity** to
 * satisfy `verifyReceiptCoverage`.
 */
function wrapReceipt<T extends "stake" | "unstake">(
  changes: readonly Change[],
  operation: T,
  decode: (change: Change) => { text: string; data: Record<string, unknown> } | null,
): MossReceipt<{ operation: T }> {
  return {
    kind: "receipt",
    outcome: { operation },
    text: operation === "stake" ? "Staked into shMONAD" : "Unstaked from shMONAD",
    changes: changes.map((change) => {
      const parsed = decode(change);
      return {
        kind: "change",
        change,
        data: parsed?.data ?? { operation },
        text: parsed?.text ?? `Observed ${operation} change`,
      };
    }),
  };
}
