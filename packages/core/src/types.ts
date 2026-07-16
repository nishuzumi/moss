import type { Address, Hex } from "viem";

export type { Address, Hex };

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
  "approve",
] as const;
export type Verb = (typeof VERBS)[number];

export const CATEGORIES = ["dex", "lending", "staking", "rewards", "token", "nft"] as const;
export type Category = (typeof CATEGORIES)[number];

export const RISK_LABELS = ["fundOut", "approval", "priceImpact"] as const;
export type RiskLabel = (typeof RISK_LABELS)[number];

export const NATIVE = "native" as const;
export type TokenRef = Address | typeof NATIVE;

export type JsonSafeValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonSafeValue[]
  | { readonly [key: string]: JsonSafeValue };

export interface UnsignedTx {
  from: Address;
  to: Address;
  data: Hex;
  value: Hex;
}

export interface TransactionNode {
  kind: "transaction";
  transaction: UnsignedTx;
}

export interface CapabilityNode {
  kind: "capability";
  protocol: string;
  method: string;
  params: JsonSafeValue;
  children: readonly (CapabilityNode | TransactionNode)[];
}

export type CapabilityResult =
  | CapabilityNode
  | TransactionNode
  | readonly (CapabilityNode | TransactionNode)[];

export type ProtocolRef<T> = {
  [K in keyof T as T[K] extends (...args: infer _Args) => infer _Result ? K : never]: T[K] extends (
    params: infer Params,
    ...args: infer _Rest
  ) => infer Result
    ? Awaited<Result> extends CapabilityResult
      ? (params: Params) => Promise<CapabilityNode>
      : Result extends Receipt
        ? T[K]
        : (params: Params) => Promise<Awaited<Result>>
    : never;
};

export type Change =
  | {
      kind: "event";
      address: Address;
      topics: readonly Hex[];
      data: Hex;
    }
  | {
      kind: "nativeTransfer";
      from: Address;
      to: Address;
      value: string;
    };

export interface ReceiptChange {
  kind: "change";
  change: Change;
  data: JsonSafeValue;
  text: string;
}

export interface Receipt<TOutcome extends JsonSafeValue = JsonSafeValue> {
  kind: "receipt";
  outcome: TOutcome;
  text: string;
  changes: readonly (ReceiptChange | Receipt<JsonSafeValue>)[];
}
