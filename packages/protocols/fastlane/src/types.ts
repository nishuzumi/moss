import type { AddressValue } from "@themoss/core";

export type DepositOutcome = {
  operation: "deposit";
  sender: AddressValue;
  receiver: AddressValue;
  assets: string;
  shares: string;
};

export type RequestUnstakeOutcome = {
  operation: "requestUnstake";
  owner: AddressValue;
  shares: string;
  amountMon: string;
  completionEpoch: string;
};

export type CompleteUnstakeOutcome = {
  operation: "completeUnstake";
  owner: AddressValue;
  amountMon: string;
};

export type RedeemOutcome = {
  operation: "redeem";
  sender: AddressValue;
  receiver: AddressValue;
  owner: AddressValue;
  assets: string;
  shares: string;
};

export type BoostYieldOutcome = {
  operation: "boostYield";
  from: AddressValue;
  shares: string;
  yieldOriginator: AddressValue;
};
