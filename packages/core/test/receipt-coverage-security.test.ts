import { describe, expect, it } from "vitest";
import {
  type AddressValue,
  type Change,
  type ReceiptResult as MossReceipt,
  verifyReceiptCoverage,
} from "../src/index.js";

const ACCOUNT = "0x2222222222222222222222222222222222222222" as AddressValue;
const VAULT = "0x1111111111111111111111111111111111111111" as AddressValue;

function nativeTransfer(value: string): Change {
  return { kind: "nativeTransfer", from: ACCOUNT, to: VAULT, value };
}

function event(data: `0x${string}`): Change {
  return { kind: "event", address: VAULT, topics: ["0x01"], data };
}

function receiptFor<T extends "approve" | "swap">(
  operation: T,
  changes: readonly Change[],
): MossReceipt<{ operation: T }> {
  return {
    kind: "receipt",
    outcome: { operation },
    text: operation,
    changes: changes.map((change) => ({
      kind: "change",
      change,
      data: { operation },
      text: `${operation} change`,
    })),
  };
}

describe("Receipt coverage security", () => {
  it("requires non-empty Receipt text at every Agent-facing evidence boundary", () => {
    const change = nativeTransfer("1");
    const receipt = receiptFor("swap", [change]);

    expect(() => verifyReceiptCoverage([change], { ...receipt, text: "" })).toThrow(
      "Receipt.text must be a non-empty string",
    );

    const leaf = receipt.changes[0];
    if (leaf?.kind !== "change") throw new Error("expected fixture ReceiptChange");
    expect(() =>
      verifyReceiptCoverage([change], { ...receipt, changes: [{ ...leaf, text: "   " }] }),
    ).toThrow("Receipt.changes[0].text must be a non-empty string");

    const nested = receiptFor("approve", [change]);
    expect(() =>
      verifyReceiptCoverage([change], {
        ...receipt,
        changes: [{ ...nested, text: "\t" }],
      }),
    ).toThrow("Receipt.changes[0].text must be a non-empty string");
  });

  it("enforces original Change identity and order across nested Receipts", () => {
    const first = nativeTransfer("1");
    const second = event("0x02");

    const firstLeaf = receiptFor("swap", [first]).changes[0];
    if (firstLeaf?.kind !== "change") throw new Error("expected fixture ReceiptChange");
    const nestedSecond = receiptFor("approve", [second]);

    expect(() =>
      verifyReceiptCoverage([first, second], {
        kind: "receipt",
        outcome: { operation: "swap" },
        text: "swap",
        changes: [nestedSecond, firstLeaf],
      }),
    ).toThrow("Receipt Change 0 does not retain the original object in order");

    const copiedNestedSecond = receiptFor("approve", [{ ...second }]);
    expect(() =>
      verifyReceiptCoverage([first, second], {
        kind: "receipt",
        outcome: { operation: "swap" },
        text: "swap",
        changes: [firstLeaf, copiedNestedSecond],
      }),
    ).toThrow("Receipt Change 1 does not retain the original object in order");
  });

  it("rejects cyclic Receipt trees and cyclic JSON payloads before coverage passes", () => {
    const change = nativeTransfer("1");
    const cyclicReceipt = receiptFor("swap", [change]);
    (cyclicReceipt as unknown as { changes: unknown[] }).changes = [cyclicReceipt];

    expect(() => verifyReceiptCoverage([change], cyclicReceipt)).toThrow(
      "Receipt.changes[0] contains a Receipt cycle",
    );

    const data: Record<string, unknown> = {};
    data.self = data;
    const leaf = receiptFor("swap", [change]).changes[0];
    if (leaf?.kind !== "change") throw new Error("expected fixture ReceiptChange");

    expect(() =>
      verifyReceiptCoverage([change], {
        kind: "receipt",
        outcome: { operation: "swap" },
        text: "swap",
        changes: [{ ...leaf, data } as unknown as typeof leaf],
      } as MossReceipt),
    ).toThrow("Receipt.changes[0].data.self contains a cycle");
  });

  it("rejects non-JSON-safe Receipt data smuggled through untyped Protocol code", () => {
    const change = nativeTransfer("1");
    const receipt = receiptFor("swap", [change]);
    const leaf = receipt.changes[0];
    if (leaf?.kind !== "change") throw new Error("expected fixture ReceiptChange");

    expect(() =>
      verifyReceiptCoverage([change], {
        ...receipt,
        outcome: { amount: 1n },
      } as unknown as MossReceipt),
    ).toThrow("Receipt.outcome.amount contains a non-JSON-safe bigint");

    expect(() =>
      verifyReceiptCoverage([change], {
        ...receipt,
        changes: [{ ...leaf, data: new Date(0) }],
      } as unknown as MossReceipt),
    ).toThrow("Receipt.changes[0].data contains a non-plain object");
  });
});
