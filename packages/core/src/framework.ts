import { isAddress, isHex } from "viem";
import type {
  CapabilityNode,
  Change,
  JsonSafeValue,
  ReceiptChange,
  ReceiptResult,
  TransactionNode,
  UnsignedTx,
} from "./types.js";

export function toJsonSafe(value: unknown): JsonSafeValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError("JSON values cannot contain non-finite numbers");
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        entry === undefined ? [] : [[key, toJsonSafe(entry)]],
      ),
    );
  }
  throw new TypeError(`value of type ${typeof value} is not JSON-safe`);
}

export interface ExecutableCapability {
  capability: CapabilityNode;
  transaction: UnsignedTx;
}

/** One fail-closed complexity contract for every Capability tree Core accepts. */
export interface CapabilityTreeLimits {
  /** Maximum Capability nesting depth, counting the root. */
  maxCapabilityDepth: number;
  /** Maximum total CapabilityNodes in one tree. */
  maxCapabilities: number;
  /** Maximum children of one CapabilityNode. */
  maxChildrenPerCapability: number;
  /** Maximum nesting depth of one params value, counting the top-level value. */
  maxParameterDepth: number;
  /** Maximum total parameter values across the whole tree. */
  maxParameterNodes: number;
  /** Maximum total parameter object-key and string characters across the whole tree. */
  maxParameterCharacters: number;
  /** Maximum total transaction calldata bytes across the whole tree. */
  maxCalldataBytes: number;
}

/**
 * Conservative centralized limits enforced before any simulation work.
 * Registry, Simulator and MCP consume the same executable structure, so the
 * bounds live here rather than in any one consumer.
 */
export const CAPABILITY_TREE_LIMITS: Readonly<CapabilityTreeLimits> = Object.freeze({
  maxCapabilityDepth: 16,
  maxCapabilities: 64,
  maxChildrenPerCapability: 64,
  maxParameterDepth: 32,
  maxParameterNodes: 4096,
  maxParameterCharacters: 262_144,
  maxCalldataBytes: 262_144,
});

export type CapabilityTreeErrorCode =
  | "CAPABILITY_DEPTH"
  | "CAPABILITY_COUNT"
  | "CHILD_COUNT"
  | "CAPABILITY_CYCLE"
  | "SHARED_NODE"
  | "PARAMETER_DEPTH"
  | "PARAMETER_COUNT"
  | "PARAMETER_CHARACTERS"
  | "CALLDATA_BYTES"
  | "CALLDATA_PARTIAL_BYTE"
  | "VALUE_QUANTITY"
  | "VALUE_OVERFLOW";

/** Typed rejection of an over-limit or non-tree Capability structure. */
export class CapabilityTreeError extends Error {
  readonly code: CapabilityTreeErrorCode;
  readonly path: string;

  constructor(code: CapabilityTreeErrorCode, path: string, detail: string) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "CapabilityTreeError";
    this.code = code;
    this.path = path;
  }
}

export class ReceiptCoverageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReceiptCoverageError";
  }
}

function requireText(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
}

/** Cumulative budgets shared by one whole-tree traversal. */
interface TreeBudget {
  capabilities: number;
  parameterNodes: number;
  parameterCharacters: number;
  calldataBytes: number;
}

/** JSON-RPC hex quantity: 1 to 64 hex digits, any case, at most 32 bytes. */
const HEX_QUANTITY = /^0x[0-9a-fA-F]{1,64}$/;

