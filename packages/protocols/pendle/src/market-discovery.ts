import type { MossRuntime } from "@themoss/core";
import { getAddress, isAddress } from "viem";
import { PendleMarketVerificationError, verifyPendleMarket } from "./market-verifier.js";
import type {
  MarketCandidate,
  MarketDiscoveryRejection,
  PendleDiscoveryFetch,
  PendleMarketDiscoveryResult,
  PendleMarketVerifier,
} from "./types.js";

const MONAD_CHAIN_ID = 143;
const PENDLE_MARKETS_SOURCE = "https://api-v2.pendle.finance/core/v2/markets/all?chainId=143";
const PAGE_SIZE = 50;
const MAX_PAGES = 5;
const MAX_CANDIDATES = 200;
const MAX_PAGE_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_DIAGNOSTIC_LENGTH = 320;

type DiscoveryFailureStage =
  | "transport"
  | "http"
  | "content-type"
  | "json"
  | "schema"
  | "pagination"
  | "limit"
  | "clock"
  | "verifier";

type DiscoveryDependencies = Readonly<{
  fetch?: PendleDiscoveryFetch;
  now?: () => Date;
  verify?: PendleMarketVerifier;
}>;

type ParsedPage = Readonly<{
  total: number;
  results: readonly unknown[];
}>;

type CandidateRecord = {
  candidate: MarketCandidate;
  conflicted: boolean;
};

export class PendleMarketDiscoveryError extends Error {
  readonly stage: DiscoveryFailureStage;

  constructor(stage: DiscoveryFailureStage, detail: string, options: ErrorOptions = {}) {
    super(`Pendle market discovery failed at ${stage}: ${bounded(detail)}`, options);
    this.name = "PendleMarketDiscoveryError";
    this.stage = stage;
  }
}

/**
 * Discovers API-nominated candidates and returns only markets accepted by the on-chain verifier.
 */
export async function discoverPendleMarkets(
  runtime: MossRuntime,
  dependencies: DiscoveryDependencies = {},
): Promise<PendleMarketDiscoveryResult> {
  const transport = dependencies.fetch ?? ((input: URL, init?: RequestInit) => fetch(input, init));
  const verify = dependencies.verify ?? verifyPendleMarket;
  const now = dependencies.now ?? (() => new Date());
  const observedAt = now();
  if (!(observedAt instanceof Date) || !Number.isFinite(observedAt.getTime())) {
    throw failure("clock", "clock returned an invalid observation time");
  }
  const fetchedAt = observedAt.toISOString();

  const rawCandidates = await fetchCandidatePages(transport);
  const rejections: MarketDiscoveryRejection[] = [];
  const records: CandidateRecord[] = [];
  const byMarket = new Map<string, CandidateRecord>();

  for (const rawCandidate of rawCandidates) {
    let candidate: MarketCandidate;
    try {
      candidate = parseCandidate(rawCandidate, fetchedAt);
    } catch (error) {
      rejections.push(
        Object.freeze({
          stage: "candidate-schema",
          candidate: candidateAddress(rawCandidate),
          reason: bounded(errorMessage(error)),
        }),
      );
      continue;
    }

    const key = candidate.market.toLowerCase();
    const existing = byMarket.get(key);
    if (!existing) {
      const record = { candidate, conflicted: false };
      records.push(record);
      byMarket.set(key, record);
      continue;
    }
    if (sameClaim(existing.candidate, candidate)) continue;
    if (!existing.conflicted) {
      existing.conflicted = true;
      rejections.push(
        Object.freeze({
          stage: "duplicate-candidate",
          candidate: existing.candidate.market,
          reason: "official API returned conflicting metadata for the same market",
        }),
      );
    }
  }

  const verified = [];
  for (const { candidate, conflicted } of records) {
    if (conflicted) continue;
    try {
      const market = await verify(runtime, candidate);
      verified.push(
        Object.freeze({
          market,
          metadata: candidate.metadata,
        }),
      );
    } catch (error) {
      if (error instanceof PendleMarketVerificationError) {
        rejections.push(
          Object.freeze({
            stage: error.stage,
            candidate: candidate.market,
            reason: bounded(error.message),
          }),
        );
        continue;
      }
      throw failure("verifier", errorMessage(error), error);
    }
  }

  const frozenVerified = Object.freeze([...verified]);
  const frozenRejections = Object.freeze([...rejections]);
  return Object.freeze({
    status: frozenVerified.length > 0 ? "available" : "unavailable",
    candidateCount: rawCandidates.length,
    verified: frozenVerified,
    rejections: frozenRejections,
  });
}

