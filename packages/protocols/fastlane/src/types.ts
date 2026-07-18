import type { AddressValue } from "@themoss/core";

export type FastLaneStakeOutcome = {
  operation: "stake";
  depositor: AddressValue;
  receiver: AddressValue;
  assets: string;
  shares: string;
};

export type FastLaneUnstakeOutcome = {
  operation: "unstake";
  redeemer: AddressValue;
  receiver: AddressValue;
  assets: string;
  shares: string;
};

export type FastLaneOutcome = FastLaneStakeOutcome | FastLaneUnstakeOutcome;
