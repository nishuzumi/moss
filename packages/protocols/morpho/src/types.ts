import type { AddressValue, Handle } from "@themoss/core";
import type { MorphoVaultV2Abi } from "./abis/morpho.js";

/** A vault reported by the Morpho API. Candidates are display-only until
 * verified on-chain; only `address` and `asset` are required because they are
 * cross-checked against chain state before any use. */
export type VaultCandidate = {
  address: AddressValue;
  asset: AddressValue;
  name?: string;
  symbol?: string;
  netApy?: number;
  netApyExcludingRewards?: number;
  totalAssetsUsd?: number;
  liquidityAdapter?: AddressValue;
};

/** A vault that passed the factory attestation gate, with its asset facts
 * read from chain state. */
export type VerifiedVault = {
  address: AddressValue;
  handle: Handle<typeof MorphoVaultV2Abi>;
  asset: AddressValue;
  assetDecimals: number;
  assetSymbol: string;
};

/** JSON-safe discovery result item. Asset address, symbol, decimals, and
 * totalAssets come from chain reads; name, symbol, APY, and USD TVL are
 * advisory API display data and never become transaction inputs. */
export type VaultSummary = {
  address: AddressValue;
  name: string | null;
  symbol: string | null;
  asset: { address: AddressValue; symbol: string; decimals: number };
  totalAssets: string;
  totalAssetsDisplay: string;
  netApy: number | null;
  netApyExcludingRewards: number | null;
  totalAssetsUsd: number | null;
  liquidityAdapter: AddressValue | null;
};

export type MorphoDepositOutcome = {
  operation: "deposit";
  protocol: "morpho";
  vault: AddressValue;
  sender: AddressValue;
  onBehalf: AddressValue;
  assets: string;
  shares: string;
};

export type MorphoWithdrawOutcome = {
  operation: "withdraw";
  protocol: "morpho";
  vault: AddressValue;
  sender: AddressValue;
  receiver: AddressValue;
  onBehalf: AddressValue;
  assets: string;
  shares: string;
};
