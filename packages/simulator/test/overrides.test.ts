import type { Address, Hex } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { mergeDiff } from "../src/overrides.js";
import type { PrestateDiff, StateOverrides } from "../src/trace.js";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;
const EXISTING_SLOT = `0x${"01".repeat(32)}` as Hex;
const UPDATED_SLOT = `0x${"02".repeat(32)}` as Hex;
const CLEARED_SLOT = `0x${"03".repeat(32)}` as Hex;
const EXISTING_VALUE = `0x${"11".repeat(32)}` as Hex;
const UPDATED_VALUE = `0x${"22".repeat(32)}` as Hex;
const ZERO_WORD = `0x${"00".repeat(32)}` as Hex;

describe("mergeDiff", () => {
  it("merges account fields and storage while preserving existing overrides", () => {
    const overrides: StateOverrides = {
      [A]: {
        balance: "0x1",
        stateDiff: { [EXISTING_SLOT]: EXISTING_VALUE },
      },
    };
    const diff: PrestateDiff = {
      pre: {
        [A]: {
          storage: {
            [UPDATED_SLOT]: EXISTING_VALUE,
            [CLEARED_SLOT]: EXISTING_VALUE,
          },
        },
      },
      post: {
        [A]: {
          balance: "0x2",
          nonce: 7,
          code: "0x6000",
          storage: { [UPDATED_SLOT]: UPDATED_VALUE },
        },
      },
    };

    mergeDiff(overrides, diff);

    expect(overrides[A]).toEqual({
      balance: "0x2",
      nonce: "0x7",
      code: "0x6000",
      stateDiff: {
        [EXISTING_SLOT]: EXISTING_VALUE,
        [UPDATED_SLOT]: UPDATED_VALUE,
        [CLEARED_SLOT]: ZERO_WORD,
      },
    });
  });

  it("normalizes account keys and keeps different accounts isolated", () => {
    const mixedCaseA = "0x11111111111111111111111111111111111111AA" as Address;
    const overrides: StateOverrides = { [B]: { balance: "0x5" } };
    const diff: PrestateDiff = {
      pre: {},
      post: {
        [mixedCaseA]: { balance: "0x9" },
        [B]: { nonce: 3 },
      },
    };

    mergeDiff(overrides, diff);

    expect(overrides[mixedCaseA.toLowerCase() as Address]).toEqual({ balance: "0x9" });
    expect(overrides[B]).toEqual({ balance: "0x5", nonce: "0x3" });
  });
});
