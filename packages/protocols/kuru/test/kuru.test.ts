import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  NATIVE,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { AUSD_ADDRESS, monadRuntime, USDC_ADDRESS } from "@themoss/system";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  getAddress,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KuruOrderbookAbi, KuruRouterAbi } from "../src/abis/kuru.js";
import { KURU_ROUTER_ADDRESS, Kuru } from "../src/index.js";

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
  tickSize?: bigint;
  bestBid?: bigint;
  bestAsk?: bigint;
  order?: readonly [`0x${string}`, bigint, number, number, number, number, number, boolean];
};

const MARKETS: readonly MockMarket[] = [
  market(MON_USDC, ZERO, USDC_ADDRESS, 18, 6, 1n, 1n),
  market(MON_USDC_WORSE, ZERO, USDC_ADDRESS, 18, 6, 5n, 4n),
  market(MON_AUSD, ZERO, AUSD_ADDRESS, 18, 6, 6n, 5n),
  market(DIRECT_USDC_AUSD, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 21n, 20n),
  market(DIRECT_USDC_AUSD_BETTER, USDC_ADDRESS, AUSD_ADDRESS, 6, 6, 11n, 10n),
];

/** MARKETS with the tick size Kuru limit orders need (10 → 0.00001 quote-per-base per tick). */
const tickedMarkets = (overrides: Partial<MockMarket> & { address: `0x${string}` }) =>
  MARKETS.map((entry) => ({
    ...entry,
    tickSize: 10n,
    ...(entry.address === overrides.address ? overrides : {}),
  }));

afterEach(() => vi.unstubAllGlobals());

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
    });
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      pairs: readonly unknown[];
    };
    expect(request.pairs).toHaveLength(6);

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
});

describe("Kuru limit orders", () => {
  it("discovers limitOrder under verb swap next to the order-book queries", () => {
    const { registry } = offlineRegistry();
    const swaps = registry.discover({ verb: "swap" });
    expect(swaps.map((entry) => entry.method).sort()).toEqual(["limitOrder", "swap"]);
    expect(swaps.find((entry) => entry.method === "limitOrder")?.tags).toContain("limit");
    const [stub] = registry.load([{ protocol: "kuru", method: "limitOrder" }]);
    expect(stub?.risk).toEqual(["fundOut"]);
    expect(Object.keys(stub?.params ?? {})).toEqual(["tokenIn", "tokenOut", "amount", "price"]);
    const queries = registry
      .discover({ protocol: "kuru" })
      .filter((entry) => entry.kind === "query");
    expect(queries.map((entry) => entry.method).sort()).toEqual([
      "bestBidAsk",
      "orderStatus",
      "quote",
    ]);
  });

  it("places a tick-converted sell on the lowest-address market listing the pair", async () => {
    const { registry } = offlineRegistry(tickedMarkets({ address: DIRECT_USDC_AUSD }));
    const capability = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amount: "10",
      price: "1.05",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [tx, ...rest] = flattenCapabilityTree(capability);
    expect(rest).toEqual([]);
    if (!tx) throw new Error("missing Kuru transaction");
    // Two markets list USDC/AUSD; the deterministic pick is the lowest address.
    expect(getAddress(tx.transaction.to)).toBe(DIRECT_USDC_AUSD);
    // price 1.05 * pricePrecision 1e6 / tickSize 10 = 105000; size 10 * 1e6.
    expect(decodeFunctionData({ abi: KuruOrderbookAbi, data: tx.transaction.data })).toEqual({
      functionName: "addSellOrder",
      args: [105_000, 10_000_000n, false],
    });
  });

  it("derives the buy size from the quote spend at the tick-aligned price", async () => {
    const { registry } = offlineRegistry(tickedMarkets({ address: DIRECT_USDC_AUSD }));
    const capability = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: AUSD_ADDRESS,
      tokenOut: USDC_ADDRESS,
      amount: "10.5",
      price: "1.05",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [tx] = flattenCapabilityTree(capability);
    if (!tx) throw new Error("missing Kuru transaction");
    // Spending 10.5 AUSD at 1.05 AUSD-per-USDC affords 10 USDC of base size.
    expect(decodeFunctionData({ abi: KuruOrderbookAbi, data: tx.transaction.data })).toEqual({
      functionName: "addBuyOrder",
      args: [105_000, 10_000_000n, false],
    });
  });

  it("rejects native MON as the committed asset", async () => {
    const { registry } = offlineRegistry(tickedMarkets({ address: MON_USDC }));
    await expect(
      registry.action("kuru", "limitOrder", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amount: "1",
        price: "0.5",
      }),
    ).rejects.toThrow("native MON limit orders are unsupported");
  });

  it("rejects a price below the market tick size", async () => {
    const { registry } = offlineRegistry(tickedMarkets({ address: DIRECT_USDC_AUSD }));
    await expect(
      registry.action("kuru", "limitOrder", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amount: "10",
        // 1e-6 * pricePrecision 1e6 = 1 raw, below the 10-raw tick.
        price: "0.000001",
      }),
    ).rejects.toThrow("below the market's tick size");
  });

  it("parses a resting order Receipt and requires at least one Kuru event", async () => {
    const { registry } = offlineRegistry(tickedMarkets({ address: DIRECT_USDC_AUSD }));
    const capability = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amount: "10",
      price: "1.05",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const created = orderCreatedChange(DIRECT_USDC_AUSD, 7n, 10_000_000n, 105_000, false);
    const receipt = registry.parseReceipt(capability, [created]);
    expect(receipt.outcome).toEqual({
      operation: "limitOrder",
      protocol: "kuru",
      market: DIRECT_USDC_AUSD,
      orderId: "7",
      owner: ACCOUNT,
      size: "10000000",
      price: "105000",
      isBuy: false,
      fills: [],
    });
    expect(() => registry.parseReceipt(capability, [])).toThrow("requires OrderCreated or Trade");
  });

  it("reads best bid/ask with the combined pricePrecision * sizePrecision scaling", async () => {
    const { registry } = offlineRegistry(
      tickedMarkets({ address: DIRECT_USDC_AUSD, bestBid: 1_050_000_000_000n }),
    );
    const result = await registry.action("kuru", "bestBidAsk", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
    });
    if (result.kind !== "query") throw new Error("expected query");
    // pricePrecision 1e6 * sizePrecision 1e6 → 12 scale digits; zero ask is null.
    expect(result.data).toMatchObject({
      market: DIRECT_USDC_AUSD,
      bestBid: "1.05",
      bestAsk: null,
    });
  });

  it("reports open orders and treats deleted ids as filled_or_cancelled", async () => {
    const { registry } = offlineRegistry(
      tickedMarkets({
        address: DIRECT_USDC_AUSD,
        order: [ACCOUNT, 5_000_000n, 0, 0, 0, 105_000, 0, true],
      }),
    );
    const open = await registry.action("kuru", "orderStatus", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      orderId: "9",
    });
    if (open.kind !== "query") throw new Error("expected query");
    expect(open.data).toEqual({
      market: DIRECT_USDC_AUSD,
      orderId: "9",
      owner: ACCOUNT,
      size: "5000000",
      price: "105000",
      isBuy: true,
      status: "open",
    });

    const gone = await registry.action("kuru", "orderStatus", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      orderId: "1",
    });
    if (gone.kind !== "query") throw new Error("expected query");
    expect(gone.data).toMatchObject({ owner: null, status: "filled_or_cancelled" });
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Kuru mainnet", () => {
  it("has deployed Router bytecode and dynamically quotes a market", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
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
    const runtime = await monadRuntime();
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

  it("reads best bid/ask on the live MON/USDC market", { timeout: 60_000 }, async () => {
    const registry = new Registry(await monadRuntime()).use(Kuru);
    const result = await registry.action("kuru", "bestBidAsk", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
    });
    if (result.kind !== "query") throw new Error("expected query");
    const data = result.data as { bestBid: string | null; bestAsk: string | null };
    // A live market has orders on at least one side.
    expect(data.bestBid ?? data.bestAsk).not.toBeNull();
  });

  it("reports a historical order as filled_or_cancelled", { timeout: 60_000 }, async () => {
    const registry = new Registry(await monadRuntime()).use(Kuru);
    const result = await registry.action("kuru", "orderStatus", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      orderId: "1",
    });
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toMatchObject({ status: "filled_or_cancelled" });
  });

  it("builds a tick-aligned limit buy from the live market params", {
    timeout: 120_000,
  }, async () => {
    const registry = new Registry(await monadRuntime()).use(Kuru);
    // Quote 1 MON to learn a realistic quote-per-base price for the pair.
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    const { estimatedAmountOut } = quote.data as { estimatedAmountOut: string };
    const capability = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amount: "5",
      price: estimatedAmountOut,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [tx, ...rest] = flattenCapabilityTree(capability);
    expect(rest).toEqual([]);
    if (!tx) throw new Error("missing Kuru transaction");
    const decoded = decodeFunctionData({ abi: KuruOrderbookAbi, data: tx.transaction.data });
    expect(decoded.functionName).toBe("addBuyOrder");
    const [price, size, postOnly] = decoded.args as readonly [number, bigint, boolean];
    expect(price).toBeGreaterThan(0);
    expect(size).toBeGreaterThan(0n);
    expect(postOnly).toBe(false);
  });
});