async function fetchCandidatePages(transport: PendleDiscoveryFetch): Promise<readonly unknown[]> {
  const candidates: unknown[] = [];
  const pageFingerprints = new Set<string>();
  let expectedTotal: number | undefined;
  let skip = 0;

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const url = new URL(PENDLE_MARKETS_SOURCE);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("skip", String(skip));
    const page = await fetchPage(transport, url, skip);

    if (expectedTotal === undefined) {
      expectedTotal = page.total;
      if (expectedTotal > MAX_CANDIDATES) {
        throw failure(
          "limit",
          `API total ${expectedTotal} exceeds candidate limit ${MAX_CANDIDATES}`,
        );
      }
    } else if (page.total !== expectedTotal) {
      throw failure("pagination", `API total changed from ${expectedTotal} to ${page.total}`);
    }

    if (page.results.length > PAGE_SIZE) {
      throw failure("pagination", `page returned more than ${PAGE_SIZE} candidates`);
    }
    if (candidates.length + page.results.length > expectedTotal) {
      throw failure("pagination", "page results exceed the reported total");
    }
    if (page.results.length === 0) {
      if (candidates.length === expectedTotal) return Object.freeze([...candidates]);
      throw failure("pagination", "API returned an empty page before the reported total");
    }

    const fingerprint = JSON.stringify(page.results);
    if (pageFingerprints.has(fingerprint)) {
      throw failure("pagination", "API repeated page contents while skip advanced");
    }
    pageFingerprints.add(fingerprint);
    candidates.push(...page.results);
    skip += page.results.length;
    if (candidates.length === expectedTotal) return Object.freeze([...candidates]);
  }

  throw failure("pagination", `API exceeded the fixed ${MAX_PAGES} page limit`);
}

