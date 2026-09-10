import type { AddressValue } from "@themoss/core";

/** One EVK vault, after every claim about it has been verified on-chain. */
export type VerifiedVault = {
  address: AddressValue;
  /** Underlying ERC-20 the vault lends, from the vault's own `asset()`. */
  asset: AddressValue;
  /** Display decimals of `asset`, read from the token itself. */
  assetDecimals: number;
  symbol: string;
  name: string;
  /** Which perspective vouched for the vault: both are Euler-deployed registries. */
  perspective: "governed" | "escrowedCollateral";
};

/**
 * Public shapes for the two methods with optional inputs. `InferParams` keeps
 * an optional field's key required (its value merely widens to `| undefined`),
 * so the decorated implementations carry a narrower public overload — the same
 * pattern the Kuru adapter uses for its exclusive amount sides.
 */
export type EulerBorrowParams = {
  vault: AddressValue;
  amount: string;
  collateral?: AddressValue;
};

export type EulerMarketsParams = {
  asset?: AddressValue;
};

export type EulerSupplyOutcome = {
  operation: "supply";
  vault: AddressValue;
  asset: AddressValue;
  sender: AddressValue;
  owner: AddressValue;
  /** Underlying assets pulled into the vault, in the asset's base units. */
  assets: string;
  /** Vault shares minted to `owner`, in the vault's base units. */
  shares: string;
};

export type EulerWithdrawOutcome = {
  operation: "withdraw";
  vault: AddressValue;
  asset: AddressValue;
  sender: AddressValue;
  receiver: AddressValue;
  owner: AddressValue;
  assets: string;
  shares: string;
};

export type EulerBorrowOutcome = {
  operation: "borrow";
  vault: AddressValue;
  asset: AddressValue;
  account: AddressValue;
  receiver: AddressValue;
  assets: string;
  /** Vault-owned debt token that minted the matching debt balance. */
  debtToken: AddressValue;
};

export type EulerRepayOutcome = {
  operation: "repay";
  vault: AddressValue;
  asset: AddressValue;
  account: AddressValue;
  assets: string;
  debtToken: AddressValue;
};

export type EulerAccountStatusOutcome = {
  operation: "enableCollateral" | "enableController";
  account: AddressValue;
  vault: AddressValue;
  enabled: boolean;
};

export type EulerOutcome =
  | EulerSupplyOutcome
  | EulerWithdrawOutcome
  | EulerBorrowOutcome
  | EulerRepayOutcome
  | EulerAccountStatusOutcome;
