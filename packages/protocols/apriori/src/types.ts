import type { AddressValue } from "@themoss/core";

export type StakeOutcome = {
  operation: "stake";
  /** Depositor that sent the native MON (Deposit.sender). */
  sender: AddressValue;
  /** Address the aprMON shares were minted to (Deposit.owner). */
  owner: AddressValue;
  assets: string;
  shares: string;
};

export type UnstakeOutcome = {
  operation: "unstake";
  /** Address that can claim the matured request (RedeemRequest.controller). */
  controller: AddressValue;
  /** Address whose aprMON shares were escrowed (RedeemRequest.owner). */
  owner: AddressValue;
  /** Caller that submitted the request (RedeemRequest.sender). */
  sender: AddressValue;
  requestId: string;
  shares: string;
  /** MON value quoted for the shares at request time. */
  assets: string;
};

export type ClaimOutcome = {
  operation: "claim";
  /** Controller of the claimed requests (Redeem.controller). */
  controller: AddressValue;
  /** Address the native MON was paid to (Redeem.receiver). */
  receiver: AddressValue;
  /** One entry per claimed request; the vault emits one Redeem per ID. */
  requestIds: string[];
  /** Total aprMON shares burned across the claimed requests. */
  shares: string;
  /** Total net MON paid out (the vault emits assets net of fee). */
  assets: string;
  /** Total withdrawal fee withheld by the vault. */
  fee: string;
};
