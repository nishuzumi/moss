import type { Abi } from "abitype";

const API_URL = "https://api.etherscan.io/v2/api";

/** 20-byte hex address accepted by {@link fetchAbi} before any network request. */
export const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export type FetchAbiErrorKind =
  /** Rejected before any network request: bad address or empty API key. */
  | "invalid-input"
  /** The fetch itself failed (DNS, connection, abort). */
  | "network"
  /** The API answered with a non-2xx status. */
  | "http"
  /** The API envelope reported failure (unverified contract, rate limit, bad key). */
  | "api-refused"
  /** The response was not a valid envelope or did not contain a valid ABI. */
  | "invalid-response";

/** A {@link fetchAbi} failure. Messages never contain the API key. */
export class FetchAbiError extends Error {
  readonly kind: FetchAbiErrorKind;

  constructor(kind: FetchAbiErrorKind, message: string) {
    super(message);
    this.name = "FetchAbiError";
    this.kind = kind;
  }
}

export interface FetchAbiOptions {
  /** Injectable fetch for tests. Defaults to the platform fetch. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Replace every occurrence of a secret with `[REDACTED]`: raw, plus both URL
 * encodings an error message can echo — percent encoding (space → `%20`) and
 * form encoding (space → `+`) differ, so both forms are covered.
 */
export function redactSecret(text: string, secret: string): string {
  if (!secret) return text;
  const forms = new Set([
    secret,
    encodeURIComponent(secret),
    new URLSearchParams({ s: secret }).toString().slice("s=".length),
  ]);
  let redacted = text;
  for (const form of forms) redacted = redacted.replaceAll(form, "[REDACTED]");
  return redacted;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const isString = (value: unknown): boolean => typeof value === "string";
const isBoolean = (value: unknown): boolean => typeof value === "boolean";
const optional = (value: unknown, check: (value: unknown) => boolean): boolean =>
  value === undefined || check(value);

function isParameter(value: unknown, allowIndexed: boolean): boolean {
  if (typeof value !== "object" || value === null) return false;
  const parameter = value as Record<string, unknown>;
  return (
    typeof parameter.type === "string" &&
    optional(parameter.name, isString) &&
    optional(parameter.internalType, isString) &&
    (!allowIndexed || optional(parameter.indexed, isBoolean)) &&
    optional(parameter.components, (components) => isParameterArray(components, allowIndexed))
  );
}

function isParameterArray(value: unknown, allowIndexed = false): boolean {
  return Array.isArray(value) && value.every((parameter) => isParameter(parameter, allowIndexed));
}

function isAbiItem(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const hasMutability = (allowed: readonly string[]): boolean =>
    typeof item.stateMutability === "string" && allowed.includes(item.stateMutability);
  switch (item.type) {
    case "function":
      return (
        typeof item.name === "string" &&
        isParameterArray(item.inputs) &&
        isParameterArray(item.outputs) &&
        hasMutability(["pure", "view", "nonpayable", "payable"]) &&
        optional(item.constant, isBoolean) &&
        optional(item.payable, isBoolean) &&
        optional(item.gas, (gas) => typeof gas === "number")
      );
    case "event":
      return (
        typeof item.name === "string" &&
        isParameterArray(item.inputs, true) &&
        optional(item.anonymous, isBoolean)
      );
    case "error":
      return typeof item.name === "string" && isParameterArray(item.inputs);
    case "constructor":
      return (
        isParameterArray(item.inputs) &&
        hasMutability(["payable", "nonpayable"]) &&
        optional(item.payable, isBoolean)
      );
    case "fallback":
      return (
        hasMutability(["payable", "nonpayable"]) &&
        optional(item.payable, isBoolean) &&
        optional(item.inputs, (inputs) => Array.isArray(inputs) && inputs.length === 0)
      );
    case "receive":
      return item.stateMutability === "payable";
    default:
      return false;
  }
}

/**
 * Structural runtime validation backing the compile-time `Abi` contract:
 * per-kind stateMutability sets and declared optional members follow the
 * abitype item types exactly. Deliberately strict about legacy pre-0.5.0
 * artifacts (no `stateMutability`): Monad mainnet contracts are modern, and
 * an explicit failure beats silently normalizing a security artifact — which
 * is also why abitype's own zod schemas (they backfill `stateMutability`
 * from legacy `constant`/`payable`) are not used here.
 */
export function isAbi(value: unknown): value is Abi {
  return Array.isArray(value) && value.every(isAbiItem);
}

/**
 * Fetch the verified ABI of a Monad mainnet contract through the official
 * Etherscan V2 endpoint (`chainid=143`, `module=contract`, `action=getabi`).
 *
 * Validates the address before any network request and the response shape
 * after it; every failure throws a classified {@link FetchAbiError} whose
 * message never contains the API key.
 */
export async function fetchAbi(
  address: string,
  apiKey: string,
  options: FetchAbiOptions = {},
): Promise<Abi> {
  function fail(kind: FetchAbiErrorKind, message: string): never {
    throw new FetchAbiError(kind, redactSecret(message, apiKey));
  }

  if (!ADDRESS_PATTERN.test(address)) fail("invalid-input", "address must be a 20-byte hex value");
  if (!apiKey) fail("invalid-input", "an API key is required");

  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    chainid: "143",
    module: "contract",
    action: "getabi",
    address,
    apikey: apiKey,
  }).toString();

  let response: Response;
  try {
    response = await (options.fetch ?? globalThis.fetch)(url.toString(), {
      headers: { accept: "application/json" },
    });
  } catch (error) {
    fail("network", `network failure fetching ABI for ${address}: ${errorMessage(error)}`);
  }
  if (!response.ok) fail("http", `Monadscan API returned HTTP ${response.status} for ${address}`);

  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch (error) {
    fail(
      "invalid-response",
      `Monadscan returned a non-JSON body for ${address}: ${errorMessage(error)}`,
    );
  }
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    fail("invalid-response", `Monadscan returned an invalid API envelope for ${address}`);
  }
  const { status, message, result } = envelope as Record<string, unknown>;
  if (status === "0") {
    const reason =
      typeof result === "string" ? result : typeof message === "string" ? message : "unknown error";
    fail("api-refused", `Monadscan API refused ${address}: ${reason}`);
  }
  if (status !== "1") {
    fail("invalid-response", `Monadscan returned an invalid API envelope for ${address}`);
  }
  if (typeof result !== "string") {
    fail("invalid-response", `Monadscan returned a non-string result for ${address}`);
  }

  let abi: unknown;
  try {
    abi = JSON.parse(result);
  } catch (error) {
    fail(
      "invalid-response",
      `Monadscan returned malformed ABI JSON for ${address}: ${errorMessage(error)}`,
    );
  }
  if (!Array.isArray(abi)) {
    fail("invalid-response", `Monadscan result for ${address} is not an ABI array`);
  }
  if (!isAbi(abi)) {
    fail("invalid-response", `Monadscan result for ${address} contains an invalid ABI item`);
  }
  return abi;
}