async function fetchPage(
  transport: PendleDiscoveryFetch,
  url: URL,
  expectedSkip: number,
): Promise<ParsedPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  let body: string;
  try {
    response = await transport(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw failure("http", `official API returned HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType?.toLowerCase().startsWith("application/json")) {
      throw failure("content-type", "official API did not return application/json");
    }
    const declaredLength = response.headers.get("content-length");
    if (
      declaredLength !== null &&
      (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_PAGE_BYTES)
    ) {
      throw failure("limit", `API page exceeds the ${MAX_PAGE_BYTES} byte limit`);
    }
    body = await readBoundedBody(response);
  } catch (error) {
    if (error instanceof PendleMarketDiscoveryError) throw error;
    if (controller.signal.aborted) {
      throw failure(
        "transport",
        `official API request timed out after ${REQUEST_TIMEOUT_MS}ms`,
        error,
      );
    }
    throw failure("transport", errorMessage(error), error);
  } finally {
    clearTimeout(timeout);
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch (error) {
    throw failure("json", "official API returned invalid JSON", error);
  }
  return parsePage(value, expectedSkip);
}

async function readBoundedBody(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_PAGE_BYTES) {
        await reader.cancel();
        throw failure("limit", `API page exceeds the ${MAX_PAGE_BYTES} byte limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function parsePage(value: unknown, expectedSkip: number): ParsedPage {
  const record = objectRecord(value, "top-level response");
  const total = nonNegativeInteger(record.total, "total");
  const limit = nonNegativeInteger(record.limit, "limit");
  const skip = nonNegativeInteger(record.skip, "skip");
  if (limit !== PAGE_SIZE) {
    throw failure("pagination", `API reported limit ${limit}, expected ${PAGE_SIZE}`);
  }
  if (skip !== expectedSkip) {
    throw failure("pagination", `API reported skip ${skip}, expected ${expectedSkip}`);
  }
  if (!Array.isArray(record.results)) {
    throw failure("schema", "results must be an array");
  }
  return Object.freeze({ total, results: record.results });
}

function parseCandidate(value: unknown, fetchedAt: string): MarketCandidate {
  const record = objectRecord(value, "candidate");
  const market = address(record.address, "address");
  if (record.chainId !== MONAD_CHAIN_ID) {
    throw new Error(`candidate must report chain ID ${MONAD_CHAIN_ID}`);
  }
  if (typeof record.underlyingAsset !== "string") {
    throw new Error("underlyingAsset must be a chain-qualified address string");
  }
  const separator = record.underlyingAsset.indexOf("-");
  const underlyingChain = record.underlyingAsset.slice(0, separator);
  const underlyingAddress = record.underlyingAsset.slice(separator + 1);
  if (separator <= 0 || underlyingChain !== String(MONAD_CHAIN_ID)) {
    throw new Error(`underlyingAsset must use chain ID ${MONAD_CHAIN_ID}`);
  }
  const expectedUnderlying = address(underlyingAddress, "underlyingAsset");
  const name = shortText(record.name, "name");
  const protocol = shortText(record.protocol, "protocol");
  const expiry = shortText(record.expiry, "expiry");
  if (!Number.isFinite(Date.parse(expiry))) {
    throw new Error("expiry must be a valid timestamp");
  }

  const details =
    record.details === undefined || record.details === null
      ? undefined
      : objectRecord(record.details, "details");
  const rawApy = details?.aggregatedApy;
  let aggregatedApy: number | undefined;
  if (rawApy !== undefined && rawApy !== null) {
    if (typeof rawApy !== "number" || !Number.isFinite(rawApy)) {
      throw new Error("details.aggregatedApy must be a finite number, null, or absent");
    }
    aggregatedApy = rawApy;
  }

  const provenance = Object.freeze({
    kind: "inferred" as const,
    provider: "Pendle official API" as const,
    source: PENDLE_MARKETS_SOURCE,
    fetchedAt,
  });
  const metadata = Object.freeze({
    name,
    protocol,
    expiry,
    ...(aggregatedApy === undefined ? {} : { aggregatedApy }),
    provenance,
  });
  return Object.freeze({ market, expectedUnderlying, metadata });
}

function sameClaim(left: MarketCandidate, right: MarketCandidate): boolean {
  return (
    left.expectedUnderlying === right.expectedUnderlying &&
    left.metadata.name === right.metadata.name &&
    left.metadata.protocol === right.metadata.protocol &&
    left.metadata.expiry === right.metadata.expiry &&
    left.metadata.aggregatedApy === right.metadata.aggregatedApy
  );
}

function candidateAddress(value: unknown) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const candidate = (value as Record<string, unknown>).address;
    if (typeof candidate === "string" && isAddress(candidate, { strict: false })) {
      return getAddress(candidate);
    }
  }
  return undefined;
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw failure("schema", `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw failure("schema", `${label} must be a non-negative safe integer`);
  }
  return value;
}

function address(value: unknown, label: string) {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new Error(`${label} must be a valid EVM address`);
  }
  return getAddress(value);
}

function shortText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 200) {
    throw new Error(`${label} must be a non-empty string of at most 200 characters`);
  }
  return value;
}

function failure(
  stage: DiscoveryFailureStage,
  detail: string,
  cause?: unknown,
): PendleMarketDiscoveryError {
  return new PendleMarketDiscoveryError(stage, detail, { cause });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : Object.prototype.toString.call(error);
}

function bounded(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= MAX_DIAGNOSTIC_LENGTH
    ? compact
    : `${compact.slice(0, MAX_DIAGNOSTIC_LENGTH - 1)}…`;
}