function assertTransactionNode(node: TransactionNode, path: string, budget: TreeBudget): void {
  if (!node.transaction || typeof node.transaction !== "object") {
    throw new Error(`${path}.transaction must be an UnsignedTx`);
  }
  const { from, to, data, value } = node.transaction;
  if (!isAddress(from, { strict: false })) throw new Error(`${path}.from is not an address`);
  if (!isAddress(to, { strict: false })) throw new Error(`${path}.to is not an address`);
  if (!isHex(data, { strict: true })) throw new Error(`${path}.data is not hex calldata`);
  if ((data.length - 2) % 2 !== 0) {
    throw new CapabilityTreeError(
      "CALLDATA_PARTIAL_BYTE",
      `${path}.data`,
      "calldata must contain complete bytes",
    );
  }
  budget.calldataBytes += (data.length - 2) / 2;
  if (budget.calldataBytes > CAPABILITY_TREE_LIMITS.maxCalldataBytes) {
    throw new CapabilityTreeError(
      "CALLDATA_BYTES",
      `${path}.data`,
      `total calldata exceeds ${CAPABILITY_TREE_LIMITS.maxCalldataBytes} bytes`,
    );
  }
  if (!isHex(value, { strict: true })) throw new Error(`${path}.value is not a hex quantity`);
  if (value.length - 2 > 64) {
    throw new CapabilityTreeError("VALUE_OVERFLOW", `${path}.value`, "value exceeds 32 bytes");
  }
  if (!HEX_QUANTITY.test(value)) {
    throw new CapabilityTreeError(
      "VALUE_QUANTITY",
      `${path}.value`,
      "value must be a hex quantity of 1 to 64 hex digits",
    );
  }
}

type TreeFrame =
  | { task: "capability"; node: CapabilityNode; path: string; depth: number }
  | { task: "transaction"; node: TransactionNode; capability: CapabilityNode; path: string }
  | { task: "leave"; node: CapabilityNode };

/**
 * Validates and depth-first flattens one Capability tree with an explicit
 * stack, preserving the execution order of the previous recursive traversal.
 * Cycles and shared Capability or Transaction nodes are rejected and every
 * CAPABILITY_TREE_LIMITS bound is enforced before any simulation work, so
 * adversarial input fails with a typed CapabilityTreeError instead of
 * exhausting stack, memory or downstream RPC budgets.
 */
export function flattenCapabilityTree(root: CapabilityNode): ExecutableCapability[] {
  const output: ExecutableCapability[] = [];
  const visited = new Set<object>();
  const ancestors = new Set<object>();
  const budget: TreeBudget = {
    capabilities: 0,
    parameterNodes: 0,
    parameterCharacters: 0,
    calldataBytes: 0,
  };
  const stack: TreeFrame[] = [{ task: "capability", node: root, path: "Capability", depth: 1 }];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    if (frame.task === "leave") {
      ancestors.delete(frame.node);
      continue;
    }
    if (frame.task === "transaction") {
      if (visited.has(frame.node)) {
        throw new CapabilityTreeError(
          "SHARED_NODE",
          frame.path,
          "TransactionNode appears more than once in the tree",
        );
      }
      visited.add(frame.node);
      assertTransactionNode(frame.node, frame.path, budget);
      output.push({ capability: frame.capability, transaction: frame.node.transaction });
      continue;
    }
    const { node, path, depth } = frame;
    if (!node || typeof node !== "object" || node.kind !== "capability") {
      throw new Error(`${path} is not a CapabilityNode`);
    }
    if (ancestors.has(node)) {
      throw new CapabilityTreeError("CAPABILITY_CYCLE", path, "CapabilityNode is its own ancestor");
    }
    if (visited.has(node)) {
      throw new CapabilityTreeError(
        "SHARED_NODE",
        path,
        "CapabilityNode appears more than once in the tree",
      );
    }
    if (depth > CAPABILITY_TREE_LIMITS.maxCapabilityDepth) {
      throw new CapabilityTreeError(
        "CAPABILITY_DEPTH",
        path,
        `Capability depth exceeds ${CAPABILITY_TREE_LIMITS.maxCapabilityDepth}`,
      );
    }
    budget.capabilities += 1;
    if (budget.capabilities > CAPABILITY_TREE_LIMITS.maxCapabilities) {
      throw new CapabilityTreeError(
        "CAPABILITY_COUNT",
        path,
        `Capability count exceeds ${CAPABILITY_TREE_LIMITS.maxCapabilities}`,
      );
    }
    visited.add(node);
    ancestors.add(node);
    requireText(node.protocol, `${path}.protocol`);
    requireText(node.method, `${path}.method`);
    assertBoundedParams(node.params, `${path}.params`, budget);
    if (!Array.isArray(node.children)) throw new Error(`${path}.children must be an array`);
    if (node.children.length > CAPABILITY_TREE_LIMITS.maxChildrenPerCapability) {
      throw new CapabilityTreeError(
        "CHILD_COUNT",
        path,
        `child count exceeds ${CAPABILITY_TREE_LIMITS.maxChildrenPerCapability}`,
      );
    }
    let direct = 0;
    for (const child of node.children) {
      if (child?.kind === "transaction") direct += 1;
    }
    if (direct !== 1) {
      throw new Error(
        `capability "${node.protocol}.${node.method}" must own exactly one direct transaction; got ${direct}`,
      );
    }
    const children: TreeFrame[] = [];
    for (const [index, child] of node.children.entries()) {
      const childPath = `${path}.children[${index}]`;
      if (child?.kind === "capability") {
        children.push({ task: "capability", node: child, path: childPath, depth: depth + 1 });
      } else if (child?.kind === "transaction") {
        children.push({ task: "transaction", node: child, capability: node, path: childPath });
      } else {
        throw new Error(`${childPath} is not a CapabilityNode or TransactionNode`);
      }
    }
    stack.push({ task: "leave", node });
    stack.push(...children.toReversed());
  }
  return output;
}

