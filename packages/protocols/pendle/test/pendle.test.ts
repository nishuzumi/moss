import { flattenCapabilityTree, type MossRuntime, ParameterError, Registry } from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { decodeFunctionData, getAddress } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendleRouterAbi } from "../src/abis/pendle.js";
import { PENDLE_MARKET_FACTORY_ADDRESS, PENDLE_ROUTER_ADDRESS } from "../src/addresses.js";
import { Pendle, PendleMarketsUnavailableError, selectMarketViews } from "../src/pendle.js";
import type {
  DiscoveredPendleMarket,
  MarketDiscoveryRejection,
  PendleMarketDiscoveryResult,
  VerifiedMarket,
} from "../src/types.js";

const MARKET = getAddress("0x1111111111111111111111111111111111111111");
const SY = getAddress("0x2222222222222222222222222222222222222222");
const PT = getAddress("0x3333333333333333333333333333333333333333");
const YT = getAddress("0x4444444444444444444444444444444444444444");
const UNDERLYING = getAddress("0x5555555555555555555555555555555555555555");
const OTHER = getAddress("0x6666666666666666666666666666666666666666");
const ACCOUNT = getAddress("0x7777777777777777777777777777777777777777");

const APPROX = Object.freeze({
  guessMin: 1_004_036n,
  guessMax: 1_034_309n,
  guessOffchain: 1_009_082n,
  maxIteration: 30n,
  eps: 10_000_000_000_000n,
});
const NET_PT_OUT = 1_014_400n;
const NET_TOKEN_OUT = 990_561n;

// A runtime whose chain reads describe one verified 6-decimal market plus its RouterStatic quotes,
// so the public swap/quote path can be exercised offline without a live endpoint.
function verifiedMarketRuntime(allowance = 0n): MossRuntime {
  return {
    rpcUrl: "",
    client: {
      getChainId: async () => 143,
      getCode: async () => "0x60",
      getBlock: async () => ({ timestamp: 1_000_000_000n }),
      readContract: async ({
        address,
        functionName,
      }: {
        address: string;
        functionName: string;
      }) => {
        switch (functionName) {
          case "isValidMarket":
            return true;
          case "factory":
            return PENDLE_MARKET_FACTORY_ADDRESS;
          case "readTokens":
            return [SY, PT, YT];
          case "expiry":
            return 2_000_000_000n;
          case "yieldToken":
            return UNDERLYING;
          case "getTokensIn":
          case "getTokensOut":
            return [UNDERLYING];
          case "decimals":
            return 6;
          case "allowance":
            return allowance;
          case "swapExactTokenForPtStaticAndGenerateApproxParams":
            return [NET_PT_OUT, 0n, 0n, 0n, 0n, APPROX];
          case "swapExactPtForTokenStatic":
            return [NET_TOKEN_OUT, 0n, 0n, 0n, 0n];
          default:
            throw new Error(`unexpected read ${functionName} @ ${getAddress(address)}`);
        }
      },
    },
  } as unknown as MossRuntime;
}

