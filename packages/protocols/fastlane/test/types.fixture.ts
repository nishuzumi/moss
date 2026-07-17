// Compile-time type tests for FastLane shMONAD Protocol.
//
// These are never executed — they verify that TypeScript
// correctly infers parameter types and rejects invalid usage
// at compile time.

import type { Shmonad } from "../src/index.js";

declare const shmonad: Shmonad;
declare const ctx: { account: `0x${string}` };

// ── Valid usage (should compile) ─────────────────────────────

void shmonad.stake({ amount: "1.5" }, ctx);
void shmonad.unstake({ amount: "100" }, ctx);
void shmonad.balanceOf({ owner: "0x0000000000000000000000000000000000000001" }, ctx);
void shmonad.exchangeRate();

// ── Invalid usage (@ts-expect-error) ─────────────────────────

// @ts-expect-error — amount must be a string, not a number
const wrongAmount: Parameters<typeof shmonad.stake>[0] = { amount: 123 };
void shmonad.stake(wrongAmount, ctx);

// @ts-expect-error — amount is required, not optional
const missingAmount: Parameters<typeof shmonad.stake>[0] = {} as { amount?: string };
void shmonad.stake(missingAmount, ctx);

// @ts-expect-error — owner is required, not optional
const missingOwner: Parameters<typeof shmonad.balanceOf>[0] = {} as { owner?: string };
void shmonad.balanceOf(missingOwner, ctx);

// @ts-expect-error — owner must be 0x address, not plain string
const wrongOwner: Parameters<typeof shmonad.balanceOf>[0] = { owner: "not-an-address" };
void shmonad.balanceOf(wrongOwner, ctx);
