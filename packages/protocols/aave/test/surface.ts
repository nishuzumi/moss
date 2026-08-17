/**
 * The Pool ABI surface this adapter depends on: the functions its Capabilities
 * and Queries encode, and the events its Receipt parsers decode. Two suites
 * enforce it, so it is declared once here rather than transcribed twice:
 *
 *  - the live Monad suite finds every selector in the deployed implementation
 *    and every event topic in the logic libraries the Pool delegatecalls;
 *  - `pnpm test:abi:online` compares exactly these items against the ABI of
 *    the explorer-verified implementation (ADR 0007).
 *
 * `getSupplyLogic` and `getBorrowLogic` are deliberately absent. The adapter
 * never calls them, the live suite reads them only to locate the libraries, and
 * they are two of the five logic getters where the vendored interface says
 * `view` and the deployment says `pure`, which changes nothing about calldata
 * or decoding.
 */

export const POOL_FUNCTIONS_USED = [
  "supply",
  "withdraw",
  "borrow",
  "repay",
  "getUserAccountData",
  "getReserveData",
  "getReservesList",
  "ADDRESSES_PROVIDER",
] as const;

export const POOL_EVENTS_USED = [
  "Supply",
  "Withdraw",
  "Borrow",
  "Repay",
  "ReserveDataUpdated",
  "ReserveUsedAsCollateralEnabled",
  "ReserveUsedAsCollateralDisabled",
] as const;

/** One of the Pool events a Receipt parser decodes. */
export type PoolEventUsed = (typeof POOL_EVENTS_USED)[number];
