import type { Address, Hex } from "@themoss/core";
import { toHex } from "viem";
import { describe, expect, it } from "vitest";
import { ChangeOrderError, extractChanges } from "../src/changes.js";
import type { CallFrame } from "../src/trace.js";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;
const C = "0x3333333333333333333333333333333333333333" as Address;

function log(address: Address, data: Hex, position?: number, index?: number) {
  return { address, topics: ["0x01" as Hex], data, position, index };
}

describe("ordered Change extraction", () => {
  it("preserves parent log, child transfer/log, parent log order", () => {
    const frame: CallFrame = {
      type: "CALL",
      from: A,
      to: B,
      value: "0x0",
      logs: [log(B, "0xaa", 0, 0), log(B, "0xdd", 1, 3)],
      calls: [
        {
          type: "CALL",
          from: B,
          to: C,
          value: toHex(5n),
          logs: [log(C, "0xcc", 0, 2)],
        },
      ],
    };

    expect(extractChanges(frame)).toEqual([
      { kind: "event", address: B, topics: ["0x01"], data: "0xaa" },
      { kind: "nativeTransfer", from: B, to: C, value: "5" },
      { kind: "event", address: C, topics: ["0x01"], data: "0xcc" },
      { kind: "event", address: B, topics: ["0x01"], data: "0xdd" },
    ]);
  });

  it("accepts the hex ordering values returned by Monad callTracer", () => {
    const frame: CallFrame = {
      type: "CALL",
      from: A,
      to: B,
      logs: [
        { ...log(B, "0xaa"), position: "0x0", index: "0x0" },
        { ...log(B, "0xcc"), position: "0x1", index: "0x2" },
      ],
      calls: [{ type: "CALL", from: B, to: C, logs: [log(C, "0xbb")] }],
    };
    expect(
      extractChanges(frame).map((change) => (change.kind === "event" ? change.data : "")),
    ).toEqual(["0xaa", "0xbb", "0xcc"]);
  });

  it("drops failed subtrees and includes positive SELFDESTRUCT value", () => {
    const frame: CallFrame = {
      type: "CALL",
      from: A,
      to: B,
      calls: [
        {
          type: "CALL",
          from: B,
          to: C,
          error: "execution reverted",
          logs: [log(C, "0xff")],
        },
        {
          type: "SELFDESTRUCT",
          from: B,
          to: A,
          value: toHex(7n),
        },
      ],
    };
    expect(extractChanges(frame)).toEqual([{ kind: "nativeTransfer", from: B, to: A, value: "7" }]);
  });

  it("fails closed when logs cannot be positioned around child calls", () => {
    const frame: CallFrame = {
      type: "CALL",
      from: A,
      to: B,
      logs: [log(B, "0xaa")],
      calls: [{ type: "CALL", from: B, to: C }],
    };
    expect(() => extractChanges(frame)).toThrow(ChangeOrderError);
  });
});
