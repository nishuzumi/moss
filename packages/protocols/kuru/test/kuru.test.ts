import {
  type Change,
  createRuntime,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  NATIVE,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { AUSD_ADDRESS, USDC_ADDRESS } from "@themoss/system";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  formatUnits,
  getAddress,
  parseUnits,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KuruOrderbookAbi, KuruRouterAbi } from "../src/abis/kuru.js";
import { KURU_ROUTER_ADDRESS, Kuru, type KuruQuote, KuruQuoteError } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");
const MON_USDC = getAddress("0x1111111111111111111111111111111111111111");
const MON_USDC_WORSE = getAddress("0x2222222222222222222222222222222222222222");
const MON_AUSD = getAddress("0x3333333333333333333333333333333333333333");
const DIRECT_USDC_AUSD = getAddress("0x4444444444444444444444444444444444444444");
const DIRECT_USDC_AUSD_BETTER = getAddress("0x5555555555555555555555555555555555555555");

type MockMarket = {
  address: `0x${string}`;
  base: `0x${string}`;
  quote: `0x${string}`;
  baseDecimals: number;
  quoteDecimals: number;
  buyNumerator: bigint;
  buyDenominator: bigint;
  sellNumerator: bigint;
  sellDenominator: bigint;
  verified?: boolean;
  /**
   * Make this market's quote call reject, so a route can fail for a reason the caller cannot
   * attribute — an RPC hiccup, a revert, a malformed response. The suite could previously only
   * express "quotes fine" and "quotes zero", which is why the collapse below went untested.
   */
  quoteFails?: boolean;
  /** Error `name` for the injected failure; viem's names are what the classifier reads. */
  quoteFailName?: string;
  /** Raw revert data, so an authenticated Panic can be told from a bare revert. */
  quoteFailData?: string;
  /** Wraps the revert data the way viem hands it back from some providers: `{ data: { data } }`. */
  quoteFailDataNested?: boolean;
  /** Full error text, for checking what does NOT reach the wire. */
  quoteFailMessage?: string;
  /** Wraps the failure in N plain outer errors, so the classifier has to walk the cause chain. */
  quoteFailDepth?: number;
  /** Prices below this size and refuses above it — the shape a real market that gives out has. */
  failAbove?: bigint;
};

