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
  "open",
  "close",
] as const;
export type Verb = (typeof VERBS)[number];

export const CATEGORIES = [
  "dex",
  "perps",
  "lending",
  "staking",
  "rewards",
  "token",
  "nft",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const RISK_LABELS = [
  "fundOut",
  "approval",
  "priceImpact",
  "debt",
  "leverage",
  "liquidation",
] as const;
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

export interface TrustedToken {
  address: Address;
  label: string;
}

export interface RegistryOptions {
  trustedTokens?: readonly TrustedToken[];
}

export interface PackageLabel {
  packageName: string;
  name: string;
}

export interface LabelScope {
  packageName: string;
  own: ReadonlyMap<string, string>;
  dependencies: ReadonlyMap<string, PackageLabel | null>;
}

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

declare const NESTABLE: unique symbol;

/**
 * Compile-time marker carried by a Capability result declared nestable.
 * `nestable()` is the only way to produce it.
 */
export interface NestableResult {
  readonly [NESTABLE]: undefined;
}

/**
 * A Capability result its own Protocol may nest through `self`. Returning
 * `nestable(...)` is the declaration: a Capability whose result is shaped like a
 * `CapabilityResult` but never declared stays outside `self`, because a
 * decorator is invisible to the type system and shape alone is not a statement
 * of intent.
 */
export type Nestable<R extends CapabilityResult = CapabilityResult> = R & NestableResult;

export type ProtocolRef<T> = {
  [K in keyof T as T[K] extends (...args: infer _Args) => infer _Result ? K : never]: T[K] extends (
    params: infer Params,
    ...args: infer _Rest
  ) => infer Result
    ? Awaited<Result> extends CapabilityResult
      ? (params: Params) => Promise<CapabilityNode>
      : Result extends ReceiptResult<infer Outcome>
        ? (params: Params, ...args: _Rest) => Receipt<Outcome>
        : (params: Params) => Promise<Awaited<Result>>
    : never;
};

/**
 * Names of the Capabilities a Protocol declared nestable, the only names `self`
 * accepts. A Capability declares itself by returning `nestable(...)`, so a
 * Query, a Receipt parser, a Capability that never declared itself, and an
 * undecorated helper that happens to return a `CapabilityResult` are all
 * rejected here instead of at the call site.
 *
 * Core's injected keys are excluded by name rather than by shape: `self` holds
 * a `SelfRef` over the same class, so resolving its type here would make this
 * constraint circular.
 */
export type NestableNames<T> = {
  [K in Exclude<keyof T, "self" | "runtime">]: T[K] extends (
    params: never,
    ...rest: never[]
  ) => infer Result
    ? Awaited<Result> extends NestableResult
      ? K
      : never
    : never;
}[Exclude<keyof T, "self" | "runtime">] &
  string;

/**
 * A Protocol's reference to a named subset of its OWN Capabilities, injected as
 * `self` by `@Protocol`. Calling one nests that Capability through Registry's
 * builder, so the nested node gets the same Zod parameter validation and the
 * same protocol and method stamping as any dependency call.
 *
 * The methods are named explicitly rather than taken wholesale: `ProtocolRef<T>`
 * over the whole class would map the `self` property back through itself, which
 * TypeScript rejects as an infinitely deep instantiation.
 */
export type SelfRef<T, Methods extends NestableNames<T> & keyof T> = ProtocolRef<Pick<T, Methods>>;

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

export interface ReceiptResult<TOutcome extends JsonSafeValue = JsonSafeValue> {
  kind: "receipt";
  outcome: TOutcome;
  text: string;
  changes: readonly (ReceiptChange | ReceiptResult<JsonSafeValue>)[];
}

export interface Receipt<TOutcome extends JsonSafeValue = JsonSafeValue>
  extends ReceiptResult<TOutcome> {
  protocol: string;
  changes: readonly (ReceiptChange | Receipt<JsonSafeValue>)[];
}
