import { describe, expect, it } from "vitest";
import {
  CAPABILITY_TREE_LIMITS,
  type CapabilityNode,
  CapabilityTreeError,
  type CapabilityTreeErrorCode,
  flattenCapabilityTree,
  type JsonSafeValue,
  type TransactionNode,
} from "../src/index.js";

const FROM = "0x1111111111111111111111111111111111111111" as const;
const TO = "0x2222222222222222222222222222222222222222" as const;

function tx(data: `0x${string}` = "0x", value: `0x${string}` = "0x0"): TransactionNode {
  return { kind: "transaction", transaction: { from: FROM, to: TO, data, value } };
}

function cap(
  children: readonly (CapabilityNode | TransactionNode)[],
  params: JsonSafeValue = null,
): CapabilityNode {
  return { kind: "capability", protocol: "fixture", method: "run", params, children };
}

/** A chain of `depth` Capabilities, each owning one direct transaction. */
function chain(depth: number): CapabilityNode {
  let node = cap([tx()]);
  for (let level = 1; level < depth; level += 1) node = cap([node, tx()]);
  return node;
}

/** A root fanning out to `total - 1` leaf Capabilities plus its own transaction. */
function fan(total: number): CapabilityNode {
  return cap([...Array.from({ length: total - 1 }, () => cap([tx()])), tx()]);
}

function nestedParam(depth: number): JsonSafeValue {
  let value: JsonSafeValue = null;
  for (let level = 1; level < depth; level += 1) value = [value];
  return value;
}

function expectTreeError(root: CapabilityNode, code: CapabilityTreeErrorCode): void {
  let caught: unknown;
  try {
    flattenCapabilityTree(root);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CapabilityTreeError);
  const treeError = caught as CapabilityTreeError;
  expect(treeError.code).toBe(code);
  expect(treeError.path.startsWith("Capability")).toBe(true);
  expect(treeError.message).toContain(code);
  expect(treeError.message).toContain(treeError.path);
}

