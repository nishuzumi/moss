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
import { monadRuntime, USDC_ADDRESS, WMON_ADDRESS } from "@themoss/system";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  keccak256,
  zeroAddress,
  zeroHash,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CloberBookManagerAbi,
  CloberBookViewerAbi,
  CloberControllerAbi,
} from "../src/abis/clober.js";
import {
  CLOBER_BOOK_MANAGER_ADDRESS,
  CLOBER_BOOK_VIEWER_ADDRESS,
  CLOBER_CONTROLLER_ADDRESS,
  Clober,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const TOKEN_IN = getAddress("0x1111111111111111111111111111111111111111");
const OTHER_TOKEN = getAddress("0x2222222222222222222222222222222222222222");
const MAKER_POLICY = 8_888_608;
const TAKER_POLICY = 8_888_708;
const UINT192_MASK = (1n << 192n) - 1n;

afterEach(() => vi.restoreAllMocks());

describe("Clober", () => {
  it("loads exact-input fields and returns an offline human-unit quote", async () => {
    const { registry, readContract } = offlineRegistry();
    const [loaded] = registry.load([{ protocol: "clober", method: "quote" }]);
    expect(loaded?.params.amountIn).toMatchObject({
      description: expect.stringContaining("Fixed input"),
      type: { description: expect.stringContaining("base-10 decimal") },
    });
    expect(loaded?.params.slippage).toMatchObject({
      description: expect.stringContaining("adverse movement"),
      type: {
        default: 50,
        minimum: 0,
        maximum: 5_000,
        description: expect.stringContaining("1 bps equals 0.01%"),
      },
    });

    const quote = await registry.action("clober", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected Query");
    const expectedBookId = bookId({ base: zeroAddress, quote: USDC_ADDRESS, unitSize: 1n });
    expect(expectedBookId).toBe(
      5_954_885_684_956_363_054_050_231_031_211_743_946_744_177_791_604_395_877_538n,
    );
    expect(quote.data).toEqual({
      amountIn: "1",
      estimatedAmountSpent: "1",
      estimatedAmountOut: "2",
      minimumAmountOut: "1.99",
    });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "getBookKey", args: [expectedBookId] }),
    );
  });

  it("builds an ERC-20 approval followed by exact Controller.spend calldata", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const expectedBookId = bookId({ base: TOKEN_IN, quote: USDC_ADDRESS, unitSize: 1n });
    const { registry } = offlineRegistry({ base: TOKEN_IN });
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: TOKEN_IN,
      tokenOut: USDC_ADDRESS,
      amountIn: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("missing Clober transactions");

    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toEqual({
      functionName: "approve",
      args: [CLOBER_CONTROLLER_ADDRESS, 1_500_000_000_000_000_000n],
    });
    const decoded = decodeFunctionData({ abi: CloberControllerAbi, data: swap.transaction.data });
    expect(decoded).toEqual({
      functionName: "spend",
      args: [
        [
          {
            id: expectedBookId,
            limitPrice: 0n,
            baseAmount: 1_500_000_000_000_000_000n,
            minQuoteAmount: 1_990_000n,
            hookData: zeroHash,
          },
        ],
        [TOKEN_IN, USDC_ADDRESS],
        [],
        1_700_001_200n,
      ],
    });
    expect(BigInt(swap.transaction.value)).toBe(0n);
  });

  it("uses native value, excludes native from settlement tokens, and needs no approval", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const { registry } = offlineRegistry();
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
      slippage: 0,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const [swap] = flattenCapabilityTree(capability);
    if (!swap) throw new Error("missing Clober transaction");
    expect(flattenCapabilityTree(capability)).toHaveLength(1);
    const decoded = decodeFunctionData({ abi: CloberControllerAbi, data: swap.transaction.data });
    if (decoded.functionName !== "spend") throw new Error("expected Controller.spend");
    expect(decoded.args[1]).toEqual([USDC_ADDRESS]);
    expect(decoded.args[2]).toEqual([]);
    expect(decoded.args[0][0]?.minQuoteAmount).toBe(2_000_000n);
    expect(BigInt(swap.transaction.value)).toBe(1_000_000_000_000_000_000n);
  });

  it("uses the fixed 1e12 unit size for canonical WMON quote books", async () => {
    const expectedBookId = bookId({
      base: TOKEN_IN,
      quote: WMON_ADDRESS,
      unitSize: 1_000_000_000_000n,
    });
    const { registry, readContract } = offlineRegistry({
      base: TOKEN_IN,
      quote: WMON_ADDRESS,
      outputDecimals: 6,
      unitSize: 1_000_000_000_000n,
    });
    await registry.action("clober", "quote", ACCOUNT, {
      tokenIn: TOKEN_IN,
      tokenOut: WMON_ADDRESS,
      amountIn: "1",
    });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "getBookKey", args: [expectedBookId] }),
    );
  });

  it("rejects an on-chain BookKey mismatch before quoting or building calldata", async () => {
    const { registry, readContract } = offlineRegistry({ mismatchedBook: true });
    await expect(
      registry.action("clober", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("does not match the canonical requested market");
    expect(readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "getExpectedOutput" }),
    );
  });

  it("rejects a quote that would leave material input unspent", async () => {
    const { registry } = offlineRegistry({ spentBaseAmount: 999n });
    await expect(
      registry.action("clober", "swap", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("cannot spend at least 99.9% of the input amount");
  });

  it("rejects dust quotes whose slippage floor would disable minimum-output protection", async () => {
    const { registry } = offlineRegistry({ amountOut: 1n });
    await expect(
      registry.action("clober", "swap", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("too small to enforce a non-zero minimum output");
  });

  it("parses Take fills and delegates every settlement with exact Change references", async () => {
    const { registry } = offlineRegistry({ base: TOKEN_IN });
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: TOKEN_IN,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const expectedBookId = bookId({ base: TOKEN_IN, quote: USDC_ADDRESS, unitSize: 1n });
    const take = takeChange(expectedBookId, CLOBER_CONTROLLER_ADDRESS, 123, 9n);
    const debit = erc20Transfer(
      TOKEN_IN,
      ACCOUNT,
      CLOBER_BOOK_MANAGER_ADDRESS,
      1_000_000_000_000_000_000n,
    );
    const credit = erc20Transfer(USDC_ADDRESS, CLOBER_BOOK_MANAGER_ADDRESS, ACCOUNT, 2_000_000n);
    const changes = [take, debit, credit] as const;
    const receipt = registry.parseReceipt(capability, changes);

    expect(receipt.outcome).toEqual({
      operation: "swap",
      protocol: "clober",
      fills: [
        {
          event: "Take",
          bookId: expectedBookId.toString(),
          user: CLOBER_CONTROLLER_ADDRESS,
          tick: "123",
          unit: "9",
        },
      ],
      settlements: [
        {
          operation: "transfer",
          token: TOKEN_IN,
          from: ACCOUNT,
          to: CLOBER_BOOK_MANAGER_ADDRESS,
          amount: "1000000000000000000",
        },
        {
          operation: "transfer",
          token: USDC_ADDRESS,
          from: CLOBER_BOOK_MANAGER_ADDRESS,
          to: ACCOUNT,
          amount: "2000000",
        },
      ],
    });
    expect(receipt.changes[1]).toMatchObject({
      kind: "receipt",
      outcome: [expect.objectContaining({ operation: "transfer", token: TOKEN_IN })],
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
    expect(receipt.changes.map(firstChange)[0]).toBe(take);
    expect(receipt.changes.map(firstChange)[1]).toBe(debit);
    expect(receipt.changes.map(firstChange)[2]).toBe(credit);
  });

  it("requires at least one BookManager Take event", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const transfer = erc20Transfer(USDC_ADDRESS, CLOBER_BOOK_MANAGER_ADDRESS, ACCOUNT, 2_000_000n);
    expect(() => registry.parseReceipt(capability, [transfer])).toThrow(
      "requires at least one Take",
    );
  });

  it("rejects a Take event whose user is not the Clober Controller", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const expectedBookId = bookId({ base: zeroAddress, quote: USDC_ADDRESS, unitSize: 1n });
    expect(() =>
      registry.parseReceipt(capability, [takeChange(expectedBookId, ACCOUNT, 123, 1n)]),
    ).toThrow("Take user is not the Controller");
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Clober mainnet", () => {
  it("has deployed protocol bytecode and quotes native MON to USDC", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    for (const address of [
      CLOBER_CONTROLLER_ADDRESS,
      CLOBER_BOOK_MANAGER_ADDRESS,
      CLOBER_BOOK_VIEWER_ADDRESS,
    ] as const) {
      expect((await runtime.client.getCode({ address }))?.length).toBeGreaterThan(2);
    }
    const [controllerBookManager, viewerBookManager] = await Promise.all([
      runtime.client.readContract({
        address: CLOBER_CONTROLLER_ADDRESS,
        abi: CloberControllerAbi,
        functionName: "bookManager",
      }),
      runtime.client.readContract({
        address: CLOBER_BOOK_VIEWER_ADDRESS,
        abi: CloberBookViewerAbi,
        functionName: "bookManager",
      }),
    ]);
    expect(controllerBookManager.toLowerCase()).toBe(CLOBER_BOOK_MANAGER_ADDRESS.toLowerCase());
    expect(viewerBookManager.toLowerCase()).toBe(CLOBER_BOOK_MANAGER_ADDRESS.toLowerCase());
    const quote = await new Registry(runtime).use(Clober).action("clober", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected Query");
    expect(quote.data).toMatchObject({ amountIn: "1" });
    expect(
      Number((quote.data as { estimatedAmountOut: string }).estimatedAmountOut),
    ).toBeGreaterThan(0);
  });

  it("simulates native MON to USDC with zero Warnings", { timeout: 180_000 }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Clober);
    const capability = await registry.action("clober", "swap", ACCOUNT, {
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
      protocol: "clober",
    });
  });
});

type OfflineOptions = {
  base?: `0x${string}`;
  quote?: `0x${string}`;
  inputDecimals?: number;
  outputDecimals?: number;
  unitSize?: bigint;
  amountOut?: bigint;
  spentBaseAmount?: bigint;
  mismatchedBook?: boolean;
};

function offlineRegistry(options: OfflineOptions = {}) {
  const base = options.base ?? zeroAddress;
  const quote = options.quote ?? USDC_ADDRESS;
  const inputDecimals = options.inputDecimals ?? 18;
  const outputDecimals = options.outputDecimals ?? 6;
  const unitSize = options.unitSize ?? 10n ** BigInt(Math.max(outputDecimals - 6, 0));
  const key = canonicalBookKey({ base, quote, unitSize });
  const readContract = vi.fn(
    async ({
      address,
      functionName,
      args,
    }: {
      address: string;
      functionName: string;
      args?: readonly unknown[];
    }) => {
      if (functionName === "name") return "Mock Token";
      if (functionName === "symbol") return "MOCK";
      if (functionName === "decimals") {
        return address.toLowerCase() === base.toLowerCase() ? inputDecimals : outputDecimals;
      }
      if (functionName === "getBookKey") {
        return options.mismatchedBook ? { ...key, quote: OTHER_TOKEN } : key;
      }
      if (functionName === "getExpectedOutput") {
        const [order] = args ?? [];
        const amountIn = (order as { baseAmount: bigint }).baseAmount;
        return [options.amountOut ?? 2_000_000n, options.spentBaseAmount ?? amountIn];
      }
      throw new Error(`unexpected read ${functionName} at ${address}`);
    },
  );
  const client = { readContract } as unknown as MossRuntime["client"];
  return {
    registry: new Registry({ rpcUrl: "http://offline", client }).use(Clober),
    readContract,
  };
}

function canonicalBookKey({
  base,
  quote,
  unitSize,
}: {
  base: `0x${string}`;
  quote: `0x${string}`;
  unitSize: bigint;
}) {
  return {
    base,
    unitSize,
    quote,
    makerPolicy: MAKER_POLICY,
    hooks: zeroAddress,
    takerPolicy: TAKER_POLICY,
  } as const;
}

function bookId(params: { base: `0x${string}`; quote: `0x${string}`; unitSize: bigint }) {
  const encoded = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "base", type: "address" },
          { name: "unitSize", type: "uint64" },
          { name: "quote", type: "address" },
          { name: "makerPolicy", type: "uint24" },
          { name: "hooks", type: "address" },
          { name: "takerPolicy", type: "uint24" },
        ],
      },
    ],
    [canonicalBookKey(params)],
  );
  return BigInt(keccak256(encoded)) & UINT192_MASK;
}

function takeChange(bookId: bigint, user: `0x${string}`, tick: number, unit: bigint): Change {
  return {
    kind: "event",
    address: CLOBER_BOOK_MANAGER_ADDRESS,
    topics: encodeEventTopics({
      abi: CloberBookManagerAbi,
      eventName: "Take",
      args: { bookId, user },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "int24" }, { type: "uint64" }], [tick, unit]),
  };
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

function firstChange(entry: ReceiptResult["changes"][number]): Change {
  if (entry.kind === "change") return entry.change;
  const [child] = entry.changes;
  if (child?.kind !== "change") throw new Error("expected one nested ReceiptChange");
  return child.change;
}
