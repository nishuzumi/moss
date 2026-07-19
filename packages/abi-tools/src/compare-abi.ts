import type { Abi } from "abitype";

/** One difference between an expected and an actual deployed ABI. */
export interface AbiComparisonIssue {
  kind: "missing" | "unexpected" | "mismatch" | "duplicate";
  /** Canonical signature, e.g. `function transfer(address,uint256)`. */
  signature: string;
  /** Human-readable specifics for mismatches and duplicates. */
  detail?: string;
}

export interface CompareDeployedAbiOptions {
  /**
   * Canonical signatures accepted when they exist only in the actual ABI.
   * Every entry is an individually reviewed exception, never a pattern.
   */
  allowedActualOnly?: readonly string[];
}

type AbiRecord = Record<string, unknown>;

// Types are compared as emitted: solc always emits canonical types
// (`uint256`, never `uint`), so aliases are not normalized — a non-canonical
// hand-written artifact fails closed as missing+unexpected.
function canonicalType(parameter: AbiRecord): string {
  const type = String(parameter.type);
  if (!type.startsWith("tuple")) return type;
  const components = (parameter.components as AbiRecord[] | undefined) ?? [];
  return `(${components.map(canonicalType).join(",")})${type.slice("tuple".length)}`;
}

const canonicalTypes = (parameters: unknown): string =>
  ((parameters as AbiRecord[] | undefined) ?? []).map(canonicalType).join(",");

function signatureOf(item: AbiRecord): string {
  if (item.type === "fallback" || item.type === "receive") return String(item.type);
  return `${item.type} ${item.name}(${canonicalTypes(item.inputs)})`;
}

/**
 * The semantics that must match for one signature. Parameter names,
 * `internalType`, `gas`, and the legacy `constant`/`payable` flags are
 * deliberately ignored: they are not part of the on-chain calling or
 * decoding contract.
 */
function semanticsOf(item: AbiRecord): string {
  switch (item.type) {
    case "function":
      return `outputs=(${canonicalTypes(item.outputs)}) stateMutability=${item.stateMutability}`;
    case "event": {
      const indexed = ((item.inputs as AbiRecord[] | undefined) ?? [])
        .map((input) => (input.indexed ? "i" : "-"))
        .join("");
      return `indexed=${indexed} anonymous=${item.anonymous === true}`;
    }
    case "fallback":
    case "receive":
      return `stateMutability=${item.stateMutability}`;
    default:
      return "";
  }
}

function project(
  abi: Abi,
  side: "expected" | "actual",
  issues: AbiComparisonIssue[],
): Map<string, string> {
  const projection = new Map<string, string>();
  for (const item of abi) {
    // Constructors never survive deployment — behind a proxy they are not
    // even reachable — so they are outside the deployed surface this guards.
    if (item.type === "constructor") continue;
    const record = item as unknown as AbiRecord;
    const signature = signatureOf(record);
    if (projection.has(signature)) {
      issues.push({ kind: "duplicate", signature, detail: `duplicated in the ${side} ABI` });
      continue;
    }
    projection.set(signature, semanticsOf(record));
  }
  return projection;
}

/**
 * Compare two deployed-contract ABIs semantically: every expected item must
 * exist in the actual ABI with identical calling and decoding semantics.
 * Canonical input types define identity (overloads stay distinct, nested
 * parameter and tuple-component order is identity); functions must also agree
 * on output types/order and `stateMutability`, events on their `indexed`
 * layout and `anonymous`. Top-level order is ignored. Actual-only items fail
 * unless individually allowlisted. An empty result is a pass.
 */
export function compareDeployedAbi(
  expected: Abi,
  actual: Abi,
  options: CompareDeployedAbiOptions = {},
): readonly AbiComparisonIssue[] {
  const issues: AbiComparisonIssue[] = [];
  const expectedProjection = project(expected, "expected", issues);
  const actualProjection = project(actual, "actual", issues);
  const allowed = new Set(options.allowedActualOnly);
  for (const [signature, semantics] of expectedProjection) {
    const actualSemantics = actualProjection.get(signature);
    if (actualSemantics === undefined) {
      issues.push({ kind: "missing", signature });
    } else if (actualSemantics !== semantics) {
      issues.push({
        kind: "mismatch",
        signature,
        detail: `expected ${semantics}, actual ${actualSemantics}`,
      });
    }
  }
  for (const signature of actualProjection.keys()) {
    if (!expectedProjection.has(signature) && !allowed.has(signature)) {
      issues.push({ kind: "unexpected", signature });
    }
  }
  return issues;
}