const MARKETS: readonly MockMarket[] = [
  market(MON_USDC, ZERO, USDC_ADDRESS, 18, 6, 1n, 1n),
  market(MON_USDC_WORSE, ZERO, USDC_ADDRESS, 18, 6, 5n, 4n),
  market(MON_AUSD, ZERO, AUSD_ADDRESS, 18, 6, 6n, 5n),
  market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
  market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 11n, 10n),
];

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Kuru", () => {
  it("loads separate human-amount fields and requires exactly one side", async () => {
    const { registry } = offlineRegistry();
    const [loaded] = registry.load([{ protocol: "kuru", method: "swap" }]);
    expect(loaded?.params.amountIn).toMatchObject({
      description: expect.stringContaining("Fixed input"),
      type: { description: expect.stringContaining("display units") },
    });
    expect(loaded?.params.amountOut).toMatchObject({
      description: expect.stringContaining("Minimum output"),
    });
    expect(loaded?.params.slippage).toMatchObject({
      description: expect.stringContaining("adverse movement"),
      type: {
        default: 50,
        minimum: 50,
        maximum: 5_000,
        description: expect.stringContaining("1 bps equals 0.01%"),
      },
    });
    await expect(
      registry.action("kuru", "swap", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
      }),
    ).rejects.toThrow("provide exactly one of amountIn or amountOut");
    await expect(
      registry.action("kuru", "swap", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
        amountOut: "1",
      }),
    ).rejects.toThrow("provide exactly one of amountIn or amountOut");
    for (const slippage of [49, 5_001]) {
      await expect(
        registry.action("kuru", "swap", ACCOUNT, {
          tokenIn: NATIVE,
          tokenOut: USDC_ADDRESS,
          amountIn: "1",
          slippage,
        }),
      ).rejects.toThrow();
    }
  });

  it("discovers every direct and via-MON candidate and selects the best exact-input path", async () => {
    const { registry, fetchMock } = offlineRegistry();
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
      slippage: 5_000,
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toEqual({
      amountSide: "amountIn",
      amountIn: "1",
      estimatedAmountOut: "1.2",
      minimumAmountOut: "0.6",
      path: [USDC_ADDRESS, NATIVE, AUSD_ADDRESS],
      unavailable: [],
    });
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      pairs: readonly unknown[];
    };
    expect(request.pairs).toHaveLength(6);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);

    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("missing Kuru transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [KURU_ROUTER_ADDRESS, 1_500_000n],
    });
    expect(decodeFunctionData({ abi: KuruRouterAbi, data: swap.transaction.data })).toEqual({
      functionName: "anyToAnySwap",
      args: [
        [MON_USDC, MON_AUSD],
        [true, false],
        [false, true],
        USDC_ADDRESS,
        AUSD_ADDRESS,
        1_500_000n,
        1_791_000n,
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reverse-quotes a target output and applies input slippage headroom", async () => {
    const { registry } = offlineRegistry();
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1.2",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toEqual({
      amountSide: "amountOut",
      estimatedAmountIn: "1",
      maximumAmountIn: "1.005",
      minimumAmountOut: "1.2",
      path: [USDC_ADDRESS, NATIVE, AUSD_ADDRESS],
      unavailable: [],
    });

    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1.2",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("missing Kuru transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      args: [KURU_ROUTER_ADDRESS, 1_005_000n],
    });
    expect(decodeFunctionData({ abi: KuruRouterAbi, data: swap.transaction.data })).toMatchObject({
      args: expect.arrayContaining([1_005_000n, 1_200_000n]),
    });
  });

  it("prefers a direct market when its quote ties the best via-MON route", async () => {
    const equalDirect = market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 6n, 5n);
    const { registry } = offlineRegistry([
      MARKETS[0] as MockMarket,
      MARKETS[2] as MockMarket,
      equalDirect,
    ]);
    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const swap = flattenCapabilityTree(capability).at(-1);
    if (!swap) throw new Error("missing Kuru transaction");
    const decoded = decodeFunctionData({ abi: KuruRouterAbi, data: swap.transaction.data });
    expect(decoded.args.slice(0, 3)).toEqual([[DIRECT_USDC_AUSD], [false], [false]]);
  });

  it("translates ordered Changes without reconstructing the planned path", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const secondTrade = tradeChange(MON_AUSD, 2n);
    const transfer = erc20Transfer(USDC_ADDRESS, ACCOUNT, KURU_ROUTER_ADDRESS, 1_000_000n);
    const firstTrade = tradeChange(MON_USDC, 1n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    const changes = [secondTrade, transfer, firstTrade, router] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "swap",
      protocol: "kuru",
      sender: ACCOUNT,
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1000000",
      amountOut: "1200000",
    });
    expect(receipt.changes[1]).toMatchObject({
      kind: "receipt",
      outcome: [
        {
          operation: "transfer",
          token: USDC_ADDRESS,
          from: ACCOUNT,
          to: KURU_ROUTER_ADDRESS,
          amount: "1000000",
        },
      ],
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("represents FlipOrderUpdated before its market Trade", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const flip = flipOrderUpdatedChange(MON_USDC, 7n, 30n);
    const trade = tradeChange(MON_USDC, 7n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);
    const changes = [flip, trade, router] as const;

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `Flip Order Updated: order 7 has size 30 emitted by ${MON_USDC}`,
      data: {
        event: "FlipOrderUpdated",
        emitter: MON_USDC,
        orderId: "7",
        size: "30",
      },
    });
    const first = receipt.changes[0];
    if (!first) throw new Error("expected flip-order ReceiptChange");
    expect(receipt.changes.map(firstChange)).toEqual(changes);
    expect(firstChange(first)).toBe(flip);
  });

  it("represents FlippedOrderCreated before its market Trade", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const flipped = flippedOrderCreatedChange(MON_USDC);
    const trade = tradeChange(MON_USDC, 11n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);
    const changes = [flipped, trade, router] as const;

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `Flipped Order Created: order ID 11, flipped ID 12, owner ${ACCOUNT}; size 30, price 40, flipped price 50, is buy true, emitted by ${MON_USDC}`,
      data: {
        event: "FlippedOrderCreated",
        emitter: MON_USDC,
        orderId: "11",
        flippedId: "12",
        owner: ACCOUNT,
        size: "30",
        price: "40",
        flippedPrice: "50",
        isBuy: true,
      },
    });
    const first = receipt.changes[0];
    if (!first) throw new Error("expected flipped-order ReceiptChange");
    expect(receipt.changes.map(firstChange)).toEqual(changes);
    expect(firstChange(first)).toBe(flipped);
  });

  it("accepts multiple adjacent flip-order and Trade pairs", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const firstFlip = flipOrderUpdatedChange(MON_USDC, 7n, 30n);
    const firstTrade = tradeChange(MON_USDC, 8n);
    const secondFlip = flippedOrderCreatedChange(MON_AUSD);
    const secondTrade = tradeChange(MON_AUSD, 11n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);
    const changes = [firstFlip, firstTrade, secondFlip, secondTrade, router] as const;

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.changes.map(firstChange)).toEqual([
      firstFlip,
      firstTrade,
      secondFlip,
      secondTrade,
      router,
    ]);
  });

  it("rejects a flip-order event followed by a Trade from another market", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const flip = flipOrderUpdatedChange(MON_USDC, 7n, 30n);
    const otherTrade = tradeChange(MON_AUSD, 7n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    expect(() => registry.parseReceipt(capability, [flip, otherTrade, router])).toThrow(
      "requires an immediately following Router Trade from the same market",
    );
  });

  it("rejects Trade before its flip-order event", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const trade = tradeChange(MON_USDC, 8n);
    const flip = flipOrderUpdatedChange(MON_USDC, 7n, 30n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    expect(() => registry.parseReceipt(capability, [trade, flip, router])).toThrow(
      "requires an immediately following Router Trade from the same market",
    );
  });

  it("rejects an unrelated Change between a flip-order event and Trade", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const flip = flipOrderUpdatedChange(MON_USDC, 7n, 30n);
    const transfer = erc20Transfer(USDC_ADDRESS, ACCOUNT, KURU_ROUTER_ADDRESS, 1n);
    const trade = tradeChange(MON_USDC, 8n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    expect(() => registry.parseReceipt(capability, [flip, transfer, trade, router])).toThrow(
      "requires an immediately following Router Trade from the same market",
    );
  });

  it("rejects an isolated flip-order event", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const flip = flippedOrderCreatedChange(MON_USDC);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    expect(() => registry.parseReceipt(capability, [flip, router])).toThrow(
      "requires an immediately following Router Trade from the same market",
    );
  });

  it("rejects crossed flip-order and Trade pairs", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const firstFlip = flipOrderUpdatedChange(MON_USDC, 7n, 30n);
    const secondTrade = tradeChange(MON_AUSD, 11n);
    const secondFlip = flippedOrderCreatedChange(MON_AUSD);
    const firstTrade = tradeChange(MON_USDC, 8n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    expect(() =>
      registry.parseReceipt(capability, [firstFlip, secondTrade, secondFlip, firstTrade, router]),
    ).toThrow("requires an immediately following Router Trade from the same market");
  });

  it("continues to reject unrelated OrderBook events", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const order = orderCreatedChange(MON_USDC);

    expect(() => registry.parseReceipt(capability, [order])).toThrow(
      "Unexpected Change: Kuru market emitted OrderCreated",
    );
  });

  it("rejects API markets that the Router does not verify", async () => {
    const unverified = { ...MARKETS[0], verified: false } as MockMarket;
    const { registry } = offlineRegistry([unverified]);
    await expect(
      registry.action("kuru", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow(`unverified market ${unverified.address}`);
  });

  it("rejects unsafe token precision from a verified market", async () => {
    const invalidDecimals = { ...MARKETS[0], baseDecimals: 256 } as MockMarket;
    const { registry } = offlineRegistry([invalidDecimals]);
    await expect(
      registry.action("kuru", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("invalid base token decimals");
  });

  it("bounds Kuru market discovery response size from content-length", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response("{}", { status: 200, headers: { "content-length": "1000001" } }),
    );
    const { registry } = offlineRegistry([], fetchMock);

    await expect(
      registry.action("kuru", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("response is too large");
  });

  it("accepts a Kuru market discovery response at the exact byte limit", async () => {
    const prefix = '{"data":[],"padding":"';
    const suffix = '"}';
    const body = `${prefix}${"x".repeat(1_000_000 - prefix.length - suffix.length)}${suffix}`;
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(body, { status: 200 }),
    );
    const { registry } = offlineRegistry([], fetchMock);

    await expect(
      registry.action("kuru", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("no verified Kuru market path");
  });

  it("bounds Kuru market discovery response size from the body", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response("x".repeat(1_000_001), { status: 200 }),
    );
    const { registry } = offlineRegistry([], fetchMock);

    await expect(
      registry.action("kuru", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("response is too large");
  });

  it("bounds the number of Kuru market candidates before on-chain verification", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ data: Array.from({ length: 257 }, () => ({})) }), {
          status: 200,
        }),
    );
    const { registry } = offlineRegistry([], fetchMock);

    await expect(
      registry.action("kuru", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("too many markets");
  });

  it("accepts the exact Kuru market candidate limit", async () => {
    const directMarket = MARKETS[0];
    if (!directMarket) throw new Error("expected direct market fixture");
    const candidate = {
      market: directMarket.address,
      baseasset: directMarket.base,
      quoteasset: directMarket.quote,
    };
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ data: Array.from({ length: 256 }, () => candidate) }), {
          status: 200,
        }),
    );
    const { registry } = offlineRegistry([directMarket], fetchMock);

    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });

    expect(quote.kind).toBe("query");
  });

  it("accepts the exact Kuru market route limit", async () => {
    const { registry } = offlineRegistry(viaMonMarkets(16, 16));

    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });

    expect(quote.kind).toBe("query");
  });

  it("bounds via-MON route combinations before quoting", async () => {
    const { registry } = offlineRegistry(viaMonMarkets(16, 16, true));

    await expect(
      registry.action("kuru", "quote", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("too many Kuru market routes");
  });

  it("times out Kuru market discovery", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        }),
    );
    const { registry } = offlineRegistry([], fetchMock);

    const quote = registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    const assertion = expect(quote).rejects.toThrow("timed out after 10000ms");
    await vi.advanceTimersByTimeAsync(10_000);

    await assertion;
  });

  // ── Quote failure provenance (issue #161) ────────────────────────────────

  it("separates no-positive-quote from an incomplete comparison on exact input", async () => {
    // Priced so far out that the quote rounds to zero. A zero numerator would divide by zero
    // inside the mock instead, which is a broken market, not an unquotable one.
    const DUST = 10n ** 30n;
    const zeroRoutes = [market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, DUST)];
    const { registry } = offlineRegistry(zeroRoutes);
    const zeroError = await quoteError(registry, { amountIn: "1" });
    expect(zeroError).toBeInstanceOf(KuruQuoteError);
    expect(zeroError.code).toBe("NO_POSITIVE_QUOTE");
    expect(zeroError.side).toBe("amountIn");
    // Every route completed, so nothing is unavailable: this is an answer, not a gap.
    expect(zeroError.unavailable).toEqual([]);

    const { registry: rejecting } = offlineRegistry(
      zeroRoutes.map((m) => ({ ...m, quoteFails: true })),
    );
    const rejectError = await quoteError(rejecting, { amountIn: "1" });
    expect(rejectError.code).toBe("ROUTE_QUOTE_UNAVAILABLE");
    // The provenance survives: each failed evaluation is retained, and the first is the cause.
    expect(rejectError.unavailable.length).toBeGreaterThan(0);
    expect(rejectError.cause).toBe(rejectError.unavailable[0]?.error);
    expect(String(rejectError.unavailable[0]?.error.message)).toContain("quote unavailable");
    // The failed candidate is named, not just counted: the same human-readable path a
    // successful quote returns.
    expect(rejectError.unavailable[0]?.path).toEqual([USDC_ADDRESS, AUSD_ADDRESS]);

    // A mixture is not "all zero": one route quoted nothing, the other was never compared, so
    // the honest answer is that the comparison is incomplete. Two direct markets, so there are
    // genuinely two routes to disagree about.
    const { registry: mixed } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, DUST),
      {
        ...market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n),
        quoteFails: true,
      },
    ]);
    expect((await quoteError(mixed, { amountIn: "1" })).code).toBe("ROUTE_QUOTE_UNAVAILABLE");
  });

  it("selects a quoted route when another evaluation did not complete", async () => {
    // Deliberately NOT fail-closed. The issue leaves this to the maintainer, so the reasoning
    // is recorded here rather than assumed: refusing is safer in principle, since the route that
    // failed might have won. Measured against mainnet USDC/AUSD (15 discovered routes, ~800
    // eth_calls per target-output quote), 25 of those calls failed when issued at full fan-out —
    // but 22 were self-inflicted rate-limiting: capping in-flight calls at 4 removed them, and a
    // single retry absorbed the rest of that class. What survives batching and retry is 3 markets
    // that revert deterministically with no revert data, in every run. Those are unclassifiable
    // by construction, so refusing on them would make a liquid pair permanently unquotable for a
    // reason no caller can act on. Selection is therefore left as upstream had it, and the
    // partiality is reported instead of hidden — which is what the issue actually asks for.
    const { registry } = offlineRegistry([
      market(MON_USDC, ZERO, USDC_ADDRESS, 18, 6, 1n, 1n),
      { ...market(MON_AUSD, ZERO, AUSD_ADDRESS, 18, 6, 6n, 5n), quoteFails: true },
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
    ]);
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    // The point of the whole issue: the caller is told the comparison was partial, and which
    // candidate went unmeasured, instead of receiving a winner that looks exhaustive.
    const data = quote.data as KuruQuote & { estimatedAmountOut: string; path: readonly string[] };
    expect(data.unavailable).toEqual([
      { path: [USDC_ADDRESS, NATIVE, AUSD_ADDRESS], reason: "unknown" },
    ]);
    // The route that priced is the one returned, at its own price. Without this the test passes
    // whichever candidate wins, and the selection it is named for goes unguarded.
    expect(data.path).toEqual([USDC_ADDRESS, AUSD_ADDRESS]);
    expect(data.estimatedAmountOut).toBe("1.05");
  });

  it("separates an unsatisfiable target from an incomplete comparison", async () => {
    const DUST = 10n ** 30n;
    const unreachable = [market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, DUST)];
    const { registry } = offlineRegistry(unreachable);
    const unsatisfiable = await quoteError(registry, { amountOut: "1" });
    expect(unsatisfiable.code).toBe("TARGET_OUTPUT_UNSATISFIABLE");
    expect(unsatisfiable.side).toBe("amountOut");

    const { registry: rejecting } = offlineRegistry(
      unreachable.map((m) => ({ ...m, quoteFails: true })),
    );
    const unavailable = await quoteError(rejecting, { amountOut: "1" });
    expect(unavailable.code).toBe("ROUTE_QUOTE_UNAVAILABLE");
    expect(unavailable.unavailable.length).toBeGreaterThan(0);
  });

  it("selects a target-output route when another evaluation did not complete", async () => {
    // The case the whole partial-selection argument is about, on the side the measurement came
    // from. One route prices, one never finishes; the priced one is still returned.
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
      {
        ...market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 11n, 10n),
        quoteFails: true,
      },
    ]);
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    const data = quote.data as KuruQuote & { estimatedAmountIn: string; path: readonly string[] };
    expect(data.unavailable.map((entry) => entry.path)).toEqual([[USDC_ADDRESS, AUSD_ADDRESS]]);
    // Assert the winner and the amount, not merely that a gap was reported: without this the test
    // passes whichever candidate is selected, and the selection it is named for goes unguarded.
    expect(data.path).toEqual([USDC_ADDRESS, AUSD_ADDRESS]);
    expect(data.estimatedAmountIn).toBe("0.952381");
  });

  it("never reads a failed call as an exhausted range", async () => {
    // A call that reverted, timed out or never left the client establishes nothing about what the
    // market can price. Calling any of them "unsatisfiable" is the failure this change exists to
    // prevent, and it is worse than a gap: it is a definitive answer drawn from no measurement.
    const routes = [market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n)];
    for (const name of ["CallExecutionError", "ExecutionRevertedError", "HttpRequestError"]) {
      const { registry } = offlineRegistry(
        routes.map((m) => ({ ...m, quoteFails: true, quoteFailName: name })),
      );
      const error = await quoteError(registry, { amountOut: "1" });
      expect(error.code, `${name} must not be read as an exhausted range`).toBe(
        "ROUTE_QUOTE_UNAVAILABLE",
      );
    }
  });

  it("comes down through a market Panic instead of reading it as the range being exhausted", async () => {
    // A `Panic(0x11)` is the market's own arithmetic giving out at the size we asked for. It says
    // nothing about smaller sizes, and the opening guess assumes a 1:1 price, so it is routinely
    // far above where the answer lives. Concluding from it reported an unreachable target — and,
    // when a worse route happened to price, quietly billed the caller the worse route's amount.
    const PANIC_OVERFLOW = `0x4e487b71${17n.toString(16).padStart(64, "0")}`;
    const gives = {
      // Ten units out per unit in, so 1000 out costs 100 — but it panics above 500.
      ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 10n, 1n),
      failAbove: 500_000_000n,
      quoteFailName: "CallExecutionError",
      quoteFailData: PANIC_OVERFLOW,
    };
    const alone = offlineRegistry([gives]);
    const priced = await alone.registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1000",
    });
    if (priced.kind !== "query") throw new Error("expected query");
    expect((priced.data as { estimatedAmountIn: string }).estimatedAmountIn).toBe("100");

    // And beside a route that does price, the cheap one must still win rather than drop out
    // silently and leave the expensive answer looking like a complete comparison.
    const beside = offlineRegistry([
      market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n),
      gives,
    ]);
    const compared = await beside.registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1000",
    });
    if (compared.kind !== "query") throw new Error("expected query");
    const data = compared.data as KuruQuote & { estimatedAmountIn: string };
    expect(data.estimatedAmountIn).toBe("100");
    expect(data.unavailable).toHaveLength(0);
  });

  it("does not descend through a revert that attributes nothing to the market", async () => {
    // An empty revert is what a paused market, a failed require and a provider gas cap all look
    // like. There is no threshold to find under it, so the honest report is an unmeasured route
    // rather than a paid sweep down through sizes that will fail for the same reason.
    for (const data of ["0x", `0x4e487b71${1n.toString(16).padStart(64, "0")}`]) {
      const { registry } = offlineRegistry([
        {
          ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n),
          quoteFails: true,
          quoteFailName: "CallExecutionError",
          quoteFailData: data,
        },
      ]);
      const error = await quoteError(registry, { amountOut: "1" });
      expect(error.code, `revert data ${data} must not be read as an exhausted range`).toBe(
        "ROUTE_QUOTE_UNAVAILABLE",
      );
    }
  });

  it("keeps an unexplained market refusal as a gap, not an answer", async () => {
    // A route that rejects during the reverse search is reported as an incomplete comparison,
    // not as "the target cannot be reached". An eth_call reverts for a paused market, a failed
    // require or the provider's own gas cap, and none of those establish anything about the
    // priceable range — claiming otherwise would state a definitive no from no evidence, which
    // is the failure this change exists to prevent.
    const { registry } = offlineRegistry([
      { ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n), quoteFails: true },
    ]);
    const error = await quoteError(registry, { amountOut: "1" });
    expect(error.code).toBe("ROUTE_QUOTE_UNAVAILABLE");
    expect(error.unavailable.length).toBe(1);
    // The provenance survives rather than being counted and discarded.
    expect(error.cause).toBe(error.unavailable[0]?.error);
  });

  it("reports a stable category, never the underlying message, so an endpoint key cannot leak", async () => {
    // viem puts the RPC URL and the request body into HttpRequestError.message, and strips only the
    // userinfo — a hosted endpoint keeps its API key in the path. Copying the message would publish
    // that key through any successful quote that had a gap beside it.
    const SECRET = "https://rpc.example/v2/SUPERSECRETKEY";
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
      {
        ...market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 11n, 10n),
        quoteFails: true,
        quoteFailName: "HttpRequestError",
        quoteFailMessage: `HTTP request failed.\n\nURL: ${SECRET}\nRequest body: {"method":"eth_call"}`,
      },
    ]);
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    const data = quote.data as KuruQuote;
    expect(data.unavailable).toHaveLength(1);
    expect(data.unavailable[0]?.reason).toBe("transport");

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("SUPERSECRETKEY");
    expect(serialized).not.toContain("rpc.example");
    expect(serialized).not.toContain("Request body");
  });

  it("does not call a multi-leg encode refusal proof that the target is out of reach", async () => {
    // The opening guess assumes a 1:1 price. Here the first leg amplifies it past the second leg's
    // uint96 while a far smaller input already clears the target, so refusing on that probe would
    // report an unreachable target for a route that prices one seven orders of magnitude below.
    const amplifying = [
      market(MON_USDC, ZERO, USDC_ADDRESS, 18, 6, 1n, 10n ** 13n),
      market(MON_AUSD, ZERO, AUSD_ADDRESS, 18, 6, 1n, 1n),
    ];
    const { registry } = offlineRegistry(amplifying);

    const forward = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "0.000001",
    });
    if (forward.kind !== "query") throw new Error("expected query");
    expect(
      Number((forward.data as { estimatedAmountOut: string }).estimatedAmountOut),
    ).toBeGreaterThan(1);

    // The same route, asked in reverse for a target it clears easily.
    const reverse = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1",
    });
    expect(reverse.kind).toBe("query");
  });

  it("reports a multi-leg ceiling as unavailable, not as an unreachable target", async () => {
    // Doubling runs into the SECOND leg's size limit before the target is met: the first leg
    // amplifies the probe while the second prices it at almost nothing. We never sized that leg,
    // so the refusal proves nothing about the target — the honest answer is that the evaluation
    // did not complete, and calling it unsatisfiable would be a verdict we did not earn.
    const { registry } = offlineRegistry([
      market(MON_USDC, ZERO, USDC_ADDRESS, 18, 6, 1n, 10n ** 6n),
      market(MON_AUSD, ZERO, AUSD_ADDRESS, 18, 6, 1n, 10n ** 12n),
    ]);
    const failure = await quoteError(registry, { amountOut: "1" });
    expect(failure.code).toBe("ROUTE_QUOTE_UNAVAILABLE");
    expect(failure.unavailable.length).toBeGreaterThan(0);
  });

  it("still calls a single-leg encode refusal an unreachable target", async () => {
    // One leg is the case where the refusal does prove it: the probe IS the market's size argument,
    // the search is monotonic, and nothing larger can be priced.
    const DUST = 10n ** 30n;
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, DUST),
    ]);
    const failure = await quoteError(registry, { amountOut: "1" });
    expect(failure.code).toBe("TARGET_OUTPUT_UNSATISFIABLE");
  });

  it("refuses a swap built on a partial comparison, unless the caller opts out", async () => {
    const partial = [
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
      {
        ...market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 11n, 10n),
        quoteFails: true,
      },
    ];

    const { registry } = offlineRegistry(partial);
    // quote stays advisory: it answers, and says what it could not measure.
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect((quote.data as KuruQuote).unavailable.length).toBeGreaterThan(0);

    // the write refuses by default
    await expect(
      registry.action("kuru", "swap", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toMatchObject({ code: "ROUTE_QUOTE_UNAVAILABLE" });

    // and executes when the caller says so in as many words
    const { registry: opted } = offlineRegistry(partial);
    const capability = await opted.action("kuru", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
      requireExhaustive: false,
    });
    expect(capability.kind).toBe("capability");
  });

  it("refuses a target that rounds below the token's smallest unit", async () => {
    // PositiveDecimalString accepts "0.0000001", but USDC has six decimals, so the target parses to
    // zero — and a swap with a zero minimum output has no floor left to protect it. Both sides are
    // refused, each in its own terms: the input side has nothing to sell, the output side nothing
    // to ask for.
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
    ]);
    await expect(
      registry.action("kuru", "quote", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amountOut: "0.0000001",
      }),
    ).rejects.toThrow(/rounds to zero/);
    await expect(
      registry.action("kuru", "swap", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amountOut: "0.0000001",
      }),
    ).rejects.toThrow(/rounds to zero/);

    // The input side already refuses, because nothing can be sold.
    const noInput = await quoteError(registry, { amountIn: "0.0000001" });
    expect(noInput.code).toBe("NO_POSITIVE_QUOTE");
  });

  it("offers requireExhaustive on the write only, not on the advisory quote", async () => {
    // A parameter an Agent can see but that does nothing is worse than no parameter: `quote`
    // reports the gaps and answers regardless, so only `swap` carries the refusal switch.
    const { registry } = offlineRegistry();
    const [quoted, swapped] = registry.load([
      { protocol: "kuru", method: "quote" },
      { protocol: "kuru", method: "swap" },
    ]);
    expect(quoted?.params).not.toHaveProperty("requireExhaustive");
    expect(swapped?.params.requireExhaustive).toMatchObject({
      type: { type: "boolean", default: true },
    });
  });

  it("searches the band the opening guess jumped over, instead of concluding from below it", async () => {
    // Halving lands anywhere in the top half of the encodable range, and doubling from there goes
    // straight back to the size that already refused — so an answer sitting between the two is
    // never probed. It bites when the route's gain is small: at 1.2x the halved probe falls short
    // of the target while the ceiling clears it comfortably.
    const CEILING = 2n ** 96n - 1n;
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 6n, 5n),
    ]);
    // Just above what the market can encode, so the opening guess is refused outright.
    const target = formatUnits((CEILING * 11n) / 10n, 6);

    const reverse = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: target,
    });
    if (reverse.kind !== "query") throw new Error("expected query");
    // The answer is target/1.2, comfortably below the ceiling — the route prices it.
    expect(
      Number((reverse.data as { estimatedAmountIn: string }).estimatedAmountIn),
    ).toBeGreaterThan(0);
  });

  it("bounds the live calls spent coming down through a market that panics everywhere", async () => {
    // An encode refusal is free — viem never asks the chain — so coming down through those is
    // unbudgeted. A Panic is a real eth_call each time, and a market that refuses at every size
    // would turn one quote into a log2 sweep against the node, so the paid descent is bounded.
    // Running out of budget costs only what we can report: the route goes out as unmeasured.
    let calls = 0;
    const panicking = {
      ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 18, 18, 1n, 1n),
      quoteFails: true,
      quoteFailName: "ContractFunctionExecutionError",
      quoteFailData: `0x4e487b71${17n.toString(16).padStart(64, "0")}`,
    };
    const { registry } = offlineRegistry([panicking], marketDiscoveryFetch([panicking]), () => {
      calls += 1;
    });
    await quoteError(registry, { amountOut: "1000" });
    // Exactly the opening probe plus the paid budget; a looser bound would let the budget drift.
    expect(calls).toBe(1 + 6);
  });

  it("does not let a verification failure carry the endpoint out with it", async () => {
    // #verifyMarket is the one on-chain read outside the quoting path. It used to throw viem's
    // error straight through, and viem's message carries the RPC URL and the request body — the
    // same disclosure the reported gaps were sanitized to prevent, reached through discovery.
    const SECRET = "https://rpc.example/v2/SUPERSECRETKEY";
    const markets = [market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n)];
    const { registry } = offlineRegistry(markets, marketDiscoveryFetch(markets), undefined, () => {
      const failure = new Error(
        `HTTP request failed.\n\nURL: ${SECRET}\nRequest body: {"method":"eth_call"}`,
      );
      failure.name = "HttpRequestError";
      throw failure;
    });
    const failed = await registry
      .action("kuru", "quote", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amountIn: "1",
      })
      .then(
        () => null,
        (error: Error) => error,
      );
    expect(failed).toBeInstanceOf(Error);
    expect(failed?.message).not.toContain("SUPERSECRETKEY");
    expect(failed?.message).not.toContain("rpc.example");
    expect(failed?.message).toMatch(/verification could not be completed/);
    expect(failed?.message).toContain("transport");
  });

  it("finds the transport failure nested under viem's outer wrappers", async () => {
    // viem does not throw the transport error directly: it arrives as the cause of a
    // ContractFunctionExecutionError, whose own name says nothing about why the call failed.
    // Reading only the top-level name files every network failure under "unknown".
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
      {
        ...market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 11n, 10n),
        quoteFails: true,
        quoteFailName: "HttpRequestError",
        quoteFailDepth: 3,
      },
    ]);
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect((quote.data as KuruQuote).unavailable[0]?.reason).toBe("transport");
  });

  it("separates a reverting market from one that could not be reached", async () => {
    // A revert is the market answering — the caller can act on it. A transport failure is the
    // caller's own link. Collapsing both into one category loses the only distinction that
    // tells an Agent whether retrying is worth anything.
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
      {
        ...market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 11n, 10n),
        quoteFails: true,
        quoteFailName: "ExecutionRevertedError",
      },
    ]);
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect((quote.data as KuruQuote).unavailable[0]?.reason).toBe("reverted");
  });

  it("names a probe past the encodable size as such, not as an unknown failure", async () => {
    // The search's own refusal to encode is the one gap that is not the market's fault at all, and
    // the only one a caller can act on by asking for less. Reporting it as "unknown" hides that.
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
      market(MON_USDC, ZERO, USDC_ADDRESS, 18, 6, 1n, 10n ** 6n),
      market(MON_AUSD, ZERO, AUSD_ADDRESS, 18, 6, 1n, 10n ** 12n),
    ]);
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    const gaps = (quote.data as KuruQuote).unavailable;
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.map((gap) => gap.reason)).toContain("unencodable-probe");
  });

  it("prices the band above a doubling step the argument type would refuse", async () => {
    // Doubling can step straight past the largest size the market can be asked for. The step is
    // refused, and reading that refusal as a verdict reports an unreachable target for a route
    // whose answer sits between the last priced size and the type's ceiling.
    const CEILING = 2n ** 96n - 1n;
    const { registry } = offlineRegistry([
      // Four out per five in, so the input needed exceeds the target and the search has to climb.
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 4n, 5n),
    ]);
    const target = (CEILING * 6n) / 10n;
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: formatUnits(target, 6),
    });
    if (quote.kind !== "query") throw new Error("expected query");
    const needed = parseUnits((quote.data as { estimatedAmountIn: string }).estimatedAmountIn, 6);
    // 0.75 of the ceiling: encodable, and reachable only if that band was actually searched.
    expect(needed).toBeLessThanOrEqual(CEILING);
    expect((needed * 4n) / 5n).toBeGreaterThanOrEqual(target);
  });

  it("keeps the live errors off anything that serializes the thrown error", async () => {
    // The categories protect the success path. The thrown error still carries the real viem
    // errors, so it is the property descriptors that keep an endpoint key out of a log line: one
    // plain class field instead, and every consumer that stringifies an error publishes it.
    const SECRET = "https://rpc.example/v2/SUPERSECRETKEY";
    const { registry } = offlineRegistry([
      {
        ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n),
        quoteFails: true,
        quoteFailName: "HttpRequestError",
        quoteFailMessage: `HTTP request failed.\n\nURL: ${SECRET}`,
      },
    ]);
    const error = await quoteError(registry, { amountIn: "1" });
    expect(Object.prototype.propertyIsEnumerable.call(error, "unavailable")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(error, "cause")).toBe(false);
    expect(JSON.stringify(error)).not.toContain("SUPERSECRETKEY");
    // Positive control: non-enumerable is not gone — debugging still reaches the live error.
    expect(error.unavailable[0]?.error.message).toContain("SUPERSECRETKEY");
  });

  it("reports every gap, and keeps the first one as the cause", async () => {
    // Two candidates fail. Reporting one, or attaching whichever happened to be last, loses the
    // provenance this change exists to carry.
    const { registry } = offlineRegistry([
      { ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n), quoteFails: true },
      {
        ...market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n),
        quoteFails: true,
      },
    ]);
    const error = await quoteError(registry, { amountIn: "1" });
    expect(error.unavailable).toHaveLength(2);
    expect(error.cause).toBe(error.unavailable[0]?.error);
    expect(error.unavailable[0]?.error.message).toContain(DIRECT_USDC_AUSD.toLowerCase());
  });

  it("refuses a partial comparison on a native swap, not only on a token one", async () => {
    // The native path builds a different Capability, so a guard placed on the token path only
    // would leave the most common entry point — spending MON itself — as the way around it.
    const markets = [
      market(MON_AUSD, ZERO, AUSD_ADDRESS, 18, 6, 1n, 1n),
      { ...market(MON_USDC, ZERO, AUSD_ADDRESS, 18, 6, 11n, 10n), quoteFails: true },
    ];
    const { registry } = offlineRegistry(markets);
    const refused = await registry
      .action("kuru", "swap", ACCOUNT, { tokenIn: NATIVE, tokenOut: AUSD_ADDRESS, amountIn: "1" })
      .then(
        () => null,
        (error: Error) => error,
      );
    expect(refused).toBeInstanceOf(KuruQuoteError);
    expect((refused as KuruQuoteError).code).toBe("ROUTE_QUOTE_UNAVAILABLE");
    // And the opt-out still works from the native side.
    const built = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
      requireExhaustive: false,
    });
    expect(built.kind).toBe("capability");
  });

  it("reads a Panic that arrives wrapped, and nested under viem's outer errors", async () => {
    // viem hands revert data back either as the hex or a level down, and the transport error is
    // itself nested under a ContractFunctionExecutionError. The search authenticates the Panic to
    // decide whether coming down is worth live calls, so reading only the flat form on the
    // outermost error would turn a searchable market into an unmeasured one, on those providers
    // only — the shape that never shows up in a test written against one of them.
    const PANIC = `0x4e487b71${17n.toString(16).padStart(64, "0")}`;
    const { registry } = offlineRegistry([
      {
        ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 10n, 1n),
        failAbove: 500_000_000n,
        quoteFailName: "CallExecutionError",
        quoteFailData: PANIC,
        quoteFailDataNested: true,
        quoteFailDepth: 2,
      },
    ]);
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1000",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect((quote.data as { estimatedAmountIn: string }).estimatedAmountIn).toBe("100");
  });

  it("survives revert data that is the right shape but not hex", async () => {
    // The payload comes from the provider and is parsed inside the reverse search's catch block,
    // so an unchecked parse throws our own SyntaxError from within the handler. The quote still
    // fails, which is why this is invisible from the outside — but the market's refusal, the one
    // thing worth reporting about it, has been replaced by ours.
    const { registry } = offlineRegistry([
      {
        ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 1n, 1n),
        quoteFails: true,
        quoteFailName: "CallExecutionError",
        quoteFailData: `0x4e487b71${"z".repeat(64)}`,
      },
    ]);
    const failed = await quoteError(registry, { amountOut: "1" });
    expect(failed.code).toBe("ROUTE_QUOTE_UNAVAILABLE");
    expect(failed.unavailable[0]?.error.name).toBe("CallExecutionError");
    expect(failed.unavailable[0]?.error.name).not.toBe("SyntaxError");
  });

  it("comes down only for the overflow panic, not for any panic or any revert", async () => {
    // The descent exists because `Panic(0x11)` means the size overflowed the market's own
    // arithmetic, so a smaller one may work. No other failure carries that meaning: an assert
    // (0x01), a division by zero (0x12) or a paused market's custom error say nothing about size,
    // and spending live calls coming down through them buys nothing. The distinction is invisible
    // when the market refuses at every size — both paths end in the same report — so it is drawn
    // here against a market that prices below a threshold and refuses above it.
    const OVERFLOW = `0x4e487b71${17n.toString(16).padStart(64, "0")}`;
    const ASSERT = `0x4e487b71${1n.toString(16).padStart(64, "0")}`;
    // Deliberately carrying the same trailing word as the overflow panic: if the selector is not
    // checked, a paused market's custom error reads as one, and the search pays to come down
    // through a failure that has nothing to do with size.
    const CUSTOM = `0xdeadbeef${17n.toString(16).padStart(64, "0")}`;
    const priced = async (data: string) => {
      const { registry } = offlineRegistry([
        {
          ...market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 10n, 1n),
          failAbove: 500_000_000n,
          quoteFailName: "CallExecutionError",
          quoteFailData: data,
        },
      ]);
      return await registry
        .action("kuru", "quote", ACCOUNT, {
          tokenIn: USDC_ADDRESS,
          tokenOut: AUSD_ADDRESS,
          amountOut: "1000",
        })
        .then(
          (quote) =>
            quote.kind === "query"
              ? (quote.data as { estimatedAmountIn: string }).estimatedAmountIn
              : null,
          () => null,
        );
    };
    // The one refusal that justifies searching below it.
    expect(await priced(OVERFLOW)).toBe("100");
    // Everything else stops at the first refusal and is reported, not searched through.
    expect(await priced(ASSERT)).toBeNull();
    expect(await priced(CUSTOM)).toBeNull();
  });

  it("keeps an RPC error response in the transport category, not in unknown", async () => {
    // viem chains every JSON-RPC error response under RpcRequestError, including the 429 the
    // default endpoint returns after a few dozen sequential calls. Reading that as "unknown" would
    // hide the likeliest real gap on the default configuration.
    const { registry } = offlineRegistry([
      market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
      {
        ...market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 11n, 10n),
        quoteFails: true,
        quoteFailName: "RpcRequestError",
      },
    ]);
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect((quote.data as KuruQuote).unavailable[0]?.reason).toBe("transport");
  });

  it("reports no verified route separately from a quote failure", async () => {
    // Discovery finished and produced nothing: a different claim from any quote outcome.
    // A market that exists but connects neither leg of the requested pair, so discovery
    // completes and finds no path. (An unverified market is a different, harder failure —
    // covered by the existing verification test.)
    const { registry } = offlineRegistry([market(MON_USDC, ZERO, USDC_ADDRESS, 18, 6, 1n, 1n)]);
    const error = await quoteError(registry, { amountIn: "1" });
    expect(error.code).toBe("NO_VERIFIED_ROUTE");
    expect(error.unavailable).toEqual([]);
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Kuru mainnet", () => {
  it("has deployed Router bytecode and dynamically quotes a market", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    expect(
      (await runtime.client.getCode({ address: KURU_ROUTER_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
    const quote = await new Registry(runtime).use(Kuru).action("kuru", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toMatchObject({ amountSide: "amountIn", amountIn: "1" });
  });

  it("simulates a native swap into an exhaustive typed Receipt", { timeout: 180_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Kuru);
    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "swap",
      protocol: "kuru",
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
    });
  });
});

async function swapCapability(registry: Registry) {
  const capability = await registry.action("kuru", "swap", ACCOUNT, {
    tokenIn: USDC_ADDRESS,
    tokenOut: AUSD_ADDRESS,
    amountIn: "1",
  });
  if (capability.kind !== "capability") throw new Error("expected capability");
  return capability;
}

/** viem nests: the real failure is the cause of an outer error whose name explains nothing. */
function nest(error: Error, depth: number): Error {
  let thrown = error;
  for (let level = 0; level < depth; level += 1) {
    const outer = new Error("Contract function reverted or failed.");
    outer.name = "ContractFunctionExecutionError";
    (outer as { cause?: unknown }).cause = thrown;
    thrown = outer;
  }
  return thrown;
}

function offlineRegistry(
  markets: readonly MockMarket[] = MARKETS,
  fetchMock = marketDiscoveryFetch(markets),
  /** Called for every simulated eth_call, so a test can count what a search actually costs. */
  onCall: () => void = () => {},
  /** Called before the Router's verifiedMarket read, so a test can fail discovery itself. */
  onVerify: () => void = () => {},
) {
  const byAddress = new Map(markets.map((entry) => [entry.address.toLowerCase(), entry]));
  vi.stubGlobal("fetch", fetchMock);
  const client = {
    readContract: async ({
      functionName,
      args,
    }: {
      functionName: string;
      args: readonly unknown[];
    }) => {
      if (functionName !== "verifiedMarket") throw new Error(`unexpected read ${functionName}`);
      onVerify();
      const entry = byAddress.get(String(args[0]).toLowerCase());
      if (!entry) throw new Error(`unknown market ${String(args[0])}`);
      if (entry.verified === false) return [0, 0n, ZERO, 0n, ZERO, 0n, 0, 0n, 0n, 0n, 0n];
      return [
        10 ** entry.quoteDecimals,
        10n ** BigInt(entry.baseDecimals),
        entry.base,
        BigInt(entry.baseDecimals),
        entry.quote,
        BigInt(entry.quoteDecimals),
        0,
        0n,
        0n,
        0n,
        0n,
      ];
    },
    call: async ({ to, account, data }: { to: string; account: string; data: Hex }) => {
      onCall();
      const entry = byAddress.get(to.toLowerCase());
      if (!entry) throw new Error(`unexpected call ${to}`);
      if (entry.failAbove !== undefined) {
        const asked = decodeFunctionData({ abi: KuruOrderbookAbi, data }).args[0] as bigint;
        if (asked > entry.failAbove) {
          const refusal = new Error("execution reverted") as Error;
          refusal.name = entry.quoteFailName ?? "CallExecutionError";
          if (entry.quoteFailData) {
            (refusal as { data?: unknown }).data = entry.quoteFailDataNested
              ? { data: entry.quoteFailData }
              : entry.quoteFailData;
          }
          throw nest(refusal, entry.quoteFailDepth ?? 0);
        }
      }
      if (entry.quoteFails) {
        // Some tests need a specific error shape, because the classifier keys on viem's error
        // names — a plain Error would let it accept anything a failed call throws.
        const failure = new Error(
          entry.quoteFailMessage ?? `quote unavailable for ${entry.address}`,
        ) as Error & {
          data?: string;
        };
        if (entry.quoteFailName) failure.name = entry.quoteFailName;
        if (entry.quoteFailData) {
          (failure as { data?: unknown }).data = entry.quoteFailDataNested
            ? { data: entry.quoteFailData }
            : entry.quoteFailData;
        }
        throw nest(failure, entry.quoteFailDepth ?? 0);
      }
      const decoded = decodeFunctionData({ abi: KuruOrderbookAbi, data });
      if (
        decoded.functionName !== "placeAndExecuteMarketBuy" &&
        decoded.functionName !== "placeAndExecuteMarketSell"
      ) {
        throw new Error(`unexpected call ${decoded.functionName}`);
      }
      if (
        decoded.functionName === "placeAndExecuteMarketBuy" &&
        account.toLowerCase() !== ZERO.toLowerCase()
      ) {
        throw new Error("Kuru quotes must use the zero-address preview sender");
      }
      const size = decoded.args[0];
      const result =
        decoded.functionName === "placeAndExecuteMarketBuy"
          ? convertUnits(
              size,
              entry.quoteDecimals,
              entry.baseDecimals,
              entry.buyNumerator,
              entry.buyDenominator,
            )
          : convertUnits(
              size,
              entry.baseDecimals,
              entry.quoteDecimals,
              entry.sellNumerator,
              entry.sellDenominator,
            );
      return {
        data: encodeFunctionResult({
          abi: KuruOrderbookAbi,
          functionName: decoded.functionName,
          result,
        }),
      };
    },
  } as unknown as MossRuntime["client"];
  return {
    registry: new Registry({ rpcUrl: "http://offline", client }).use(Kuru),
    fetchMock,
  };
}

/**
 * Run a quote and return the KuruQuoteError it rejects with.
 *
 * Fails the test if the call succeeds, so a test that expects a refusal cannot pass because the
 * refusal quietly turned into a quote.
 */
async function quoteError(
  registry: ReturnType<typeof offlineRegistry>["registry"],
  amount: { amountIn: string } | { amountOut: string },
): Promise<KuruQuoteError> {
  try {
    await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      ...amount,
    });
  } catch (error) {
    if (error instanceof KuruQuoteError) return error;
    throw error;
  }
  throw new Error("expected the quote to be refused");
}

