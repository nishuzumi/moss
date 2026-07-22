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
});

function offlineRegistry(
  markets: readonly MockMarket[] = MARKETS,
  fetchMock = marketDiscoveryFetch(markets),
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
  eventName: "Trade" | "KuruRouterSwap",
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
