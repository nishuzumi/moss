import type { AddressValue, Hex } from "@themoss/core";

export type MerklRewardBreakdown = {
  reason: string;
  amount: string;
  claimed: string;
  pending: string;
  campaignId: Hex;
  opportunityId: string;
};

export type MerklReward = {
  token: AddressValue;
  cumulativeAmount: string;
  apiClaimedAmount: string;
  onchainClaimedAmount: string;
  claimableAmount: string;
  pendingAmount: string;
  proofLength: number;
  effectiveRecipient: AddressValue;
  claimableNow: boolean;
  unavailableReason?: string;
  breakdowns: readonly MerklRewardBreakdown[];
};

export type MerklRewardsResult = {
  account: AddressValue;
  merkleRoot: Hex;
  rewards: readonly MerklReward[];
};

export type MerklClaimOutcome = {
  operation: "claim";
  account: AddressValue;
  rewards: readonly {
    token: AddressValue;
    amount: string;
  }[];
};

export type MerklRewardCandidate = {
  root: Hex;
  recipient: AddressValue;
  token: AddressValue;
  cumulativeAmount: bigint;
  apiClaimedAmount: bigint;
  pendingAmount: bigint;
  proofs: readonly Hex[];
  breakdowns: readonly MerklRewardBreakdown[];
};
