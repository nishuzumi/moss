import type { AddressValue } from "@themoss/core";

/** The four Aave verbs this adapter exposes. */
export type AaveOperation = "supply" | "withdraw" | "borrow" | "repay";

/**
 * The scaled-balance event a position token emitted. Aave mints on a supply
 * or a borrow and burns on a withdraw or a repay, except when accrued interest
 * exceeds the amount being removed: `_burnScaled` then mints the difference
 * instead, so a withdraw or a repay can legitimately show `Mint`.
 */
export type AavePositionChange = {
  event: "Mint" | "Burn";
  /** Position token that emitted it: the reserve's aToken or debt token. */
  token: AddressValue;
  /** Scaled-balance amount moved, in the position token's base units. */
  amount: string;
  /** Interest that accrued into the position since its previous index. */
  balanceIncrease: string;
  /** Reserve index the position was valued at, in ray. */
  index: string;
};

/** A type alias, not an interface: Receipt Outcomes must stay JSON-safe. */
type AaveOutcomeBase = {
  protocol: "aave";
  /** Reserve asset the Pool named in its own event. */
  asset: AddressValue;
  /** Display symbol of that reserve. */
  symbol: string;
  /** Underlying amount the Pool reported, in the reserve's base units. */
  amount: string;
  position: AavePositionChange;
};

export type AaveSupplyOutcome = AaveOutcomeBase & {
  operation: "supply";
  /** Account that paid the underlying. */
  user: AddressValue;
  /** Account credited with the supply position. */
  onBehalfOf: AddressValue;
  /** Set when this supply switched the reserve on as collateral. */
  collateral: "enabled" | null;
};

export type AaveWithdrawOutcome = AaveOutcomeBase & {
  operation: "withdraw";
  /** Account whose supply position shrank. */
  user: AddressValue;
  /** Account that received the underlying. */
  to: AddressValue;
  /** Set when this withdraw switched the reserve off as collateral. */
  collateral: "disabled" | null;
};

export type AaveBorrowOutcome = AaveOutcomeBase & {
  operation: "borrow";
  /** Account that received the underlying. */
  user: AddressValue;
  /** Account that took on the debt. */
  onBehalfOf: AddressValue;
  /** Only variable exists on this deployment; Aave v3.2 removed stable rate. */
  interestRateMode: "variable";
  /** Variable borrow rate the Pool applied, per year in ray. */
  borrowRate: string;
};

export type AaveRepayOutcome = AaveOutcomeBase & {
  operation: "repay";
  /** Account whose debt shrank. */
  user: AddressValue;
  /** Account that paid the underlying. */
  repayer: AddressValue;
  interestRateMode: "variable";
};

export type AaveLendingOutcome =
  | AaveSupplyOutcome
  | AaveWithdrawOutcome
  | AaveBorrowOutcome
  | AaveRepayOutcome;

/** Health of one account across the whole market. */
export type AaveAccountData = {
  user: AddressValue;
  /**
   * Collateral, debt and remaining borrowing power in the market's base
   * currency unit, as integers exactly as the Pool returned them. Aave prices
   * that unit through its own oracle; this adapter does not rescale it.
   */
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  /** Weighted liquidation threshold, in basis points. */
  currentLiquidationThreshold: number;
  /** Weighted maximum loan-to-value, in basis points. */
  ltv: number;
  /** Below 1 the account is liquidatable. `null` when the account has no debt. */
  healthFactor: string | null;
};

/** Current rates and position tokens of one reserve. */
export type AaveReserveData = {
  asset: AddressValue;
  symbol: string;
  decimals: number;
  aToken: AddressValue;
  variableDebtToken: AddressValue;
  /** Rates as fractions: "0.0272" is 2.72%. */
  supplyApr: string;
  supplyApy: string;
  variableBorrowApr: string;
  variableBorrowApy: string;
  /** Cumulative reserve indices in ray, as the Pool reported them. */
  liquidityIndex: string;
  variableBorrowIndex: string;
};
