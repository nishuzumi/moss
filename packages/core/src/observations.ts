import { type Address, isAddress } from "viem";

const QUERY_OBSERVATION = Symbol("moss.queryObservation");

interface TokenMetadata {
  address: Address;
  symbol?: string;
  name?: string;
}

export interface TokenMetadataObservation extends TokenMetadata {
  kind: "tokenMetadata";
}

export type QueryObservation = TokenMetadataObservation;

export function tokenMetadata<const Result extends object>(
  result: Result,
  metadata: TokenMetadata,
): Result {
  Object.defineProperty(result, QUERY_OBSERVATION, {
    value: {
      kind: "tokenMetadata",
      address: metadata.address,
      ...(metadata.symbol === undefined ? {} : { symbol: metadata.symbol }),
      ...(metadata.name === undefined ? {} : { name: metadata.name }),
    } satisfies TokenMetadataObservation,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return result;
}

export function queryObservationOf(value: unknown): QueryObservation | undefined {
  if (typeof value !== "object" || value === null || !Object.hasOwn(value, QUERY_OBSERVATION)) {
    return undefined;
  }
  const observation = (value as Record<symbol, unknown>)[QUERY_OBSERVATION];
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
    throw new Error("invalid Query observation: expected an object");
  }
  const prototype = Object.getPrototypeOf(observation);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("invalid Query observation: expected a plain object");
  }
  const fields = Reflect.ownKeys(observation);
  const allowed = new Set<PropertyKey>(["kind", "address", "symbol", "name"]);
  if (fields.some((field) => !allowed.has(field))) {
    throw new Error("invalid Query observation: contains an unknown field");
  }
  const candidate = observation as Record<string, unknown>;
  if (candidate.kind !== "tokenMetadata") {
    throw new Error(`unknown Query observation kind "${String(candidate.kind)}"`);
  }
  if (typeof candidate.address !== "string" || !isAddress(candidate.address, { strict: false })) {
    throw new Error("invalid tokenMetadata observation: address must be a 20-byte address");
  }
  if (candidate.symbol !== undefined && typeof candidate.symbol !== "string") {
    throw new Error("invalid tokenMetadata observation: symbol must be a string");
  }
  if (candidate.name !== undefined && typeof candidate.name !== "string") {
    throw new Error("invalid tokenMetadata observation: name must be a string");
  }
  return {
    kind: "tokenMetadata",
    address: candidate.address,
    ...(candidate.symbol === undefined ? {} : { symbol: candidate.symbol }),
    ...(candidate.name === undefined ? {} : { name: candidate.name }),
  };
}
