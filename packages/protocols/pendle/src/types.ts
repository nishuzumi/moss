import type { AddressValue, MossRuntime } from "@themoss/core";

export type MarketCandidate = Readonly<{
  market: AddressValue;
  expectedUnderlying: AddressValue;
  metadata: PendleApiMarketMetadata;
}>;

export type MarketVerificationCandidate = Readonly<{
  market: string;
  expectedUnderlying: string;
}>;

export type PendleApiMarketMetadata = Readonly<{
  name: string;
  protocol: string;
  expiry: string;
  aggregatedApy?: number;
  provenance: Readonly<{
    kind: "inferred";
    provider: "Pendle official API";
    source: string;
    fetchedAt: string;
  }>;
}>;

export type VerifiedMarket = Readonly<{
  market: AddressValue;
  factory: AddressValue;
  sy: AddressValue;
  pt: AddressValue;
  yt: AddressValue;
  underlying: AddressValue;
  decimals: Readonly<{
    underlying: number;
    pt: number;
  }>;
  expiry: bigint;
  tokenSupport: Readonly<{
    tokensIn: readonly AddressValue[];
    tokensOut: readonly AddressValue[];
    underlyingIn: boolean;
    underlyingOut: boolean;
  }>;
}>;

export type DiscoveredPendleMarket = Readonly<{
  market: VerifiedMarket;
  metadata: PendleApiMarketMetadata;
}>;

export type MarketDiscoveryRejection = Readonly<{
  stage: "candidate-schema" | "duplicate-candidate" | MarketVerificationStage;
  candidate?: AddressValue;
  reason: string;
}>;

export type PendleMarketDiscoveryResult = Readonly<{
  status: "available" | "unavailable";
  candidateCount: number;
  verified: readonly DiscoveredPendleMarket[];
  rejections: readonly MarketDiscoveryRejection[];
}>;

export type PendleMarketVerifier = (
  runtime: MossRuntime,
  candidate: MarketCandidate,
) => Promise<VerifiedMarket>;

export type PendleDiscoveryFetch = (input: URL, init?: RequestInit) => Promise<Response>;

export type MarketVerificationStage =
  | "candidate"
  | "chain"
  | "market-bytecode"
  | "factory-registration"
  | "factory-getter"
  | "read-tokens"
  | "dynamic-bytecode"
  | "expiry"
  | "token-support-in"
  | "token-support-out"
  | "decimals";

/**
 * Isolates untrusted chain-read results so the verifier can validate every ABI value before use.
 */
export interface MarketVerificationReader {
  chainId(): Promise<unknown>;
  codeAt(address: AddressValue): Promise<unknown>;
  isValidMarket(market: AddressValue): Promise<unknown>;
  marketFactory(market: AddressValue): Promise<unknown>;
  marketTokens(market: AddressValue): Promise<unknown>;
  marketExpiry(market: AddressValue): Promise<unknown>;
  tokensIn(sy: AddressValue): Promise<unknown>;
  tokensOut(sy: AddressValue): Promise<unknown>;
  decimals(token: AddressValue): Promise<unknown>;
  latestBlockTimestamp(): Promise<unknown>;
}