function apiResponse(markets: readonly Record<string, unknown>[] = [apiMarket(MARKET)]): Response {
  return new Response(
    JSON.stringify({ total: markets.length, limit: 50, skip: 0, results: markets }),
    {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

function apiMarket(market: string, underlying = UNDERLYING): Record<string, unknown> {
  return {
    name: "Test PT",
    protocol: "test",
    address: market,
    expiry: "2033-05-18T03:33:20.000Z",
    underlyingAsset: `143-${underlying}`,
    chainId: 143,
  };
}

describe("Pendle protocol", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => apiResponse()),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers a dex swap tagged for yield PT trading", () => {
    const registry = new Registry({ rpcUrl: "" } as MossRuntime).use(Pendle);
    const swap = registry.discover().find((c) => c.protocol === "pendle" && c.method === "swap");

    expect(swap).toMatchObject({ kind: "capability", category: "dex", verb: "swap" });
    expect(swap?.tags).toEqual(expect.arrayContaining(["yield", "pt"]));
  });

  it("registers quote and markets as read-only queries", () => {
    const registry = new Registry({ rpcUrl: "" } as MossRuntime).use(Pendle);
    const byMethod = new Map(
      registry
        .discover({ protocol: "pendle" })
        .map((coordinate) => [coordinate.method, coordinate]),
    );

    expect(byMethod.get("quote")).toMatchObject({ kind: "query" });
    expect(byMethod.get("markets")).toMatchObject({ kind: "query" });
  });

  it("rejects a market that is not in the current official API candidate set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => apiResponse([apiMarket(OTHER)])),
    );
    const registry = new Registry(verifiedMarketRuntime()).use(Pendle);
    await expect(
      registry.action("pendle", "swap", ACCOUNT, {
        market: MARKET,
        tokenIn: UNDERLYING,
        tokenOut: PT,
        amountIn: "1",
        slippageBps: 50,
      }),
    ).rejects.toThrow(/not a current verified candidate/);
  });

  it("does not fall back to direct market verification when the official API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("official API unavailable");
      }),
    );
    const registry = new Registry(verifiedMarketRuntime()).use(Pendle);
    await expect(
      registry.action("pendle", "quote", ACCOUNT, {
        market: MARKET,
        tokenIn: UNDERLYING,
        tokenOut: PT,
        amountIn: "1",
      }),
    ).rejects.toThrow(/official API unavailable/);
  });

  it("rejects a swap pair outside the verified market underlying and PT", async () => {
    const registry = new Registry(verifiedMarketRuntime()).use(Pendle);
    await expect(
      registry.action("pendle", "swap", ACCOUNT, {
        market: MARKET,
        tokenIn: PT,
        tokenOut: OTHER,
        amountIn: "1",
        slippageBps: 50,
      }),
    ).rejects.toThrow(ParameterError);
  });

  it("rejects non-zero precision beyond token decimals", async () => {
    const registry = new Registry(verifiedMarketRuntime()).use(Pendle);
    await expect(
      registry.action("pendle", "swap", ACCOUNT, {
        market: MARKET,
        tokenIn: UNDERLYING,
        tokenOut: PT,
        amountIn: "1.0000001",
        slippageBps: 50,
      }),
    ).rejects.toThrow(/precision beyond token decimals 6/);
  });
});

describe("selectMarketViews", () => {
  it("returns the verified subset even when some candidates were rejected", () => {
    const views = selectMarketViews(
      discoveryResult({ verified: [discoveredMarket()], rejections: [rejection()] }),
    );

    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ market: MARKET, pt: PT, underlying: UNDERLYING });
  });

  it("throws a bounded explicit error when every candidate was rejected", () => {
    let thrown: unknown;
    try {
      selectMarketViews(
        discoveryResult({
          candidateCount: 2,
          verified: [],
          rejections: [rejection(), rejection({ stage: "factory-registration" })],
        }),
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(PendleMarketsUnavailableError);
    const error = thrown as PendleMarketsUnavailableError;
    expect(error.candidateCount).toBe(2);
    expect(error.rejections).toHaveLength(2);
    expect(error.message).toContain("2");
    expect(error.message.length).toBeLessThan(600);
  });

  it("returns an empty list when discovery found no candidates at all", () => {
    expect(
      selectMarketViews(discoveryResult({ candidateCount: 0, verified: [], rejections: [] })),
    ).toEqual([]);
  });
});