describe("capability tree complexity bounds", () => {
  it("accepts the depth limit and rejects one level deeper with a typed error", () => {
    const atLimit = chain(CAPABILITY_TREE_LIMITS.maxCapabilityDepth);
    expect(flattenCapabilityTree(atLimit)).toHaveLength(CAPABILITY_TREE_LIMITS.maxCapabilityDepth);
    expectTreeError(chain(CAPABILITY_TREE_LIMITS.maxCapabilityDepth + 1), "CAPABILITY_DEPTH");
  });

  it("fails an adversarial deep chain with a typed error instead of a RangeError", () => {
    expectTreeError(chain(100_000), "CAPABILITY_DEPTH");
  });

  it("accepts the Capability count limit and rejects one more", () => {
    const atLimit = fan(CAPABILITY_TREE_LIMITS.maxCapabilities);
    expect(flattenCapabilityTree(atLimit)).toHaveLength(CAPABILITY_TREE_LIMITS.maxCapabilities);
    const overLimit = fan(CAPABILITY_TREE_LIMITS.maxCapabilities);
    const last = overLimit.children[overLimit.children.length - 2];
    if (last?.kind !== "capability") throw new Error("unexpected fixture shape");
    (last as { children: unknown }).children = [tx(), cap([tx()])];
    expectTreeError(overLimit, "CAPABILITY_COUNT");
  });

  it("accepts the child count limit and rejects one more", () => {
    const atLimit = cap([
      ...Array.from({ length: CAPABILITY_TREE_LIMITS.maxChildrenPerCapability - 1 }, () =>
        cap([tx()]),
      ),
      tx(),
    ]);
    expect(flattenCapabilityTree(atLimit)).toHaveLength(
      CAPABILITY_TREE_LIMITS.maxChildrenPerCapability,
    );
    const overLimit = cap([
      ...Array.from({ length: CAPABILITY_TREE_LIMITS.maxChildrenPerCapability }, () => cap([tx()])),
      tx(),
    ]);
    expectTreeError(overLimit, "CHILD_COUNT");
  });

  it("rejects a Capability cycle with a typed error instead of a RangeError", () => {
    const cyclic = cap([tx()]);
    (cyclic as { children: unknown }).children = [tx(), cyclic];
    expectTreeError(cyclic, "CAPABILITY_CYCLE");
  });

  it("rejects shared Capability and Transaction nodes; the structure must stay a tree", () => {
    const sharedCapability = cap([tx()]);
    expectTreeError(cap([sharedCapability, tx(), sharedCapability]), "SHARED_NODE");

    const sharedTransaction = tx();
    expectTreeError(cap([cap([sharedTransaction]), sharedTransaction]), "SHARED_NODE");
  });

  it("accepts the parameter depth limit and rejects one level deeper", () => {
    const atLimit = cap([tx()], nestedParam(CAPABILITY_TREE_LIMITS.maxParameterDepth));
    expect(flattenCapabilityTree(atLimit)).toHaveLength(1);
    expectTreeError(
      cap([tx()], nestedParam(CAPABILITY_TREE_LIMITS.maxParameterDepth + 1)),
      "PARAMETER_DEPTH",
    );
  });

  it("enforces the parameter node budget cumulatively across the whole tree", () => {
    const half = CAPABILITY_TREE_LIMITS.maxParameterNodes / 2;
    const halfArray = (): JsonSafeValue => Array.from({ length: half - 1 }, () => null);
    const atLimit = cap([cap([tx()], halfArray()), tx()], halfArray());
    expect(flattenCapabilityTree(atLimit)).toHaveLength(2);

    const overArray: JsonSafeValue = Array.from({ length: half }, () => null);
    expectTreeError(cap([cap([tx()], overArray), tx()], halfArray()), "PARAMETER_COUNT");
  });

  it("enforces the parameter character budget cumulatively over keys and strings", () => {
    const half = CAPABILITY_TREE_LIMITS.maxParameterCharacters / 2;
    const keyed = (extra: number): JsonSafeValue => ({
      ["k".repeat(1024)]: "v".repeat(half - 1024 + extra),
    });
    const atLimit = cap([cap([tx()], keyed(0)), tx()], "s".repeat(half));
    expect(flattenCapabilityTree(atLimit)).toHaveLength(2);
    expectTreeError(cap([cap([tx()], keyed(1)), tx()], "s".repeat(half)), "PARAMETER_CHARACTERS");
  });

  it("enforces the calldata budget cumulatively across transactions", () => {
    const half = CAPABILITY_TREE_LIMITS.maxCalldataBytes / 2;
    const data = (bytes: number): `0x${string}` => `0x${"ab".repeat(bytes)}`;
    const atLimit = cap([cap([tx(data(half))]), tx(data(half))]);
    expect(flattenCapabilityTree(atLimit)).toHaveLength(2);
    expectTreeError(cap([cap([tx(data(half))]), tx(data(half + 1))]), "CALLDATA_BYTES");
  });

  it("rejects calldata with a partial trailing byte", () => {
    expectTreeError(cap([tx("0x0")]), "CALLDATA_PARTIAL_BYTE");
    expectTreeError(cap([tx("0xabc")]), "CALLDATA_PARTIAL_BYTE");
  });

  it("bounds transaction values to 32-byte hex quantities in any spelling", () => {
    const max: `0x${string}` = `0x${"f".repeat(64)}`;
    expect(flattenCapabilityTree(cap([tx("0x", max)]))).toHaveLength(1);
    // isHex accepts these spellings, so the quantity check must too: an Agent
    // posting simulate input commonly emits "0x00", and BigInt downstream
    // parses leading zeros and uppercase digits identically.
    expect(flattenCapabilityTree(cap([tx("0x", "0x00")]))).toHaveLength(1);
    expect(flattenCapabilityTree(cap([tx("0x", "0x0DE0")]))).toHaveLength(1);
    expect(flattenCapabilityTree(cap([tx("0x", `0x${"F".repeat(64)}`)]))).toHaveLength(1);
    expectTreeError(cap([tx("0x", `0x1${"0".repeat(64)}`)]), "VALUE_OVERFLOW");
    expectTreeError(cap([tx("0x", "0x" as `0x${string}`)]), "VALUE_QUANTITY");
  });

  it("flattens a production-shaped tree in the exact recursive depth-first order", () => {
    const capC = cap([tx("0x03")]);
    const capA = cap([tx("0x01"), capC]);
    const capD = cap([tx("0x04")]);
    const capB = cap([capD, tx("0x05")]);
    const root = cap([capA, tx("0x02"), capB]);

    const executable = flattenCapabilityTree(root);
    expect(executable.map(({ transaction }) => transaction.data)).toEqual([
      "0x01",
      "0x03",
      "0x02",
      "0x04",
      "0x05",
    ]);
    expect(executable.map(({ capability }) => capability)).toEqual([capA, capC, root, capD, capB]);
  });
});
