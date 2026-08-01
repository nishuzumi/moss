// Compile-time contract fixture (never executed; typechecked via tsconfig).
// Valid usage must compile with the intended inferred types and invalid usage
// must be rejected — see the repo type-safety rules and the _template fixture.
import type { ActionCtx, ProtocolRef } from "@themoss/core";
import type { AprioriProtocol, ClaimOutcome, StakeOutcome, UnstakeOutcome } from "../src/index.js";

declare const apriori: AprioriProtocol;
declare const ctx: ActionCtx;
declare const dependency: ProtocolRef<AprioriProtocol>;

const ADDR = "0x1234567890abcdef1234567890abcdef12345678" as const;

// --- Positive: valid parameter inference ---

void apriori.stake({ amount: "1", receiver: ADDR });
void apriori.stake({ amount: "0.000000000000000001", receiver: ADDR });

void apriori.unstake({ shares: "1", controller: ADDR }, ctx);
void apriori.unstake({ shares: "10.5", controller: ADDR }, ctx);

void apriori.claim({ requestId: "7", receiver: ADDR });

// --- Positive: Receipt outcome inference ---

apriori.stakeReceipt([]).outcome satisfies StakeOutcome;
apriori.unstakeReceipt([]).outcome satisfies UnstakeOutcome;
apriori.claimReceipt([]).outcome satisfies ClaimOutcome;

// Injected Protocol references expose receipt methods stamped with their
// producing Protocol.
dependency.stakeReceipt([]).protocol satisfies string;

// --- Negative: invalid usage is rejected ---

// @ts-expect-error amount must be a string, not a number
void apriori.stake({ amount: 1, receiver: ADDR });

// @ts-expect-error receiver must be an Address
void apriori.stake({ amount: "1", receiver: "not-an-address" });

// @ts-expect-error receiver is required
void apriori.stake({ amount: "1" });

// @ts-expect-error shares must be a string, not a number
void apriori.unstake({ shares: 1, controller: ADDR }, ctx);

// @ts-expect-error controller is required (renamed from receiver)
void apriori.unstake({ shares: "1", receiver: ADDR }, ctx);

// @ts-expect-error missing ctx argument
void apriori.unstake({ shares: "1", controller: ADDR });

// @ts-expect-error requestId must be a string, not a number
void apriori.claim({ requestId: 7, receiver: ADDR });

// @ts-expect-error stake outcome is not a claim outcome
apriori.stakeReceipt([]).outcome satisfies ClaimOutcome;

// @ts-expect-error Injected Protocol references expose methods, not Handles
void dependency.aprMon;
