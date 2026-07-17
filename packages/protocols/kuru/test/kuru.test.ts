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
  formatUnits,
  getAddress,
  parseUnits,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KuruMarginAccountAbi, KuruOrderbookAbi, KuruRouterAbi } from "../src/abis/kuru.js";
import { KURU_ROUTER_ADDRESS, Kuru } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");
const MON_USDC = getAddress("0x1111111111111111111111111111111111111111");
const MON_USDC_WORSE = getAddress("0x2222222222222222222222222222222222222222");
const MON_AUSD = getAddress("0x3333333333333333333333333333333333333333");
const DIRECT_USDC_AUSD = getAddress("0x4444444444444444444444444444444444444444");
const DIRECT_USDC_AUSD_BETTER = getAddress("0x5555555555555555555555555555555555555555");
const UNVERIFIED_MARKET = getAddress("0x6666666666666666666666666666666666666666");
const MARGIN_ACCOUNT = getAddress("0x9999999999999999999999999999999999999999");
const UINT256_MAX = (1n << 256n) - 1n;

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
  minSize?: bigint;
  maxSize?: bigint;
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

/** A market with the tick size limit orders need (mock pricePrecision is 10^quoteDecimals). */
function ticked(entry: MockMarket, overrides: Partial<MockMarket> = {}): MockMarket {
  return { ...entry, tickSize: 10n, ...overrides };
}
const DIRECT_TICKED = ticked(MARKETS[3] as MockMarket);
const MON_USDC_TICKED = ticked(MARKETS[0] as MockMarket);

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
  it("discovers the limit-order surface with honest risk and parameter shapes", () => {
    const { registry } = offlineRegistry();
    const swaps = registry.discover({ verb: "swap" });
    expect(swaps.map((entry) => entry.method).sort()).toEqual(["limitOrder", "swap"]);
    expect(swaps.find((entry) => entry.method === "limitOrder")?.tags).toContain("limit");
    expect(registry.discover({ verb: "supply" }).map((entry) => entry.method)).toEqual([
      "depositMargin",
    ]);
    const [stub] = registry.load([{ protocol: "kuru", method: "limitOrder" }]);
    expect(stub?.risk).toEqual(["fundOut", "approval"]);
    expect(Object.keys(stub?.params ?? {})).toEqual([
      "tokenIn",
      "tokenOut",
      "market",
      "amount",
      "price",
    ]);
    const queries = registry
      .discover({ protocol: "kuru" })
      .filter((entry) => entry.kind === "query");
    expect(queries.map((entry) => entry.method).sort()).toEqual([
      "bestBidAsk",
      "marginBalance",
      "markets",
      "orderStatus",
      "quote",
    ]);
  });

  it("lists every market for the pair with its top of book", async () => {
    const { registry } = offlineRegistry([
      ticked(MARKETS[3] as MockMarket, { bestBid: 1_050_000_000_000_000_000n }),
      ticked(MARKETS[4] as MockMarket, { tickSize: 100n }),
    ]);
    const result = await registry.action("kuru", "markets", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
    });
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toEqual([
      {
        market: DIRECT_USDC_AUSD,
        baseAsset: USDC_ADDRESS,
        quoteAsset: AUSD_ADDRESS,
        pricePrecision: "1000000",
        sizePrecision: "1000000",
        tickSize: "10",
        minSize: "0",
        maxSize: "0",
        bestBid: "1.05",
        bestAsk: null,
      },
      {
        market: DIRECT_USDC_AUSD_BETTER,
        baseAsset: USDC_ADDRESS,
        quoteAsset: AUSD_ADDRESS,
        pricePrecision: "1000000",
        sizePrecision: "1000000",
        tickSize: "100",
        minSize: "0",
        maxSize: "0",
        bestBid: null,
        bestAsk: null,
      },
    ]);
  });

  it("encodes price exactly like the Kuru SDK and posts post-only", async () => {
    // @kuru-labs/kuru-sdk GTC.placeLimit: parseUnits("1.05", log10(1e6)) = 1_050_000.
    // tickSize never scales the price; it only constrains validity.
    const { registry } = offlineRegistry([DIRECT_TICKED], {
      marginBalances: { [USDC_ADDRESS.toLowerCase()]: 10_000_000n },
    });
    const capability = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amount: "10",
      price: "1.05",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [tx, ...rest] = flattenCapabilityTree(capability);
    expect(rest).toEqual([]); // margin already funded — no deposit step
    if (!tx) throw new Error("missing Kuru transaction");
    expect(getAddress(tx.transaction.to)).toBe(DIRECT_USDC_AUSD);
    expect(decodeFunctionData({ abi: KuruOrderbookAbi, data: tx.transaction.data })).toEqual({
      functionName: "addSellOrder",
      args: [1_050_000, 10_000_000n, true],
    });
  });

  it("derives the buy size from the quote spend at the limit price", async () => {
    const { registry } = offlineRegistry([DIRECT_TICKED], {
      marginBalances: { [AUSD_ADDRESS.toLowerCase()]: 10_500_000n },
    });
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
      args: [1_050_000, 10_000_000n, true],
    });
  });

  it("tops up a margin shortfall with a nested deposit, native MON included", async () => {
    const { registry } = offlineRegistry([MON_USDC_TICKED], {
      marginBalances: { [ZERO.toLowerCase()]: parseUnits("0.4", 18) },
    });
    const capability = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amount: "1",
      price: "0.05",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const depositNode = capability.children[0];
    expect(depositNode).toMatchObject({
      kind: "capability",
      protocol: "kuru",
      method: "depositMargin",
      params: { token: NATIVE, amount: "0.6" },
    });
    const [deposit, order, ...rest] = flattenCapabilityTree(capability);
    expect(rest).toEqual([]);
    if (!deposit || !order) throw new Error("missing Kuru transactions");
    expect(getAddress(deposit.transaction.to)).toBe(MARGIN_ACCOUNT);
    expect(BigInt(deposit.transaction.value)).toBe(parseUnits("0.6", 18));
    expect(
      decodeFunctionData({ abi: KuruMarginAccountAbi, data: deposit.transaction.data }),
    ).toEqual({
      functionName: "deposit",
      args: [ACCOUNT, ZERO, parseUnits("0.6", 18)],
    });
    expect(decodeFunctionData({ abi: KuruOrderbookAbi, data: order.transaction.data })).toEqual({
      functionName: "addSellOrder",
      args: [50_000, parseUnits("1", 18), true],
    });
  });

  it("requires an explicit market when several list the pair and verifies the choice", async () => {
    const markets = [DIRECT_TICKED, ticked(MARKETS[4] as MockMarket)];
    const { registry } = offlineRegistry(markets, {
      marginBalances: { [USDC_ADDRESS.toLowerCase()]: 10_000_000n },
    });
    await expect(
      registry.action("kuru", "limitOrder", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amount: "10",
        price: "1.05",
      }),
    ).rejects.toThrow("multiple Kuru markets list this pair");

    const chosen = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      market: DIRECT_USDC_AUSD_BETTER,
      amount: "10",
      price: "1.05",
    });
    if (chosen.kind !== "capability") throw new Error("expected capability");
    const order = flattenCapabilityTree(chosen).at(-1);
    expect(getAddress(order?.transaction.to ?? ZERO)).toBe(DIRECT_USDC_AUSD_BETTER);

    await expect(
      registry.action("kuru", "limitOrder", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        market: DIRECT_USDC_AUSD,
        amount: "1",
        price: "0.05",
      }),
    ).rejects.toThrow("does not list this token pair");

    await expect(
      registry.action("kuru", "limitOrder", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        market: UNVERIFIED_MARKET,
        amount: "10",
        price: "1.05",
      }),
    ).rejects.toThrow("not a Router-verified Kuru market");
  });

  it("rejects prices the market cannot represent", async () => {
    const coarseTick = [ticked(MARKETS[3] as MockMarket, { tickSize: 10_000n })];
    const { registry } = offlineRegistry(coarseTick, {
      marginBalances: { [USDC_ADDRESS.toLowerCase()]: 10_000_000n },
    });
    // 1.0501 * 1e6 = 1_050_100, not a multiple of tickSize 10_000.
    await expect(
      registry.action("kuru", "limitOrder", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amount: "10",
        price: "1.0501",
      }),
    ).rejects.toThrow("not a multiple of the market tick size");
    // 7 decimals exceed pricePrecision 1e6.
    await expect(
      registry.action("kuru", "limitOrder", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amount: "10",
        price: "1.0000001",
      }),
    ).rejects.toThrow("more decimals than the market's price precision");
  });

  it("enforces the market's size bounds", async () => {
    const bounded = [ticked(MARKETS[3] as MockMarket, { minSize: 100_000_000n })];
    const { registry } = offlineRegistry(bounded, {
      marginBalances: { [USDC_ADDRESS.toLowerCase()]: 10_000_000n },
    });
    await expect(
      registry.action("kuru", "limitOrder", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amount: "10",
        price: "1.05",
      }),
    ).rejects.toThrow("below the market minimum");
  });

  it("parses the Receipt from the OrderCreated facts and rejects trades", async () => {
    const { registry } = offlineRegistry([DIRECT_TICKED], {
      marginBalances: { [USDC_ADDRESS.toLowerCase()]: 10_000_000n },
    });
    const capability = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amount: "10",
      price: "1.05",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const created = orderCreatedChange(DIRECT_USDC_AUSD, 7n, 10_000_000n, 1_050_000, false);
    const expected = {
      operation: "limitOrder",
      protocol: "kuru",
      market: DIRECT_USDC_AUSD,
      orderId: "7",
      owner: ACCOUNT,
      size: "10000000",
      price: "1050000",
      isBuy: false,
    };
    expect(registry.parseReceipt(capability, [created]).outcome).toEqual(expected);

    // Root-level parse also covers the auto-deposit changes.
    const funded = registry.parseReceipt(capability, [
      erc20Transfer(USDC_ADDRESS, ACCOUNT, MARGIN_ACCOUNT, 10_000_000n),
      depositChange(ACCOUNT, USDC_ADDRESS, 10_000_000n),
      created,
    ]);
    expect(funded.outcome).toEqual(expected);
    expect(funded.text).toContain("1 margin deposit");

    // postOnly can never trade; a Trade change means the plan was not ours.
    expect(() =>
      registry.parseReceipt(capability, [created, tradeChange(DIRECT_USDC_AUSD, 8n)]),
    ).toThrow("Unexpected Change");
    expect(() => registry.parseReceipt(capability, [])).toThrow(
      "requires exactly one OrderCreated",
    );
  });

  it("deposits margin as a standalone composable Capability", async () => {
    const { registry } = offlineRegistry([DIRECT_TICKED]);
    const native = await registry.action("kuru", "depositMargin", ACCOUNT, {
      token: NATIVE,
      amount: "2",
    });
    if (native.kind !== "capability") throw new Error("expected capability");
    const [nativeTx, ...nativeRest] = flattenCapabilityTree(native);
    expect(nativeRest).toEqual([]);
    if (!nativeTx) throw new Error("missing deposit transaction");
    expect(BigInt(nativeTx.transaction.value)).toBe(parseUnits("2", 18));
    expect(
      decodeFunctionData({ abi: KuruMarginAccountAbi, data: nativeTx.transaction.data }),
    ).toEqual({ functionName: "deposit", args: [ACCOUNT, ZERO, parseUnits("2", 18)] });

    const erc20 = await registry.action("kuru", "depositMargin", ACCOUNT, {
      token: USDC_ADDRESS,
      amount: "25",
    });
    if (erc20.kind !== "capability") throw new Error("expected capability");
    const [approval, deposit, ...rest] = flattenCapabilityTree(erc20);
    expect(rest).toEqual([]);
    if (!approval || !deposit) throw new Error("missing deposit transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [MARGIN_ACCOUNT, 25_000_000n],
    });
    expect(
      decodeFunctionData({ abi: KuruMarginAccountAbi, data: deposit.transaction.data }),
    ).toEqual({ functionName: "deposit", args: [ACCOUNT, USDC_ADDRESS, 25_000_000n] });

    const receipt = registry.parseReceipt(erc20, [
      erc20Transfer(USDC_ADDRESS, ACCOUNT, MARGIN_ACCOUNT, 25_000_000n),
      depositChange(ACCOUNT, USDC_ADDRESS, 25_000_000n),
    ]);
    expect(receipt.outcome).toEqual({
      operation: "depositMargin",
      protocol: "kuru",
      marginAccount: MARGIN_ACCOUNT,
      user: ACCOUNT,
      token: USDC_ADDRESS,
      amount: "25000000",
    });
    expect(() => registry.parseReceipt(erc20, [])).toThrow("requires a Deposit event");
  });

  it("reads margin balances for the acting account", async () => {
    const { registry } = offlineRegistry([DIRECT_TICKED], {
      marginBalances: { [USDC_ADDRESS.toLowerCase()]: 123n },
    });
    const result = await registry.action("kuru", "marginBalance", ACCOUNT, {
      token: USDC_ADDRESS,
    });
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toMatchObject({
      marginAccount: MARGIN_ACCOUNT,
      user: ACCOUNT,
      token: USDC_ADDRESS,
      balance: "123",
    });
  });

  it("reads best bid/ask in the contract's 1e18 fixed-point units", async () => {
    // Live MON/USDC probe 2026-07-17: ask order at 2_786_670 pricePrecision(1e8)
    // units surfaced as 27_866_700_000_000_000 = 0.0278667 * 1e18.
    const { registry } = offlineRegistry([
      ticked(MARKETS[3] as MockMarket, {
        bestBid: 27_590_200_000_000_000n,
        bestAsk: UINT256_MAX,
      }),
    ]);
    const result = await registry.action("kuru", "bestBidAsk", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      market: DIRECT_USDC_AUSD,
    });
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toMatchObject({
      market: DIRECT_USDC_AUSD,
      bestBid: "0.0275902",
      bestAsk: null, // MaxUint256 is the empty-side sentinel
    });
  });

  it("reports order status by market and id, admitting gone is ambiguous", async () => {
    const { registry } = offlineRegistry([
      ticked(MARKETS[3] as MockMarket, {
        order: [ACCOUNT, 5_000_000n, 0, 0, 0, 1_050_000, 0, true],
      }),
      MON_USDC_TICKED,
    ]);
    const open = await registry.action("kuru", "orderStatus", ACCOUNT, {
      market: DIRECT_USDC_AUSD,
      orderId: "9",
    });
    if (open.kind !== "query") throw new Error("expected query");
    expect(open.data).toMatchObject({
      market: DIRECT_USDC_AUSD,
      orderId: "9",
      owner: ACCOUNT,
      size: "5000000",
      price: "1050000",
      isBuy: true,
      status: "open",
    });

    const gone = await registry.action("kuru", "orderStatus", ACCOUNT, {
      market: MON_USDC,
      orderId: "1",
    });
    if (gone.kind !== "query") throw new Error("expected query");
    expect(gone.data).toMatchObject({
      owner: null,
      status: "gone",
      note: expect.stringContaining("fully filled or cancelled"),
    });

    await expect(
      registry.action("kuru", "orderStatus", ACCOUNT, {
        market: UNVERIFIED_MARKET,
        orderId: "1",
      }),
    ).rejects.toThrow("not a Router-verified Kuru market");
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

  it("reads a best bid/ask consistent with the live quoted rate", { timeout: 90_000 }, async () => {
    const registry = new Registry(await monadRuntime()).use(Kuru);
    const chosen = await liveMonUsdcMarket(registry);
    const result = await registry.action("kuru", "bestBidAsk", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      market: chosen.market,
    });
    if (result.kind !== "query") throw new Error("expected query");
    const data = result.data as { market: string; bestBid: string | null; bestAsk: string | null };
    expect(getAddress(data.market)).toBe(getAddress(chosen.market));
    expect(data.bestBid).not.toBeNull();
    // Cross-check the 1e18 fixed-point interpretation against real quoting:
    // selling 1 MON must yield roughly the best bid in USDC.
    const quote = await registry.action("kuru", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    const { estimatedAmountOut } = quote.data as { estimatedAmountOut: string };
    const reference = Number(data.bestBid);
    const quoted = Number(estimatedAmountOut);
    expect(Math.abs(reference - quoted) / quoted).toBeLessThan(0.4);
  });

  it("reports order status on an explicit live market", { timeout: 90_000 }, async () => {
    const registry = new Registry(await monadRuntime()).use(Kuru);
    const chosen = await liveMonUsdcMarket(registry);
    const result = await registry.action("kuru", "orderStatus", ACCOUNT, {
      market: chosen.market,
      orderId: "1",
    });
    if (result.kind !== "query") throw new Error("expected query");
    const { status } = result.data as { status: string };
    // Semantics are pinned offline; live we only assert the read path resolves.
    expect(["open", "gone"]).toContain(status);
  });

  it("simulates a funded post-only limit order end to end", { timeout: 180_000 }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Kuru);
    const chosen = await liveMonUsdcMarket(registry);
    if (!chosen.bestAsk) throw new Error("chosen market has no asks");
    // Sell far above the book so the post-only order rests instead of reverting,
    // sized to clear the market's minimum.
    const price = formatUnits(parseUnits(chosen.bestAsk, 18) * 2n, 18);
    const minBase = Number(chosen.minSize) / Number(chosen.sizePrecision);
    const amount = String(Math.max(1, Math.ceil(minBase)));

    const capability = await registry.action("kuru", "limitOrder", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      market: chosen.market,
      amount,
      price,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const executable = flattenCapabilityTree(capability);
    const order = executable.at(-1);
    if (!order) throw new Error("missing Kuru transaction");
    const decoded = decodeFunctionData({ abi: KuruOrderbookAbi, data: order.transaction.data });
    expect(decoded.functionName).toBe("addSellOrder");
    expect((decoded.args as readonly [number, bigint, boolean])[2]).toBe(true);
    // The bare test account holds no margin, so the tree must fund itself.
    expect(executable[0]?.capability.method).toBe("depositMargin");

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    for (const result of outcome.results) expect(result.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "depositMargin",
      protocol: "kuru",
      token: NATIVE,
      amount: parseUnits(amount, 18).toString(),
    });
    expect(outcome.results.at(-1)?.receipt?.outcome).toMatchObject({
      operation: "limitOrder",
      protocol: "kuru",
      isBuy: false,
      orderId: expect.stringMatching(/^\d+$/),
    });
  });
});

