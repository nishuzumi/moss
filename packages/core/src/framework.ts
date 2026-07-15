import { isAddress, isHex } from "viem";
import type {
  CapabilityNode,
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

function assertTransactionNode(node: TransactionNode, path: string): void {
  if (!node.transaction || typeof node.transaction !== "object") {
    throw new Error(`${path}.transaction must be an UnsignedTx`);
  }
  const { from, to, data, value } = node.transaction;
  if (!isAddress(from, { strict: false })) throw new Error(`${path}.from is not an address`);
  if (!isAddress(to, { strict: false })) throw new Error(`${path}.to is not an address`);
  if (!isHex(data, { strict: true })) throw new Error(`${path}.data is not hex calldata`);
  if (!isHex(value, { strict: true })) throw new Error(`${path}.value is not a hex quantity`);
  try {
    BigInt(value);
  } catch {
    throw new Error(`${path}.value is not a hex quantity`);
  }
}

export function flattenCapabilityTree(root: CapabilityNode): ExecutableCapability[] {
  const output: ExecutableCapability[] = [];
  const visit = (node: CapabilityNode, path = "Capability"): void => {
    if (!node || typeof node !== "object" || node.kind !== "capability") {
      throw new Error(`${path} is not a CapabilityNode`);
    }
    requireText(node.protocol, `${path}.protocol`);
    requireText(node.method, `${path}.method`);
    requireText(node.receipt, `${path}.receipt`);
    assertJsonSafe(node.params, `${path}.params`);
    if (!Array.isArray(node.children)) throw new Error(`${path}.children must be an array`);
    const direct = node.children.filter(
      (child): child is TransactionNode => child.kind === "transaction",
    );
    if (direct.length !== 1) {
      throw new Error(
        `capability "${node.protocol}.${node.method}" must own exactly one direct transaction; got ${direct.length}`,
      );
    }
    for (const [index, child] of node.children.entries()) {
      const childPath = `${path}.children[${index}]`;
      if (child.kind === "capability") visit(child, childPath);
      else if (child.kind === "transaction") {
        assertTransactionNode(child, childPath);
        output.push({ capability: node, transaction: child.transaction });
      } else throw new Error(`${childPath} is not a CapabilityNode or TransactionNode`);
    }
  };
  visit(root);
  return output;
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
  if (typeof receipt.text !== "string") throw new Error(`${path}.text must be a string`);
  if (!Array.isArray(receipt.changes)) throw new Error(`${path}.changes must be an array`);
  const leaves: ReceiptChange[] = [];
  for (const [index, child] of receipt.changes.entries()) {
    const childPath = `${path}.changes[${index}]`;
    if (child?.kind === "change") {
      if (typeof child.text !== "string") throw new Error(`${childPath}.text must be a string`);
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