describe("Pendle swap and quote over a verified market", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => apiResponse()),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a buy-PT tree of a nested Router approval and one direct Router swap", async () => {
    const registry = new Registry(verifiedMarketRuntime()).use(Pendle);
    const capability = await registry.action("pendle", "swap", ACCOUNT, {
      market: MARKET,
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: "1",
      slippageBps: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("expected an approval and a swap transaction");

    expect(approval.capability.protocol).toBe("erc20");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [PENDLE_ROUTER_ADDRESS, 1_000_000n],
    });
    expect(getAddress(approval.transaction.to)).toBe(UNDERLYING);

    expect(swap.capability.protocol).toBe("pendle");
    expect(getAddress(swap.transaction.to)).toBe(PENDLE_ROUTER_ADDRESS);
    expect(
      decodeFunctionData({ abi: PendleRouterAbi, data: swap.transaction.data }).functionName,
    ).toBe("swapExactTokenForPt");
  });

  it("approves exactly the amount its swap transaction spends, from one plan source", async () => {
    const registry = new Registry(verifiedMarketRuntime()).use(Pendle);
    const capability = await registry.action("pendle", "swap", ACCOUNT, {
      market: MARKET,
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: "1",
      slippageBps: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("expected an approval and a swap transaction");

    const approveArgs = decodeFunctionData({
      abi: ERC20Abi,
      data: approval.transaction.data,
    }).args;
    const swapArgs = decodeFunctionData({
      abi: PendleRouterAbi,
      data: swap.transaction.data,
    }).args;
    // biome-ignore lint/suspicious/noExplicitAny: decoded ABI tuples are asserted field-by-field
    const [, approvedAmount] = approveArgs as readonly any[];
    // biome-ignore lint/suspicious/noExplicitAny: decoded ABI tuples are asserted field-by-field
    const [, , , , swapInput] = swapArgs as readonly any[];
    expect(approvedAmount).toBe(swapInput.netTokenIn);
  });

  it("skips approval when the existing allowance covers the exact input", async () => {
    const registry = new Registry(verifiedMarketRuntime(1_000_000n)).use(Pendle);
    const capability = await registry.action("pendle", "swap", ACCOUNT, {
      market: MARKET,
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const flattened = flattenCapabilityTree(capability);
    expect(flattened).toHaveLength(1);
    expect(flattened[0]?.capability.protocol).toBe("pendle");
  });

  it("zero-resets a non-zero insufficient allowance before approving the exact input", async () => {
    const registry = new Registry(verifiedMarketRuntime(1n)).use(Pendle);
    const capability = await registry.action("pendle", "swap", ACCOUNT, {
      market: MARKET,
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const [reset, approval, swap] = flattenCapabilityTree(capability);
    expect(
      [reset, approval].map((entry) => {
        if (!entry) throw new Error("expected two approvals");
        return decodeFunctionData({ abi: ERC20Abi, data: entry.transaction.data }).args?.[1];
      }),
    ).toEqual([0n, 1_000_000n]);
    expect(swap?.capability.protocol).toBe("pendle");
  });

  it("builds a sell-PT tree that approves and calls swapExactPtForToken", async () => {
    const registry = new Registry(verifiedMarketRuntime()).use(Pendle);
    const capability = await registry.action("pendle", "swap", ACCOUNT, {
      market: MARKET,
      tokenIn: PT,
      tokenOut: UNDERLYING,
      amountIn: "1",
      slippageBps: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("expected an approval and a swap transaction");

    expect(getAddress(approval.transaction.to)).toBe(PT);
    expect(
      decodeFunctionData({ abi: PendleRouterAbi, data: swap.transaction.data }).functionName,
    ).toBe("swapExactPtForToken");
  });

  it("defaults quote slippage to 50 bps and accepts insignificant trailing precision", async () => {
    const registry = new Registry(verifiedMarketRuntime()).use(Pendle);
    const result = await registry.action("pendle", "quote", ACCOUNT, {
      market: MARKET,
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: "1.0000000",
    });
    if (result.kind !== "query") throw new Error("expected a query result");

    expect(result.data).toMatchObject({
      direction: "buy-pt",
      tokenIn: UNDERLYING,
      tokenOut: PT,
      amountIn: "1",
      estimatedOut: "1.0144", // NET_PT_OUT at 6 decimals
      minOut: "1.009328", // floor(NET_PT_OUT * 9950 / 10000) at 6 decimals
    });
  });
});

function discoveredMarket(): DiscoveredPendleMarket {
  return Object.freeze({
    market: Object.freeze({
      market: MARKET,
      factory: PENDLE_MARKET_FACTORY_ADDRESS,
      sy: SY,
      pt: PT,
      yt: YT,
      underlying: UNDERLYING,
      decimals: Object.freeze({ underlying: 6, pt: 6 }),
      expiry: 2_000_000_000n,
      tokenSupport: Object.freeze({
        tokensIn: [UNDERLYING],
        tokensOut: [UNDERLYING],
        underlyingIn: true,
        underlyingOut: true,
      }),
    }) as VerifiedMarket,
    metadata: Object.freeze({
      name: "Test PT",
      protocol: "test",
      expiry: "2033-05-18T03:33:20.000Z",
      provenance: Object.freeze({
        kind: "inferred",
        provider: "Pendle official API",
        source: "https://api-v2.pendle.finance/core/v2/markets/all?chainId=143",
        fetchedAt: "2026-07-20T00:00:00.000Z",
      }),
    }),
  });
}

function rejection(overrides: Partial<MarketDiscoveryRejection> = {}): MarketDiscoveryRejection {
  return Object.freeze({
    stage: overrides.stage ?? "read-tokens",
    candidate: overrides.candidate ?? MARKET,
    reason: overrides.reason ?? "verification failed for the candidate market",
  });
}

function discoveryResult(
  overrides: Partial<PendleMarketDiscoveryResult> = {},
): PendleMarketDiscoveryResult {
  const verified = overrides.verified ?? [];
  const rejections = overrides.rejections ?? [];
  return Object.freeze({
    status: verified.length > 0 ? "available" : "unavailable",
    candidateCount: overrides.candidateCount ?? verified.length + rejections.length,
    verified: Object.freeze([...verified]),
    rejections: Object.freeze([...rejections]),
  });
}