type LiveMarket = {
  market: `0x${string}`;
  bestBid: string | null;
  bestAsk: string | null;
  minSize: string;
  sizePrecision: string;
};

/** The live MON/USDC market with the deepest-priced two-sided book. */
async function liveMonUsdcMarket(registry: Registry): Promise<LiveMarket> {
  const result = await registry.action("kuru", "markets", ACCOUNT, {
    tokenIn: NATIVE,
    tokenOut: USDC_ADDRESS,
  });
  if (result.kind !== "query") throw new Error("expected query");
  const listed = (result.data as LiveMarket[]).filter((entry) => entry.bestBid && entry.bestAsk);
  const [first] = listed;
  if (!first) throw new Error("no live MON/USDC market has a two-sided book");
  return listed.reduce((best, entry) =>
    Number(entry.bestBid) > Number(best.bestBid) ? entry : best,
  );
}

function offlineRegistry(
  markets: readonly MockMarket[] = MARKETS,
  options: { marginBalances?: Record<string, bigint> } = {},
) {
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
        if (!entry || entry.verified === false) {
          return [0, 0n, ZERO, 0n, ZERO, 0n, 0, 0n, 0n, 0n, 0n];
        }
        return [
          10 ** entry.quoteDecimals,
          10n ** BigInt(entry.baseDecimals),
          entry.base,
          BigInt(entry.baseDecimals),
          entry.quote,
          BigInt(entry.quoteDecimals),
          Number(entry.tickSize ?? 0n),
          entry.minSize ?? 0n,
          entry.maxSize ?? 0n,
          0n,
          0n,
        ];
      }
      if (functionName === "marginAccountAddress") return MARGIN_ACCOUNT;
      if (address.toLowerCase() === MARGIN_ACCOUNT.toLowerCase()) {
        if (functionName !== "getBalance") throw new Error(`unexpected read ${functionName}`);
        return options.marginBalances?.[String(args[1]).toLowerCase()] ?? 0n;
      }
      const entry = byAddress.get(address.toLowerCase());
      if (entry) {
        if (functionName === "bestBidAsk") return [entry.bestBid ?? 0n, entry.bestAsk ?? 0n];
        if (functionName === "s_orders") return entry.order ?? [ZERO, 0n, 0, 0, 0, 0, 0, false];
        throw new Error(`unexpected read ${functionName}`);
      }
      // ERC-20 metadata reads for margin deposits of mock tokens.
      if (functionName === "decimals") return 6;
      if (functionName === "symbol") return "TOK";
      if (functionName === "name") return "Mock Token";
      throw new Error(`unexpected read ${functionName} on ${address}`);
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

function depositChange(user: `0x${string}`, token: `0x${string}`, amount: bigint): Change {
  return eventChange(
    MARGIN_ACCOUNT,
    KuruMarginAccountAbi,
    "Deposit",
    [user, token, amount],
    ["address", "address", "uint256"],
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
  abi: typeof KuruRouterAbi | typeof KuruOrderbookAbi | typeof KuruMarginAccountAbi,
  eventName: "Trade" | "KuruRouterSwap" | "OrderCreated" | "Deposit",
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
