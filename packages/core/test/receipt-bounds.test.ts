import { describe, expect, it } from "vitest";
import {
  CAPABILITY_TREE_LIMITS,
  CapabilityTreeError,
  type CapabilityTreeErrorCode,
  type Change,
  type JsonSafeValue,
  type ReceiptChange,
  ReceiptCoverageError,
  type ReceiptResult,
  verifyReceiptCoverage,
} from "../src/index.js";

const FROM = "0x1111111111111111111111111111111111111111" as const;
const TO = "0x2222222222222222222222222222222222222222" as const;

function change(id: number): Change {
  return { kind: "nativeTransfer", from: FROM, to: TO, value: String(id) };
}

/** A `null` wrapped in `depth` nested arrays, so the innermost value is at depth `depth`. */
function nestedValue(depth: number): JsonSafeValue {
  let value: JsonSafeValue = null;
  for (let level = 1; level < depth; level += 1) value = [value];
  return value;
}

/** A chain of `depth` Receipts, each holding the next one as its only change. */
function nestedReceipt(depth: number): ReceiptResult {
  let node: ReceiptResult = { kind: "receipt", outcome: null, text: "leaf receipt", changes: [] };
  for (let level = 1; level < depth; level += 1) {
    node = { kind: "receipt", outcome: null, text: `level ${level}`, changes: [node] };
  }
  return node;
}

/** An array of `count` nulls, worth `count + 1` parameter nodes. */
function wideValue(count: number): JsonSafeValue {
  return Array.from({ length: count }, () => null);
}

function expectReceiptError(receipt: ReceiptResult, code: CapabilityTreeErrorCode): void {
  let caught: unknown;
  try {
    verifyReceiptCoverage([], receipt);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CapabilityTreeError);
  const treeError = caught as CapabilityTreeError;
  expect(treeError.code).toBe(code);
  expect(treeError.path.startsWith("Receipt")).toBe(true);
  expect(treeError.message).toContain(code);
  expect(treeError.message).toContain(treeError.path);
}

describe("Receipt traversal bounds", () => {
  it("fails an adversarially deep outcome with a typed error instead of a RangeError", () => {
    const receipt: ReceiptResult = {
      kind: "receipt",
      outcome: nestedValue(50_000),
      text: "root",
      changes: [],
    };
    expectReceiptError(receipt, "PARAMETER_DEPTH");
  });

  it("fails an adversarially deep ReceiptChange data with a typed error", () => {
    const receipt: ReceiptResult = {
      kind: "receipt",
      outcome: null,
      text: "root",
      changes: [{ kind: "change", change: change(0), data: nestedValue(50_000), text: "leaf" }],
    };
    let caught: unknown;
    try {
      verifyReceiptCoverage([], receipt);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CapabilityTreeError);
    const treeError = caught as CapabilityTreeError;
    expect(treeError.code).toBe("PARAMETER_DEPTH");
    expect(treeError.path).toContain(".data");
  });

  it("accepts the Receipt nesting limit and rejects one level deeper with a typed error", () => {
    const atLimit = nestedReceipt(CAPABILITY_TREE_LIMITS.maxCapabilityDepth);
    expect(() => verifyReceiptCoverage([], atLimit)).not.toThrow();
    expectReceiptError(
      nestedReceipt(CAPABILITY_TREE_LIMITS.maxCapabilityDepth + 1),
      "CAPABILITY_DEPTH",
    );
  });

  it("fails an adversarially deep Receipt chain with a typed error instead of a RangeError", () => {
    expectReceiptError(nestedReceipt(50_000), "CAPABILITY_DEPTH");
  });

  it("enforces the parameter node budget cumulatively across outcome and data", () => {
    const within = CAPABILITY_TREE_LIMITS.maxParameterNodes - 1000;
    const c = change(0);
    const withinBudget: ReceiptResult = {
      kind: "receipt",
      outcome: wideValue(within),
      text: "root",
      changes: [{ kind: "change", change: c, data: null, text: "leaf" }],
    };
    // The outcome alone stays under the node budget.
    expect(() => verifyReceiptCoverage([c], withinBudget)).not.toThrow();

    const overBudget: ReceiptResult = {
      kind: "receipt",
      outcome: wideValue(within),
      text: "root",
      changes: [{ kind: "change", change: change(0), data: wideValue(2000), text: "leaf" }],
    };
    // The same outcome plus a second payload on the leaf crosses the shared budget.
    expectReceiptError(overBudget, "PARAMETER_COUNT");
  });

  it("fails an over-wide changes array with a typed error instead of a spread RangeError", () => {
    const c = change(0);
    const receipt: ReceiptResult = {
      kind: "receipt",
      outcome: null,
      text: "root",
      changes: Array.from({ length: 200_000 }, () => ({
        kind: "change" as const,
        change: c,
        data: null,
        text: "leaf",
      })),
    };
    expectReceiptError(receipt, "PARAMETER_COUNT");
  });

  it("flattens a valid Receipt tree, preserving Change identity, length and order", () => {
    const first = change(0);
    const second = change(1);
    const tree: ReceiptResult = {
      kind: "receipt",
      outcome: { ok: true },
      text: "root",
      changes: [
        { kind: "change", change: first, data: { index: 0 }, text: "leaf 0" },
        {
          kind: "receipt",
          outcome: null,
          text: "group",
          changes: [
            {
              kind: "change",
              change: second,
              data: { index: 1 },
              text: "leaf 1",
            } satisfies ReceiptChange,
          ],
        },
      ],
    };
    expect(() => verifyReceiptCoverage([first, second], tree)).not.toThrow();
    // Order is retained, so the wrong order fails coverage rather than the bounds.
    expect(() => verifyReceiptCoverage([second, first], tree)).toThrow(ReceiptCoverageError);
  });
});
