import type { AddressValue } from "@themoss/core";

// ============================================================
// Type definitions for FastLane shMONAD Protocol.
//
// Every Capability and Query returns structured, JSON-safe data.
// These types define the shape of the authoritative Outcome
// stored in each Receipt.
// ============================================================

/** Outcome of a successful stake (deposit MON → receive shMON). */
export type StakeOutcome = {
  /** Always "stake" — distinguishes this outcome type. */
  operation: "stake";
  /** Address that staked the MON. */
  account: AddressValue;
  /** Amount of MON staked, in wei (decimal string). */
  assets: string;
  /** Amount of shMON minted, in wei (decimal string). */
  shares: string;
};

/** Outcome of a successful unstake (redeem shMON → withdraw MON). */
export type UnstakeOutcome = {
  /** Always "unstake" — distinguishes this outcome type. */
  operation: "unstake";
  /** Address that unstaked the shMON. */
  account: AddressValue;
  /** Amount of shMON burned, in wei (decimal string). */
  shares: string;
  /** Amount of MON returned, in wei (decimal string). */
  assets: string;
};

/** Result of an exchange-rate query. */
export type ExchangeRateResult = {
  /** shMON contract address. */
  token: AddressValue;
  /** Token symbol ("shMON"). */
  symbol: string;
  /** Token decimals (always 18). */
  decimals: number;
  /**
   * Current MON-per-shMON exchange rate as a human-readable decimal string.
   * e.g. "1.05" means 1 shMON = 1.05 MON.
   * Calculated as totalAssets() / totalSupply().
   */
  rate: string;
  /** Total MON staked in the vault (wei, decimal string). */
  totalAssets: string;
  /** Total shMON in circulation (wei, decimal string). */
  totalShares: string;
};
