import { type ActionCtx, NATIVE } from "@themoss/core";
import type { FastLane } from "../src/index.js";

declare const fastlane: FastLane;
declare const ctx: ActionCtx;

const ADDR = "0x1234567890abcdef1234567890abcdef12345678" as const;

// --- Positive: valid parameter inference ---

void fastlane.deposit({ amount: "1", receiver: ADDR });
void fastlane.deposit({ amount: "0.5", receiver: NATIVE });

void fastlane.redeem({ shares: "1", receiver: ADDR }, ctx);
void fastlane.redeem({ shares: "10.5", receiver: NATIVE }, ctx);

void fastlane.requestUnstake({ shares: "1" });
void fastlane.requestUnstake({ shares: "10.5" });

void fastlane.completeUnstake();

void fastlane.boostYield({ shares: "1", yieldOriginator: ADDR }, ctx);

void fastlane.balanceOf({ account: ADDR });
void fastlane.totalSupply();
void fastlane.previewDeposit({ assets: "1" });
void fastlane.previewRedeem({ shares: "1" });
void fastlane.convertToAssets({ shares: "1" });

// --- Negative: invalid parameter types ---

// @ts-expect-error amount must be a string, not a number
void fastlane.deposit({ amount: 123, receiver: ADDR });

// @ts-expect-error receiver must be a TokenReference (address or NATIVE)
void fastlane.deposit({ amount: "1", receiver: "not-an-address" });

// @ts-expect-error shares must be a string, not a number
void fastlane.redeem({ shares: 123, receiver: ADDR }, ctx);

// @ts-expect-error receiver must be a TokenReference
void fastlane.redeem({ shares: "1", receiver: "not-an-address" }, ctx);

// @ts-expect-error missing ctx argument
void fastlane.redeem({ shares: "1", receiver: ADDR });

// @ts-expect-error shares must be a string, not a number
void fastlane.requestUnstake({ shares: 123 });

// @ts-expect-error yieldOriginator must be a TokenReference
void fastlane.boostYield({ shares: "1", yieldOriginator: 123 }, ctx);

// @ts-expect-error account must be a TokenReference
void fastlane.balanceOf({ account: "not-an-address" });

// @ts-expect-error assets must be a string, not a number
void fastlane.previewDeposit({ assets: 123 });

// @ts-expect-error shares must be a string, not a number
void fastlane.previewRedeem({ shares: 123 });

// @ts-expect-error shares must be a string, not a number
void fastlane.convertToAssets({ shares: 123 });

// @ts-expect-error name/symbol/decimals are no longer Query methods
void fastlane.name();

// @ts-expect-error name/symbol/decimals are no longer Query methods
void fastlane.symbol();

// @ts-expect-error name/symbol/decimals are no longer Query methods
void fastlane.decimals();