function marketDiscoveryFetch(markets: readonly MockMarket[]) {
  return vi.fn(
    async (_input: string | URL | Request, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          data: markets.map(({ address, base, quote }) => ({
            market: address,
            baseasset: base,
            quoteasset: quote,
          })),
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  );
}

function market(
  address: `0x${string}`,
  base: `0x${string}`,
  quote: `0x${string}`,
  baseDecimals: number,
  quoteDecimals: number,
  sellNumerator: bigint,
  sellDenominator: bigint,
): MockMarket {
  return {
    address,
    base,
    quote,
    baseDecimals,
    quoteDecimals,
    sellNumerator,
    sellDenominator,
    buyNumerator: sellDenominator,
    buyDenominator: sellNumerator,
  };
}

function viaMonMarkets(
  firstCount: number,
  secondCount: number,
  includeDirect = false,
): MockMarket[] {
  const firstLegs = Array.from({ length: firstCount }, (_, index) =>
    market(
      getAddress(`0x${(index + 100).toString(16).padStart(40, "0")}`),
      USDC_ADDRESS,
      ZERO,
      6,
      18,
      1n,
      1n,
    ),
  );
  const secondLegs = Array.from({ length: secondCount }, (_, index) =>
    market(
      getAddress(`0x${(index + 200).toString(16).padStart(40, "0")}`),
      ZERO,
      AUSD_ADDRESS,
      18,
      6,
      1n,
      1n,
    ),
  );
  const direct = includeDirect
    ? [
        market(
          getAddress(`0x${(300).toString(16).padStart(40, "0")}`),
          USDC_ADDRESS,
          AUSD_ADDRESS,
          6,
          6,
          1n,
          1n,
        ),
      ]
    : [];
  return [...direct, ...firstLegs, ...secondLegs];
}

function convertUnits(
  amount: bigint,
  fromDecimals: number,
  toDecimals: number,
  numerator: bigint,
  denominator: bigint,
) {
  return (
    (amount * 10n ** BigInt(toDecimals) * numerator) / (10n ** BigInt(fromDecimals) * denominator)
  );
}

function firstChange(entry: ReceiptResult["changes"][number]): Change {
  if (entry.kind === "change") return entry.change;
  const [child] = entry.changes;
  if (child?.kind !== "change") throw new Error("expected one nested ReceiptChange");
  return child.change;
}

function tradeChange(address: `0x${string}`, orderId: bigint): Change {
  return eventChange(
    address,
    KuruOrderbookAbi,
    "Trade",
    [orderId, ACCOUNT, false, 10n, 0n, KURU_ROUTER_ADDRESS, ACCOUNT, 20n],
    ["uint40", "address", "bool", "uint256", "uint96", "address", "address", "uint96"],
  );
}

function flipOrderUpdatedChange(address: `0x${string}`, orderId: bigint, size: bigint): Change {
  return eventChange(
    address,
    KuruOrderbookAbi,
    "FlipOrderUpdated",
    [orderId, size],
    ["uint40", "uint96"],
  );
}

function flippedOrderCreatedChange(address: `0x${string}`): Change {
  return eventChange(
    address,
    KuruOrderbookAbi,
    "FlippedOrderCreated",
    [11n, 12n, ACCOUNT, 30n, 40n, 50n, true],
    ["uint40", "uint40", "address", "uint96", "uint32", "uint32", "bool"],
  );
}

function orderCreatedChange(address: `0x${string}`): Change {
  return eventChange(
    address,
    KuruOrderbookAbi,
    "OrderCreated",
    [11n, ACCOUNT, 30n, 40n, true],
    ["uint40", "address", "uint96", "uint32", "bool"],
  );
}

function routerSwapChange(
  sender: `0x${string}`,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  amountOut: bigint,
): Change {
  return eventChange(
    KURU_ROUTER_ADDRESS,
    KuruRouterAbi,
    "KuruRouterSwap",
    [sender, tokenIn, tokenOut, amountIn, amountOut],
    ["address", "address", "address", "uint256", "uint256"],
  );
}

function erc20Transfer(
  token: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
): Change {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function eventChange(
  address: `0x${string}`,
  abi: typeof KuruRouterAbi | typeof KuruOrderbookAbi,
  eventName:
    | "Trade"
    | "FlipOrderUpdated"
    | "FlippedOrderCreated"
    | "OrderCreated"
    | "KuruRouterSwap",
  values: readonly unknown[],
  types: readonly string[],
): Change {
  return {
    kind: "event",
    address,
    topics: encodeEventTopics({ abi, eventName } as never) as readonly Hex[],
    data: encodeAbiParameters(types.map((type) => ({ type })) as never, values as never),
  };
}