function addParameterCharacters(count: number, path: string, budget: TreeBudget): void {
  budget.parameterCharacters += count;
  if (budget.parameterCharacters > CAPABILITY_TREE_LIMITS.maxParameterCharacters) {
    throw new CapabilityTreeError(
      "PARAMETER_CHARACTERS",
      path,
      `total parameter key and string characters exceed ${CAPABILITY_TREE_LIMITS.maxParameterCharacters}`,
    );
  }
}

type ParameterFrame =
  | { task: "value"; value: unknown; path: string; depth: number }
  | { task: "leave"; value: object };

/**
 * Iteratively validates one params value against the shared cumulative
 * parameter budgets while keeping the JSON-safety rules of the previous
 * recursive check, including its ancestor-only cycle rejection.
 */
function assertBoundedParams(value: unknown, path: string, budget: TreeBudget): void {
  const ancestors = new WeakSet<object>();
  const stack: ParameterFrame[] = [{ task: "value", value, path, depth: 1 }];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    if (frame.task === "leave") {
      ancestors.delete(frame.value);
      continue;
    }
    const { value: current, path: currentPath, depth } = frame;
    budget.parameterNodes += 1;
    if (budget.parameterNodes > CAPABILITY_TREE_LIMITS.maxParameterNodes) {
      throw new CapabilityTreeError(
        "PARAMETER_COUNT",
        currentPath,
        `total parameter nodes exceed ${CAPABILITY_TREE_LIMITS.maxParameterNodes}`,
      );
    }
    if (depth > CAPABILITY_TREE_LIMITS.maxParameterDepth) {
      throw new CapabilityTreeError(
        "PARAMETER_DEPTH",
        currentPath,
        `parameter depth exceeds ${CAPABILITY_TREE_LIMITS.maxParameterDepth}`,
      );
    }
    if (current === null || typeof current === "boolean") continue;
    if (typeof current === "string") {
      addParameterCharacters(current.length, currentPath, budget);
      continue;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current))
        throw new TypeError(`${currentPath} contains a non-finite number`);
      continue;
    }
    if (typeof current !== "object") {
      throw new TypeError(`${currentPath} contains a non-JSON-safe ${typeof current}`);
    }
    if (ancestors.has(current)) throw new TypeError(`${currentPath} contains a cycle`);
    ancestors.add(current);
    stack.push({ task: "leave", value: current });
    if (Array.isArray(current)) {
      // Reject a budget-exceeding container before queueing its members, so
      // frame memory stays bounded by the node budget.
      if (budget.parameterNodes + current.length > CAPABILITY_TREE_LIMITS.maxParameterNodes) {
        throw new CapabilityTreeError(
          "PARAMETER_COUNT",
          currentPath,
          `total parameter nodes exceed ${CAPABILITY_TREE_LIMITS.maxParameterNodes}`,
        );
      }
      for (let index = current.length - 1; index >= 0; index -= 1) {
        stack.push({
          task: "value",
          value: current[index],
          path: `${currentPath}[${index}]`,
          depth: depth + 1,
        });
      }
      continue;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${currentPath} contains a non-plain object`);
    }
    if (Object.getOwnPropertySymbols(current).length > 0) {
      throw new TypeError(`${currentPath} contains a symbol key`);
    }
    // Reject a budget-exceeding container before materializing its entries,
    // so frame memory stays bounded by the node budget (same guarantee as the
    // array branch above).
    let keyCount = 0;
    for (const key in current) {
      if (!Object.hasOwn(current, key)) continue;
      keyCount += 1;
      if (budget.parameterNodes + keyCount > CAPABILITY_TREE_LIMITS.maxParameterNodes) {
        throw new CapabilityTreeError(
          "PARAMETER_COUNT",
          currentPath,
          `total parameter nodes exceed ${CAPABILITY_TREE_LIMITS.maxParameterNodes}`,
        );
      }
    }
    const entries = Object.entries(current);
    for (const [key] of entries) addParameterCharacters(key.length, currentPath, budget);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (!entry) continue;
      stack.push({
        task: "value",
        value: entry[1],
        path: `${currentPath}.${entry[0]}`,
        depth: depth + 1,
      });
    }
  }
}

function assertJsonSafe(value: unknown, path: string, seen = new WeakSet<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} contains a non-JSON-safe ${typeof value}`);
  }
  if (seen.has(value)) throw new TypeError(`${path} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      assertJsonSafe(entry, `${path}[${index}]`, seen);
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} contains a non-plain object`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`${path} contains a symbol key`);
    }
    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafe(entry, `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
}

function flattenReceipt(
  receipt: ReceiptResult,
  path = "Receipt",
  seen = new WeakSet<object>(),
): ReceiptChange[] {
  if (!receipt || typeof receipt !== "object" || receipt.kind !== "receipt") {
    throw new Error(`${path} is not a Receipt`);
  }
  if (seen.has(receipt)) throw new Error(`${path} contains a Receipt cycle`);
  seen.add(receipt);
  assertJsonSafe(receipt.outcome, `${path}.outcome`);
  requireText(receipt.text, `${path}.text`);
  if (!Array.isArray(receipt.changes)) throw new Error(`${path}.changes must be an array`);
  const leaves: ReceiptChange[] = [];
  for (const [index, child] of receipt.changes.entries()) {
    const childPath = `${path}.changes[${index}]`;
    if (child?.kind === "change") {
      requireText(child.text, `${childPath}.text`);
      assertJsonSafe(child.data, `${childPath}.data`);
      leaves.push(child);
    } else if (child?.kind === "receipt") {
      leaves.push(...flattenReceipt(child, childPath, seen));
    } else {
      throw new Error(`${childPath} is not a Receipt or ReceiptChange`);
    }
  }
  seen.delete(receipt);
  return leaves;
}

export function verifyReceiptCoverage(changes: readonly Change[], receipt: ReceiptResult): void {
  const leaves = flattenReceipt(receipt);
  if (leaves.length !== changes.length) {
    throw new ReceiptCoverageError(
      `Receipt covered ${leaves.length} Changes; expected ${changes.length}`,
    );
  }
  for (const [index, change] of changes.entries()) {
    if (leaves[index]?.change !== change) {
      throw new ReceiptCoverageError(
        `Receipt Change ${index} does not retain the original object in order`,
      );
    }
  }
}
