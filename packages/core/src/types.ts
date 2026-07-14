import type { Address, Hex } from "viem";

export type { Address, Hex };

/**
 * Verbs are the user-perspective fund semantic of a capability — never the
 * protocol's function name. WMON's `deposit()` is `wrap`, not `deposit`.
 * Closed set by design (see ADR 0003): intent alignment anchors on it, so
 * "user asked to swap, plan says supply" must be a hard mismatch. Adding a
 * verb requires a core PR; long-tail semantics go in free-form `tags`.
 */
export const VERBS = [
  "swap",
  "wrap",
  "unwrap",
  "supply",
  "withdraw",
  "borrow",
  "repay",
  "stake",
  "unstake",
  "claim",
  "mint",
  "transfer",
] as const;
export type Verb = (typeof VERBS)[number];

/** Coarse protocol domain. Closed set (ADR 0003). */
export const CATEGORIES = ["dex", "lending", "staking", "rewards", "token", "nft"] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Risk labels classify the *kind* of danger at discover/load time.
 * Quantified limits live in a Plan's `expects` (ADR 0004), not here.
 */
export const RISK_LABELS = ["fundOut", "approval", "priceImpact"] as const;
export type RiskLabel = (typeof RISK_LABELS)[number];

/** Sentinel for the chain's native asset (MON) in expects and effects. */
export const NATIVE = "native" as const;
export type TokenRef = Address | typeof NATIVE;

/** An unsigned transaction. Values are 0x-hex so Plans survive JSON transport. */
export interface UnsignedTx {
  from: Address;
  to: Address;
  data: Hex;
  value: Hex;
}

/** What a Plan declares may move. Reconciliation warns on anything undeclared. */
export interface Expects {
  /** Assets that may leave the account, with upper bounds. */
  out?: { token: TokenRef; amountMax: string }[];
  /** Assets expected to arrive, with lower bounds (a swap's minOut lives here). */
  in?: { token: TokenRef; amountMin: string }[];
  /** Approvals that may be granted. */
  approvals?: { token: Address; spender: Address; amountMax: string }[];
  /** NFT movements. `count` is a distinct-id maximum out or minimum in. */
  nfts?: {
    collection: Address;
    count: number;
    direction: "in" | "out";
    /**
     * Known token ids. Required and exhaustive for outflows; an optional
     * subset for inflows. `amountMax` is only valid on outflow items.
     */
    items?: { tokenId: string; amountMax?: string }[];
  }[];
}

/**
 * The self-contained output of a capability: unsigned transactions plus the
 * declared intent, risks, and quantified expects. Never signed, never sent.
 * Carries everything simulate needs — the MCP server stays stateless.
 */
export interface Plan {
  kind: "plan";
  protocol: string;
  method: string;
  verb: Verb;
  chainId: number;
  account: Address;
  /** Human-readable statement of what this plan is meant to do. */
  intent: string;
  declaredRisk: RiskLabel[];
  expects: Expects;
  /** @Event observation names expected to appear in simulation (receipts). */
  confirms: string[];
  txs: UnsignedTx[];
  /** keccak256 of the canonical JSON of {chainId, account, txs, expects, confirms}. */
  planHash: Hex;
}
