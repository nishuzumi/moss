import type { Hex } from "@themoss/core";
import { toHex } from "viem";
import type { PrestateDiff, StateOverrides } from "./trace.js";

const ZERO_WORD: Hex = `0x${"0".repeat(64)}`;

/**
 * Fold one transaction's prestate diff into the accumulated overrides, so the
 * next transaction simulates on top of this one's effects. This is the manual
 * state-chaining that eth_simulateV1 would have provided (ADR 0002).
 */
export function mergeDiff(overrides: StateOverrides, diff: PrestateDiff): void {
  for (const [address, post] of Object.entries(diff.post)) {
    const addr = address.toLowerCase() as keyof StateOverrides;
    let entry = overrides[addr];
    if (!entry) {
      entry = {};
      overrides[addr] = entry;
    }
    if (post.balance !== undefined) entry.balance = post.balance;
    if (post.nonce !== undefined) entry.nonce = toHex(post.nonce);
    if (post.code !== undefined) entry.code = post.code;
    if (post.storage) {
      entry.stateDiff = { ...entry.stateDiff, ...post.storage };
    }
    // Slots present in pre but absent from post were cleared to zero.
    const preStorage = diff.pre[address as keyof PrestateDiff["pre"]]?.storage;
    if (preStorage) {
      for (const slot of Object.keys(preStorage)) {
        if (!post.storage || !(slot in post.storage)) {
          entry.stateDiff = { ...entry.stateDiff, [slot]: ZERO_WORD };
        }
      }
    }
  }
}
