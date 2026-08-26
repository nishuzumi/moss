import type { CapabilityNode, JsonSafeValue, Receipt } from "@themoss/core";

/**
 * Agent safety rule 6 (docs/agent-skill.md): "Align ordered texts with intent."
 * Moss itself verifies that a Receipt covers every observed Change exactly once
 * and in order, but it cannot know what the user actually asked for. These helpers
 * let an Agent mechanically compare the Capability params it built (after `action`)
 * and the structured Receipt outcome it simulated (after `simulate`) against the
 * intent it recorded before calling any tool.
 *
 * Paths are dotted JSON paths relative to the target: `alignCapabilityParams` reads
 * from `capability.params` and `alignReceiptOutcome` reads from `receipt.outcome`.
 * Address-valued equality fields are compared case-insensitively; everything else
 * is strict. Predicate expectations cover domain constraints that are not equality
 * (for example, a swap's `amountOut` must be positive).
 */

/** One expectation failed by an aligned target. */
export interface IntentMismatch {
  /** JSON path of the checked field, e.g. "tokenIn" or "outcome.sender". */
  readonly path: string;
  /** Why the field failed: equality mismatch, missing field, or predicate rejection. */
  readonly reason: "value" | "missing" | "predicate";
  /** What the recorded intent expected (or the predicate description). */
  readonly expected: string;
  /** What the target actually carried at that path. */
  readonly actual: string;
}

/** Expect a field to equal a JSON-safe value. Addresses are compared case-insensitively. */
export interface IntentEqualityExpectation {
  readonly path: string;
  readonly expected: JsonSafeValue;
}

/** Expect a field to satisfy a domain predicate (e.g. `amountOut > 0`). */
export interface IntentPredicateExpectation {
  readonly path: string;
  /** Returns true when the field value satisfies the constraint. */
  readonly predicate: (value: JsonSafeValue) => boolean;
  /** Human-readable description used in mismatch reports. */
  readonly description: string;
}

export type IntentFieldExpectation = IntentEqualityExpectation | IntentPredicateExpectation;

/** A 20-byte EVM address as a JSON string; compared case-insensitively. */
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function isPlainObject(value: unknown): value is { readonly [key: string]: JsonSafeValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function describe(value: JsonSafeValue | undefined): string {
  if (value === undefined) return "missing";
  if (typeof value === "string") return value;
  return JSON.stringify(value) ?? String(value);
}

function sameValue(expected: JsonSafeValue, actual: JsonSafeValue): boolean {
  if (expected === actual) return true;
  if (typeof expected === "string" && typeof actual === "string") {
    if (HEX_ADDRESS.test(expected) && HEX_ADDRESS.test(actual)) {
      return expected.toLowerCase() === actual.toLowerCase();
    }
    return expected === actual;
  }
  return false;
}

/** Reads one dotted path from a JSON-safe target, supporting plain objects only. */
function readField(target: JsonSafeValue, path: string): JsonSafeValue | undefined {
  if (path.length === 0) return target;
  let current: JsonSafeValue | undefined = target;
  for (const part of path.split(".")) {
    if (!isPlainObject(current) || !Object.hasOwn(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

function compareField(
  target: JsonSafeValue,
  expectation: IntentFieldExpectation,
): IntentMismatch | undefined {
  const value = readField(target, expectation.path);
  if (value === undefined) {
    return {
      path: expectation.path,
      reason: "missing",
      expected:
        "predicate" in expectation ? expectation.description : describe(expectation.expected),
      actual: "missing",
    };
  }
  if ("predicate" in expectation) {
    let satisfied = false;
    try {
      satisfied = expectation.predicate(value);
    } catch {
      satisfied = false;
    }
    if (!satisfied) {
      return {
        path: expectation.path,
        reason: "predicate",
        expected: expectation.description,
        actual: describe(value),
      };
    }
    return undefined;
  }
  if (!sameValue(expectation.expected, value)) {
    return {
      path: expectation.path,
      reason: "value",
      expected: describe(expectation.expected),
      actual: describe(value),
    };
  }
  return undefined;
}

/**
 * Compares a JSON-safe target against field expectations. Each expectation names a dotted
 * path within the target (e.g. `tokenIn`, `outcome.amountOut`) and the value it must carry.
 * Address-valued fields are compared case-insensitively; predicate expectations cover
 * non-equality constraints. Returns one mismatch per failure; an empty array means the
 * target aligns with the recorded intent.
 */
export function alignFields(
  target: JsonSafeValue,
  expectations: readonly IntentFieldExpectation[],
): readonly IntentMismatch[] {
  return expectations
    .map((expectation) => compareField(target, expectation))
    .filter((mismatch): mismatch is IntentMismatch => mismatch !== undefined);
}

/**
 * Checks the params a Capability was built with against the recorded intent. Run after
 * `action` and before `simulate` to prove the tree did not silently drop or alter a field
 * the user named.
 */
export function alignCapabilityParams(
  capability: CapabilityNode,
  expectations: readonly IntentFieldExpectation[],
): readonly IntentMismatch[] {
  return alignFields(capability.params, expectations);
}

/**
 * Checks the structured Outcome of a simulated Receipt against the recorded intent. Paths
 * are relative to `receipt.outcome`. Run after a clean `simulate` to prove on-chain
 * evidence matches what the user asked for.
 */
export function alignReceiptOutcome(
  receipt: Receipt,
  expectations: readonly IntentFieldExpectation[],
): readonly IntentMismatch[] {
  return alignFields(receipt.outcome, expectations);
}

/** Throws a single Error listing every mismatch when alignment fails. No-op when aligned. */
export function assertAlignment(mismatches: readonly IntentMismatch[]): void {
  if (mismatches.length === 0) return;
  const lines = mismatches.map(
    (mismatch) =>
      `intent mismatch at ${mismatch.path}: expected ${mismatch.expected}, got ${mismatch.actual} (${mismatch.reason})`,
  );
  throw new Error(lines.join("\n"));
}