function offlineRegistry(markets: readonly MockMarket[] = MARKETS) {
  const byAddress = new Map(markets.map((entry) => [entry.address.toLowerCase(), entry]));
  const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        data: markets.map(({ address, base, quote }) => ({
          market: address,
          baseasset: base,
          quoteasset: quote,
        })),
      }),
    } as Response),
  );
  vi.stubGlobal("fetch", fetchMock);
  const client = {
    readContract: async ({
      address,
      functionName,
      args,
    }: {
      address: string;
      functionName: string;
      args: readonly unknown[];
    }) => {
      if (functionName === "verifiedMarket") {
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
          Number(entry.tickSize ?? 0n),
          0n,
          0n,
          0n,
          0n,
        ];
      }
      const entry = byAddress.get(address.toLowerCase());
      if (!entry) throw new Error(`unknown market ${address}`);
      if (functionName === "bestBidAsk") return [entry.bestBid ?? 0n, entry.bestAsk ?? 0n];
      if (functionName === "s_orders") return entry.order ?? [ZERO, 0n, 0, 0, 0, 0, 0, false];
      throw new Error(`unexpected read ${functionName}`);
    },
    call: async ({ to, account, data }: { to: string; account: string; data: Hex }) => {
      const entry = byAddress.get(to.toLowerCase());
      if (!entry) throw new Error(`unexpected call ${to}`);
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

function orderCreatedChange(
  address: `0x${string}`,
  orderId: bigint,
  size: bigint,
  price: number,
  isBuy: boolean,
): Change {
  return eventChange(
    address,
    KuruOrderbookAbi,
    "OrderCreated",
    [orderId, ACCOUNT, size, price, isBuy],
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
  eventName: "Trade" | "KuruRouterSwap" | "OrderCreated",
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
