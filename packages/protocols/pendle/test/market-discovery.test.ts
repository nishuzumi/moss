import type { MossRuntime } from "@themoss/core";
import { getAddress } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverPendleMarkets, PendleMarketDiscoveryError } from "../src/market-discovery.js";
import { PendleMarketVerificationError } from "../src/market-verifier.js";
import type { MarketCandidate, VerifiedMarket } from "../src/types.js";

const MARKET_A = getAddress("0x1111111111111111111111111111111111111111");
const MARKET_B = getAddress("0x2222222222222222222222222222222222222222");
const UNDERLYING_A = getAddress("0x3333333333333333333333333333333333333333");
const UNDERLYING_B = getAddress("0x4444444444444444444444444444444444444444");
const SY = getAddress("0x5555555555555555555555555555555555555555");
const PT = getAddress("0x6666666666666666666666666666666666666666");
const YT = getAddress("0x7777777777777777777777777777777777777777");
const FACTORY = getAddress("0x8888888888888888888888888888888888888888");
const FETCHED_AT = new Date("2026-07-19T08:30:00.000Z");
const RUNTIME = {} as MossRuntime;

afterEach(() => {
  vi.useRealTimers();
});

describe("Pendle official API market discovery", () => {
  it("discovers one page, verifies in API order, and preserves inferred metadata provenance", async () => {
    const verify = vi.fn(async (_runtime: MossRuntime, candidate: MarketCandidate) =>
      verified(candidate),
    );
    const fetch = pagedFetch([
      page([apiMarket(MARKET_A, UNDERLYING_A), apiMarket(MARKET_B, UNDERLYING_B)], 2, 0),
    ]);

    const result = await discoverPendleMarkets(RUNTIME, { fetch, now: () => FETCHED_AT, verify });

    expect(result.status).toBe("available");
    expect(result.candidateCount).toBe(2);
    expect(result.verified.map(({ market }) => market.market)).toEqual([MARKET_A, MARKET_B]);
    expect(result.rejections).toEqual([]);
    expect(result.verified[0]?.metadata).toEqual({
      name: "Market A",
      protocol: "Protocol A",
      expiry: "2026-10-08T00:00:00.000Z",
      aggregatedApy: 0.075,
      provenance: {
        kind: "inferred",
        provider: "Pendle official API",
        source: "https://api-v2.pendle.finance/core/v2/markets/all?chainId=143",
        fetchedAt: FETCHED_AT.toISOString(),
      },
    });
    expect(verify.mock.calls.map(([, candidate]) => candidate.market)).toEqual([
      MARKET_A,
      MARKET_B,
    ]);
    expect(verify.mock.calls.map(([, candidate]) => candidate.expectedUnderlying)).toEqual([
      UNDERLYING_A,
      UNDERLYING_B,
    ]);
    expect(fetch.mock.calls[0]?.[0].toString()).toContain("chainId=143");
    expect(fetch.mock.calls[0]?.[0].toString()).toContain("limit=50");
    expect(fetch.mock.calls[0]?.[0].toString()).toContain("skip=0");
  });

  it("walks multiple pages and keeps the original candidate order", async () => {
    const fetch = pagedFetch([
      page([apiMarket(MARKET_A, UNDERLYING_A)], 2, 0),
      page([apiMarket(MARKET_B, UNDERLYING_B)], 2, 1),
    ]);

    const result = await discover(fetch);

    expect(result.verified.map(({ market }) => market.market)).toEqual([MARKET_A, MARKET_B]);
    expect(fetch.mock.calls[1]?.[0].toString()).toContain("skip=1");
  });

  it("deduplicates identical market claims before verification", async () => {
    const verify = vi.fn(async (_runtime: MossRuntime, candidate: MarketCandidate) =>
      verified(candidate),
    );
    const item = apiMarket(MARKET_A, UNDERLYING_A);
    const fetch = pagedFetch([page([item, item, apiMarket(MARKET_B, UNDERLYING_B)], 3, 0)]);

    const result = await discoverPendleMarkets(RUNTIME, { fetch, now: () => FETCHED_AT, verify });

    expect(result.verified.map(({ market }) => market.market)).toEqual([MARKET_A, MARKET_B]);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(result.rejections).toEqual([]);
  });

  it("deduplicates identical claims split across distinct pages", async () => {
    const verify = vi.fn(async (_runtime: MossRuntime, candidate: MarketCandidate) =>
      verified(candidate),
    );
    const fetch = pagedFetch([
      page([apiMarket(MARKET_A, UNDERLYING_A)], 3, 0),
      page([apiMarket(MARKET_A, UNDERLYING_A), apiMarket(MARKET_B, UNDERLYING_B)], 3, 1),
    ]);

    const result = await discoverPendleMarkets(RUNTIME, { fetch, now: () => FETCHED_AT, verify });

    expect(result.verified.map(({ market }) => market.market)).toEqual([MARKET_A, MARKET_B]);
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it("taints a duplicate market with conflicting metadata instead of choosing a claim", async () => {
    const verify = vi.fn(async (_runtime: MossRuntime, candidate: MarketCandidate) =>
      verified(candidate),
    );
    const conflicting = apiMarket(MARKET_A, UNDERLYING_B, { name: "Forged label" });
    const fetch = pagedFetch([
      page(
        [apiMarket(MARKET_A, UNDERLYING_A), apiMarket(MARKET_B, UNDERLYING_B), conflicting],
        3,
        0,
      ),
    ]);

    const result = await discoverPendleMarkets(RUNTIME, { fetch, now: () => FETCHED_AT, verify });

    expect(result.verified.map(({ market }) => market.market)).toEqual([MARKET_B]);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(result.rejections).toEqual([
      expect.objectContaining({
        stage: "duplicate-candidate",
        candidate: MARKET_A,
        reason: expect.stringContaining("conflicting"),
      }),
    ]);
  });

  it.each([
    ["non-2xx", () => response({ error: "x".repeat(10_000) }, 503), "http"],
    ["invalid JSON", () => new Response("{not-json", { headers: jsonHeaders() }), "json"],
    ["wrong top-level schema", () => response([]), "schema"],
    [
      "wrong pagination type",
      () => response({ total: "1", limit: 50, skip: 0, results: [] }),
      "schema",
    ],
  ])("fails discovery on %s without falling back", async (_name, makeResponse, stage) => {
    const verify = vi.fn();
    const fetch = vi.fn(async () => makeResponse());

    await expect(
      discoverPendleMarkets(RUNTIME, { fetch, now: () => FETCHED_AT, verify }),
    ).rejects.toMatchObject({ name: "PendleMarketDiscoveryError", stage });
    expect(verify).not.toHaveBeenCalled();
  });

  it("aborts a request that exceeds the fixed timeout", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      (_url: URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const pending = discoverPendleMarkets(RUNTIME, {
      fetch,
      now: () => FETCHED_AT,
      verify: vi.fn(),
    });
    const assertion = expect(pending).rejects.toMatchObject({
      name: "PendleMarketDiscoveryError",
      stage: "transport",
      message: expect.stringContaining("timed out"),
    });

    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("rejects a non-JSON content type before parsing the body", async () => {
    const fetch = vi.fn(
      async () =>
        new Response("<html>proxy error</html>", {
          headers: { "content-type": "text/html" },
        }),
    );

    await expect(discover(fetch)).rejects.toMatchObject({
      stage: "content-type",
    });
  });

  it("rejects an oversized response page without echoing its body", async () => {
    const marker = "sensitive-marker";
    const fetch = vi.fn(
      async () => new Response(`${marker}${"x".repeat(1_000_000)}`, { headers: jsonHeaders() }),
    );

    const error = await captureDiscoveryFailure(discover(fetch));

    expect(error.stage).toBe("limit");
    expect(error.message).not.toContain(marker);
    expect(error.message.length).toBeLessThan(500);
  });

  it.each([
    ["missing address", { address: undefined }],
    ["wrong address type", { address: 42 }],
    ["invalid market address", { address: "0x1234" }],
    ["empty underlying", { underlyingAsset: "" }],
    ["wrong underlying type", { underlyingAsset: 42 }],
    ["missing name", { name: undefined }],
    ["wrong protocol type", { protocol: 42 }],
    ["wrong expiry type", { expiry: false }],
  ])("keeps a structured rejection for a malformed candidate: %s", async (_name, patch) => {
    const malformed = { ...apiMarket(MARKET_A, UNDERLYING_A), ...patch };
    const result = await discover(pagedFetch([page([malformed], 1, 0)]));

    expect(result.status).toBe("unavailable");
    expect(result.verified).toEqual([]);
    expect(result.rejections).toEqual([
      expect.objectContaining({
        stage: "candidate-schema",
        reason: expect.any(String),
      }),
    ]);
  });

  it("rejects a candidate whose response chain ID is not Monad", async () => {
    const result = await discover(
      pagedFetch([page([apiMarket(MARKET_A, UNDERLYING_A, { chainId: 1 })], 1, 0)]),
    );

    expect(result.rejections[0]).toMatchObject({
      stage: "candidate-schema",
      candidate: MARKET_A,
      reason: expect.stringContaining("chain ID 143"),
    });
  });

  it.each([
    ["missing", undefined, undefined],
    ["null", null, undefined],
    ["negative", -0.25, -0.25],
    ["extreme finite", 1e200, 1e200],
  ])("handles %s APY without inventing a guarantee", async (_name, apy, expected) => {
    const item = apiMarket(MARKET_A, UNDERLYING_A);
    if (apy === undefined) delete item.details.aggregatedApy;
    else item.details.aggregatedApy = apy;

    const result = await discover(pagedFetch([page([item], 1, 0)]));

    expect(result.verified[0]?.metadata.aggregatedApy).toBe(expected);
    expect(result.verified[0]?.metadata.provenance.kind).toBe("inferred");
  });

  it.each([
    ["string", "7.5%"],
    ["NaN", "NaN"],
    ["positive infinity", "Infinity"],
    ["negative infinity", "-Infinity"],
  ])("rejects an invalid %s APY value", async (_name, apy) => {
    const item = apiMarket(MARKET_A, UNDERLYING_A);
    item.details.aggregatedApy = apy;

    const result = await discover(pagedFetch([page([item], 1, 0)]));

    expect(result.status).toBe("unavailable");
    expect(result.rejections[0]).toMatchObject({
      stage: "candidate-schema",
      candidate: MARKET_A,
      reason: expect.stringContaining("aggregatedApy"),
    });
  });

  it.each(["1e400", "-1e400"])("rejects a JSON number parsed as non-finite: %s", async (apy) => {
    const item = apiMarket(MARKET_A, UNDERLYING_A);
    item.details.aggregatedApy = "__APY__";
    const raw = JSON.stringify(page([item], 1, 0)).replace('"__APY__"', apy);
    const fetch = vi.fn(async () => new Response(raw, { headers: jsonHeaders() }));

    const result = await discover(fetch);

    expect(result.status).toBe("unavailable");
    expect(result.rejections[0]).toMatchObject({
      stage: "candidate-schema",
      candidate: MARKET_A,
      reason: expect.stringContaining("finite number"),
    });
  });

  it("fails when the service ignores pagination and repeats a page", async () => {
    const repeated = page([apiMarket(MARKET_A, UNDERLYING_A)], 3, 0);
    const fetch = vi.fn(async (_url: URL) => response(repeated));
    fetch.mockImplementationOnce(async () => response(repeated));
    fetch.mockImplementationOnce(async () => response({ ...repeated, skip: 1 }));

    await expect(discover(fetch)).rejects.toMatchObject({
      name: "PendleMarketDiscoveryError",
      stage: "pagination",
      message: expect.stringContaining("repeated page"),
    });
  });

  it("fails on inconsistent pagination metadata", async () => {
    const fetch = pagedFetch([
      page([apiMarket(MARKET_A, UNDERLYING_A)], 2, 0),
      page([apiMarket(MARKET_B, UNDERLYING_B)], 3, 1),
    ]);

    await expect(discover(fetch)).rejects.toMatchObject({
      stage: "pagination",
      message: expect.stringContaining("total"),
    });
  });

  it("fails when reported skip does not match the requested page", async () => {
    const fetch = pagedFetch([page([apiMarket(MARKET_A, UNDERLYING_A)], 2, 1)]);

    await expect(discover(fetch)).rejects.toMatchObject({
      stage: "pagination",
      message: expect.stringContaining("reported skip"),
    });
  });

  it("enforces the maximum page count", async () => {
    const fetch = vi.fn(async (url: URL) => {
      const skip = Number(url.searchParams.get("skip"));
      const market = `0x${(skip + 1).toString(16).padStart(40, "0")}`;
      return response(page([apiMarket(market, UNDERLYING_A)], 100, skip));
    });

    await expect(discover(fetch)).rejects.toMatchObject({
      stage: "pagination",
      message: expect.stringContaining("page limit"),
    });
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("rejects totals above the fixed candidate limit before chain reads", async () => {
    const verify = vi.fn();
    const fetch = pagedFetch([page([], 201, 0)]);

    await expect(
      discoverPendleMarkets(RUNTIME, { fetch, now: () => FETCHED_AT, verify }),
    ).rejects.toMatchObject({
      stage: "limit",
      message: expect.stringContaining("candidate limit"),
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it.each([
    ["forged market", "factory-registration"],
    ["wrong underlying", "token-support-in"],
    ["wrong factory", "factory-getter"],
    ["missing bytecode", "market-bytecode"],
    ["expired", "expiry"],
    ["unsupported SY", "token-support-out"],
  ] as const)("keeps %s verifier failures out of verified markets", async (_name, stage) => {
    const verify = vi.fn(async () => {
      throw new PendleMarketVerificationError(stage, MARKET_A, "untrusted claim rejected");
    });
    const result = await discoverPendleMarkets(RUNTIME, {
      fetch: pagedFetch([page([apiMarket(MARKET_A, UNDERLYING_A)], 1, 0)]),
      now: () => FETCHED_AT,
      verify,
    });

    expect(result.status).toBe("unavailable");
    expect(result.verified).toEqual([]);
    expect(result.rejections[0]).toMatchObject({
      stage,
      candidate: MARKET_A,
      reason: expect.stringContaining("untrusted claim rejected"),
    });
  });

  it("records a bounded verifier RPC rejection and continues with later candidates", async () => {
    const verify = vi.fn(async (_runtime: MossRuntime, candidate: MarketCandidate) => {
      if (candidate.market === MARKET_A) {
        throw new PendleMarketVerificationError(
          "read-tokens",
          MARKET_A,
          `RPC unavailable ${"large response ".repeat(100)}`,
        );
      }
      return verified(candidate);
    });
    const result = await discoverPendleMarkets(RUNTIME, {
      fetch: pagedFetch([
        page([apiMarket(MARKET_A, UNDERLYING_A), apiMarket(MARKET_B, UNDERLYING_B)], 2, 0),
      ]),
      now: () => FETCHED_AT,
      verify,
    });

    expect(result.status).toBe("available");
    expect(result.verified.map(({ market }) => market.market)).toEqual([MARKET_B]);
    expect(result.rejections[0]?.reason.length).toBeLessThan(400);
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it("verifies candidates sequentially in deterministic order", async () => {
    let active = 0;
    let maximumActive = 0;
    const verify = vi.fn(async (_runtime: MossRuntime, candidate: MarketCandidate) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return verified(candidate);
    });
    const result = await discoverPendleMarkets(RUNTIME, {
      fetch: pagedFetch([
        page([apiMarket(MARKET_A, UNDERLYING_A), apiMarket(MARKET_B, UNDERLYING_B)], 2, 0),
      ]),
      now: () => FETCHED_AT,
      verify,
    });

    expect(maximumActive).toBe(1);
    expect(result.verified.map(({ market }) => market.market)).toEqual([MARKET_A, MARKET_B]);
  });

  it("treats an unexpected verifier failure as a discovery failure", async () => {
    const verify = vi.fn(async () => {
      throw new Error(`raw provider response ${"secret ".repeat(500)}`);
    });

    const promise = discoverPendleMarkets(RUNTIME, {
      fetch: pagedFetch([page([apiMarket(MARKET_A, UNDERLYING_A)], 1, 0)]),
      now: () => FETCHED_AT,
      verify,
    });

    await expect(promise).rejects.toMatchObject({
      name: "PendleMarketDiscoveryError",
      stage: "verifier",
    });
    await expect(promise).rejects.toSatisfy((error: PendleMarketDiscoveryError) => {
      return error.message.length < 500;
    });
  });
});

function discover(fetch: ReturnType<typeof pagedFetch> | ReturnType<typeof vi.fn>) {
  return discoverPendleMarkets(RUNTIME, {
    fetch,
    now: () => FETCHED_AT,
    verify: async (_runtime, candidate) => verified(candidate),
  });
}

function pagedFetch(bodies: unknown[]) {
  return vi.fn(async (_url: URL, _init?: RequestInit) => {
    const body = bodies.shift();
    if (body === undefined) throw new Error("unexpected extra page request");
    return response(body);
  });
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
}

function jsonHeaders(): Record<string, string> {
  return { "content-type": "application/json; charset=utf-8" };
}

function page(results: unknown[], total: number, skip: number) {
  return { total, limit: 50, skip, results };
}

function apiMarket(market: string, underlying: string, overrides: Record<string, unknown> = {}) {
  return {
    name: market.toLowerCase() === MARKET_A.toLowerCase() ? "Market A" : "Market B",
    protocol: market.toLowerCase() === MARKET_A.toLowerCase() ? "Protocol A" : "Protocol B",
    address: market,
    expiry: "2026-10-08T00:00:00.000Z",
    underlyingAsset: `143-${underlying}`,
    details: { aggregatedApy: 0.075 } as { aggregatedApy?: unknown },
    chainId: 143,
    ...overrides,
  };
}

function verified(candidate: MarketCandidate): VerifiedMarket {
  return Object.freeze({
    market: candidate.market,
    factory: FACTORY,
    sy: SY,
    pt: PT,
    yt: YT,
    underlying: candidate.expectedUnderlying,
    decimals: Object.freeze({ underlying: 18, pt: 18 }),
    expiry: 1_800_000_000n,
    tokenSupport: Object.freeze({
      tokensIn: Object.freeze([candidate.expectedUnderlying]),
      tokensOut: Object.freeze([candidate.expectedUnderlying]),
      underlyingIn: true,
      underlyingOut: true,
    }),
  });
}

async function captureDiscoveryFailure(
  promise: Promise<unknown>,
): Promise<PendleMarketDiscoveryError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof PendleMarketDiscoveryError) return error;
    throw error;
  }
  throw new Error("expected discovery to fail");
}
