import { isAddress, isHex } from "viem";
import type {
  CapabilityNode,
  CapabilityTreeLimits,
  CapabilityTreeValidationCode,
  Change,
  JsonSafeValue,
  Receipt,
  ReceiptChange,
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

export const CAPABILITY_TREE_LIMITS: Readonly<CapabilityTreeLimits> = Object.freeze({
  maxDepth: 16,
  maxCapabilities: 64,
  maxChildrenPerCapability: 64,
  maxParamDepth: 32,
  maxParamNodes: 4_096,
  maxParamStringLength: 262_144,
  maxCalldataBytes: 262_144,
});

export class CapabilityTreeValidationError extends Error {
  readonly code: CapabilityTreeValidationCode;
  readonly path: string;

  constructor(code: CapabilityTreeValidationCode, path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "CapabilityTreeValidationError";
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

function capabilityTreeError(
  code: CapabilityTreeValidationCode,
  path: string,
  message: string,
): never {
  throw new CapabilityTreeValidationError(code, path, message);
}

function requireText(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
}

function assertTransactionNode(
  node: TransactionNode,
  path: string,
  remainingCalldataBytes: number,
): number {
  if (!node.transaction || typeof node.transaction !== "object") {
    throw new Error(`${path}.transaction must be an UnsignedTx`);
  }
  const { from, to, data, value } = node.transaction;
  if (!isAddress(from, { strict: false })) throw new Error(`${path}.from is not an address`);
  if (!isAddress(to, { strict: false })) throw new Error(`${path}.to is not an address`);
  const calldataBytes =
    typeof data === "string" ? Math.max(0, Math.ceil((data.length - 2) / 2)) : 0;
  if (calldataBytes > remainingCalldataBytes) {
    capabilityTreeError(
      "MAX_CALLDATA_BYTES",
      `${path}.transaction.data`,
      `total calldata exceeds ${CAPABILITY_TREE_LIMITS.maxCalldataBytes} bytes`,
    );
  }
  if (!isHex(data, { strict: true })) throw new Error(`${path}.data is not hex calldata`);
  if (!isHex(value, { strict: true })) throw new Error(`${path}.value is not a hex quantity`);
  try {
    BigInt(value);
  } catch {
    throw new Error(`${path}.value is not a hex quantity`);
  }
  return calldataBytes;
}

export function flattenCapabilityTree(root: CapabilityNode): ExecutableCapability[] {
  const output: ExecutableCapability[] = [];
  const seenNodes = new WeakSet<object>();
  const activeCapabilities = new WeakSet<object>();
  const params = { nodes: 0, stringLength: 0 };
  let capabilities = 0;
  let calldataBytes = 0;
  type Frame =
    | { kind: "enter"; node: unknown; path: string; depth: number }
    | { kind: "exit"; node: object }
    | { kind: "transaction"; node: unknown; capability: CapabilityNode; path: string };
  const stack: Frame[] = [{ kind: "enter", node: root, path: "Capability", depth: 1 }];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    if (frame.kind === "exit") {
      activeCapabilities.delete(frame.node);
      continue;
    }
    if (frame.kind === "transaction") {
      if (!frame.node || typeof frame.node !== "object") {
        throw new Error(`${frame.path} is not a TransactionNode`);
      }
      if (seenNodes.has(frame.node)) {
        capabilityTreeError(
          "SHARED_NODE",
          frame.path,
          "reuses a Capability or Transaction node; Capability trees cannot be DAGs",
        );
      }
      seenNodes.add(frame.node);
      calldataBytes += assertTransactionNode(
        frame.node as TransactionNode,
        frame.path,
        CAPABILITY_TREE_LIMITS.maxCalldataBytes - calldataBytes,
      );
      output.push({
        capability: frame.capability,
        transaction: (frame.node as TransactionNode).transaction,
      });
      continue;
    }

    const { node, path, depth } = frame;
    if (!node || typeof node !== "object" || (node as { kind?: unknown }).kind !== "capability") {
      throw new Error(`${path} is not a CapabilityNode`);
    }
    if (activeCapabilities.has(node)) {
      capabilityTreeError("CYCLE", path, "contains a Capability cycle");
    }
    if (seenNodes.has(node)) {
      capabilityTreeError(
        "SHARED_NODE",
        path,
        "reuses a Capability or Transaction node; Capability trees cannot be DAGs",
      );
    }
    if (depth > CAPABILITY_TREE_LIMITS.maxDepth) {
      capabilityTreeError(
        "MAX_DEPTH",
        path,
        `Capability depth exceeds ${CAPABILITY_TREE_LIMITS.maxDepth}`,
      );
    }
    capabilities += 1;
    if (capabilities > CAPABILITY_TREE_LIMITS.maxCapabilities) {
      capabilityTreeError(
        "MAX_CAPABILITIES",
        path,
        `Capability count exceeds ${CAPABILITY_TREE_LIMITS.maxCapabilities}`,
      );
    }

    const capability = node as CapabilityNode;
    seenNodes.add(node);
    activeCapabilities.add(node);
    requireText(capability.protocol, `${path}.protocol`);
    requireText(capability.method, `${path}.method`);
    assertBoundedJsonSafe(capability.params, `${path}.params`, params);
    if (!Array.isArray(capability.children)) {
      throw new Error(`${path}.children must be an array`);
    }
    if (capability.children.length > CAPABILITY_TREE_LIMITS.maxChildrenPerCapability) {
      capabilityTreeError(
        "MAX_CHILDREN",
        `${path}.children`,
        `child count exceeds ${CAPABILITY_TREE_LIMITS.maxChildrenPerCapability}`,
      );
    }
    const directTransactions = capability.children.reduce(
      (count, child) => count + (child?.kind === "transaction" ? 1 : 0),
      0,
    );
    if (directTransactions !== 1) {
      throw new Error(
        `capability "${capability.protocol}.${capability.method}" must own exactly one direct transaction; got ${directTransactions}`,
      );
    }

    stack.push({ kind: "exit", node });
    for (let index = capability.children.length - 1; index >= 0; index -= 1) {
      const child = capability.children[index] as unknown;
      const childPath = `${path}.children[${index}]`;
      if (
        child &&
        typeof child === "object" &&
        (child as { kind?: unknown }).kind === "capability"
      ) {
        stack.push({ kind: "enter", node: child, path: childPath, depth: depth + 1 });
      } else if (
        child &&
        typeof child === "object" &&
        (child as { kind?: unknown }).kind === "transaction"
      ) {
        stack.push({ kind: "transaction", node: child, capability, path: childPath });
      } else {
        throw new Error(`${childPath} is not a CapabilityNode or TransactionNode`);
      }
    }
  }
  return output;
}

function assertBoundedJsonSafe(
  value: unknown,
  path: string,
  budget: { nodes: number; stringLength: number },
): void {
  type Frame =
    | { kind: "enter"; value: unknown; path: string; depth: number }
    | { kind: "array"; value: readonly unknown[]; path: string; depth: number; index: number }
    | {
        kind: "object";
        value: Record<string, unknown>;
        path: string;
        depth: number;
        keys: Generator<string>;
      }
    | { kind: "exit"; value: object };
  const active = new WeakSet<object>();
  const stack: Frame[] = [{ kind: "enter", value, path, depth: 0 }];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    if (frame.kind === "exit") {
      active.delete(frame.value);
      continue;
    }
    if (frame.kind === "array") {
      if (frame.index >= frame.value.length) continue;
      stack.push({ ...frame, index: frame.index + 1 });
      stack.push({
        kind: "enter",
        value: frame.value[frame.index],
        path: `${frame.path}[${frame.index}]`,
        depth: frame.depth + 1,
      });
      continue;
    }
    if (frame.kind === "object") {
      const next = frame.keys.next();
      if (next.done) continue;
      const childPath = `${frame.path}.${next.value}`;
      addParamStringLength(next.value.length, childPath, budget);
      stack.push(frame);
      stack.push({
        kind: "enter",
        value: frame.value[next.value],
        path: childPath,
        depth: frame.depth + 1,
      });
      continue;
    }
    budget.nodes += 1;
    if (budget.nodes > CAPABILITY_TREE_LIMITS.maxParamNodes) {
      capabilityTreeError(
        "MAX_PARAM_NODES",
        frame.path,
        `total parameter nodes exceed ${CAPABILITY_TREE_LIMITS.maxParamNodes}`,
      );
    }
    if (frame.depth > CAPABILITY_TREE_LIMITS.maxParamDepth) {
      capabilityTreeError(
        "MAX_PARAM_DEPTH",
        frame.path,
        `parameter depth exceeds ${CAPABILITY_TREE_LIMITS.maxParamDepth}`,
      );
    }
    if (frame.value === null || typeof frame.value === "boolean") continue;
    if (typeof frame.value === "string") {
      addParamStringLength(frame.value.length, frame.path, budget);
      continue;
    }
    if (typeof frame.value === "number") {
      if (!Number.isFinite(frame.value)) {
        throw new TypeError(`${frame.path} contains a non-finite number`);
      }
      continue;
    }
    if (typeof frame.value !== "object") {
      throw new TypeError(`${frame.path} contains a non-JSON-safe ${typeof frame.value}`);
    }
    if (active.has(frame.value)) {
      capabilityTreeError("PARAM_CYCLE", frame.path, "contains a parameter cycle");
    }
    active.add(frame.value);
    stack.push({ kind: "exit", value: frame.value });
    if (Array.isArray(frame.value)) {
      stack.push({
        kind: "array",
        value: frame.value,
        path: frame.path,
        depth: frame.depth,
        index: 0,
      });
      continue;
    }
    const prototype = Object.getPrototypeOf(frame.value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${frame.path} contains a non-plain object`);
    }
    if (Object.getOwnPropertySymbols(frame.value).length > 0) {
      throw new TypeError(`${frame.path} contains a symbol key`);
    }
    stack.push({
      kind: "object",
      value: frame.value as Record<string, unknown>,
      path: frame.path,
      depth: frame.depth,
      keys: ownEnumerableKeys(frame.value),
    });
  }
}

function* ownEnumerableKeys(value: object): Generator<string> {
  for (const key in value) {
    if (Object.hasOwn(value, key)) yield key;
  }
}

function addParamStringLength(
  length: number,
  path: string,
  budget: { stringLength: number },
): void {
  budget.stringLength += length;
  if (budget.stringLength > CAPABILITY_TREE_LIMITS.maxParamStringLength) {
    capabilityTreeError(
      "MAX_PARAM_STRING_LENGTH",
      path,
      `total parameter key and string length exceeds ${CAPABILITY_TREE_LIMITS.maxParamStringLength}`,
    );
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
  receipt: Receipt,
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

export function verifyReceiptCoverage(changes: readonly Change[], receipt: Receipt): void {
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
