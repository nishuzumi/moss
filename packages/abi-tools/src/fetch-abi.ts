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

/** Replace every raw and URL-encoded occurrence of a secret with `[REDACTED]`. */
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

const STATE_MUTABILITY = new Set(["pure", "view", "nonpayable", "payable"]);

function isParameterArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((parameter) => {
      if (typeof parameter !== "object" || parameter === null) return false;
      const { type, components } = parameter as Record<string, unknown>;
      if (typeof type !== "string") return false;
      return components === undefined || isParameterArray(components);
    })
  );
}

function isAbiItem(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  switch (item.type) {
    case "function":
      return (
        typeof item.name === "string" &&
        isParameterArray(item.inputs) &&
        isParameterArray(item.outputs) &&
        STATE_MUTABILITY.has(item.stateMutability as string)
      );
    case "event":
    case "error":
      return typeof item.name === "string" && isParameterArray(item.inputs);
    case "constructor":
      return isParameterArray(item.inputs) && STATE_MUTABILITY.has(item.stateMutability as string);
    case "fallback":
    case "receive":
      return STATE_MUTABILITY.has(item.stateMutability as string);
    default:
      return false;
  }
}

/** Structural runtime validation backing the compile-time `Abi` contract. */
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
  if (status !== "1") {
    const reason =
      typeof result === "string" ? result : typeof message === "string" ? message : "unknown error";
    fail("api-refused", `Monadscan API refused ${address}: ${reason}`);
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
