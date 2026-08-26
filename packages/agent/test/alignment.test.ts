import { type CapabilityNode, type Receipt, transaction } from "@themoss/core";
import { describe, expect, it } from "vitest";
import {
  alignCapabilityParams,
  alignFields,
  alignReceiptOutcome,
  assertAlignment,
  type IntentFieldExpectation,
  type IntentMismatch,
} from "../src/index.js";

const SENDER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const RECEIVER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
const USDC = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603" as const;
const USDC_LOWER = USDC.toLowerCase() as const;

function capability(params: Record<string, unknown>): CapabilityNode {
  return {
    kind: "capability",
    protocol: "kuru",
    method: "swap",
    params,
    children: [transaction(SENDER, RECEIVER)],
  };
}

function receipt(outcome: Record<string, unknown>): Receipt {
  return {
    kind: "receipt",
    protocol: "kuru",
    outcome,
    text: "Kuru Swap",
    changes: [],
  };
}

describe("alignFields", () => {
  it("returns no mismatches when every equality field matches", () => {
    const target = { tokenIn: "native", tokenOut: USDC, amountIn: "1", slippage: 50 };
    const expectations: readonly IntentFieldExpectation[] = [
      { path: "tokenIn", expected: "native" },
      { path: "tokenOut", expected: USDC },
      { path: "amountIn", expected: "1" },
      { path: "slippage", expected: 50 },
    ];
    expect(alignFields(target, expectations)).toEqual([]);
  });

  it("compares address-valued fields case-insensitively", () => {
    const target = { tokenOut: USDC };
    expect(alignFields(target, [{ path: "tokenOut", expected: USDC_LOWER }])).toEqual([]);
  });

  it("keeps non-address strings strict", () => {
    const mismatches = alignFields({ tokenIn: "Native" }, [
      { path: "tokenIn", expected: "native" },
    ]);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.reason).toBe("value");
  });

  it("reports a value mismatch with expected and actual", () => {
    const mismatches = alignFields({ amountIn: "2" }, [{ path: "amountIn", expected: "1" }]);
    expect(mismatches).toHaveLength(1);
    const mismatch: IntentMismatch = {
      path: "amountIn",
      reason: "value",
      expected: "1",
      actual: "2",
    };
    expect(mismatches[0]).toEqual(mismatch);
  });

  it("reports a missing field as missing", () => {
    const mismatches = alignFields({ tokenIn: "native" }, [{ path: "slippage", expected: 50 }]);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]).toMatchObject({ path: "slippage", reason: "missing", actual: "missing" });
  });

  it("reads dotted paths through nested plain objects", () => {
    const target = { routed: { path: ["native", USDC] }, meta: { depth: 2 } };
    expect(alignFields(target, [{ path: "meta.depth", expected: 2 }])).toEqual([]);
    const mismatches = alignFields(target, [{ path: "meta.depth", expected: 3 }]);
    expect(mismatches[0]?.reason).toBe("value");
  });

  it("stops descending at a non-object node", () => {
    const mismatches = alignFields({ sender: "0x1" }, [{ path: "sender.token", expected: USDC }]);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.reason).toBe("missing");
  });

  it("satisfies a predicate expectation and reports a failed one", () => {
    const positive = (value: unknown) => typeof value === "string" && BigInt(value) > 0n;
    expect(
      alignFields({ amountOut: "5" }, [
        { path: "amountOut", predicate: positive, description: "amountOut > 0" },
      ]),
    ).toEqual([]);
    const mismatches = alignFields({ amountOut: "0" }, [
      { path: "amountOut", predicate: positive, description: "amountOut > 0" },
    ]);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]).toMatchObject({
      path: "amountOut",
      reason: "predicate",
      expected: "amountOut > 0",
      actual: "0",
    });
  });

  it("treats a throwing predicate as unsatisfied", () => {
    const mismatches = alignFields({ amountOut: "not-a-number" }, [
      {
        path: "amountOut",
        predicate: (value) => typeof value === "string" && BigInt(value) > 0n,
        description: "amountOut > 0",
      },
    ]);
    expect(mismatches[0]?.reason).toBe("predicate");
  });

  it("returns one mismatch per failing expectation in order", () => {
    const mismatches = alignFields({ tokenIn: "native", tokenOut: USDC, amountIn: "2" }, [
      { path: "tokenIn", expected: "native" },
      { path: "amountIn", expected: "1" },
      { path: "tokenOut", expected: RECEIVER },
    ]);
    expect(mismatches.map(({ path }) => path)).toEqual(["amountIn", "tokenOut"]);
  });
});

describe("alignCapabilityParams", () => {
  it("reads fields from the capability's params", () => {
    const cap = capability({ tokenIn: "native", tokenOut: USDC });
    expect(
      alignCapabilityParams(cap, [
        { path: "tokenIn", expected: "native" },
        { path: "tokenOut", expected: USDC_LOWER },
      ]),
    ).toEqual([]);
  });

  it("reports every field a non-object params lacks", () => {
    const cap: CapabilityNode = {
      kind: "capability",
      protocol: "kuru",
      method: "swap",
      params: null,
      children: [transaction(SENDER, RECEIVER)],
    };
    const mismatches = alignCapabilityParams(cap, [{ path: "tokenIn", expected: "native" }]);
    expect(mismatches[0]).toMatchObject({ path: "tokenIn", reason: "missing" });
  });
});

describe("alignReceiptOutcome", () => {
  it("reads fields from the receipt's outcome", () => {
    const rec = receipt({
      operation: "swap",
      protocol: "kuru",
      sender: SENDER,
      tokenIn: "native",
      tokenOut: USDC,
      amountIn: "1000000000000000000",
      amountOut: "5",
    });
    const expectations: readonly IntentFieldExpectation[] = [
      { path: "operation", expected: "swap" },
      { path: "protocol", expected: "kuru" },
      { path: "sender", expected: SENDER },
      { path: "tokenIn", expected: "native" },
      { path: "tokenOut", expected: USDC_LOWER },
      { path: "amountIn", expected: "1000000000000000000" },
      {
        path: "amountOut",
        predicate: (v) => typeof v === "string" && BigInt(v) > 0n,
        description: "amountOut > 0",
      },
    ];
    expect(alignReceiptOutcome(rec, expectations)).toEqual([]);
  });

  it("flags a sender mismatch and an unverified operation", () => {
    const rec = receipt({ operation: "supply", protocol: "aave", sender: RECEIVER });
    const mismatches = alignReceiptOutcome(rec, [
      { path: "operation", expected: "swap" },
      { path: "protocol", expected: "kuru" },
      { path: "sender", expected: SENDER },
    ]);
    expect(mismatches).toHaveLength(3);
  });
});

describe("assertAlignment", () => {
  it("does not throw when there are no mismatches", () => {
    expect(() => assertAlignment([])).not.toThrow();
  });

  it("throws one Error joining every mismatch", () => {
    const mismatches: readonly IntentMismatch[] = [
      { path: "tokenIn", reason: "value", expected: "native", actual: "0x1" },
      { path: "amountOut", reason: "predicate", expected: "amountOut > 0", actual: "0" },
    ];
    expect(() => assertAlignment(mismatches)).toThrow(
      /intent mismatch at tokenIn[\s\S]*intent mismatch at amountOut/,
    );
  });
});
