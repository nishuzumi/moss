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
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";
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
  type CloberSwapOutcome,
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

  it("rejects amountIn values that require token-unit rounding", async () => {
    const { registry } = offlineRegistry({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      inputDecimals: 6,
      outputDecimals: 18,
      unitSize: 1_000_000_000_000n,
    });
    for (const amountIn of ["0.0000009", "1.0000001", "1.0000009"]) {
      await expect(
        registry.action("clober", "quote", ACCOUNT, {
          tokenIn: USDC_ADDRESS,
          tokenOut: NATIVE,
          amountIn,
        }),
      ).rejects.toThrow("cannot be represented exactly with tokenIn's 6 decimals");
    }

    const exact = await registry.action("clober", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1.0000000",
    });
    if (exact.kind !== "query") throw new Error("expected Query");
    expect(exact.data).toMatchObject({ amountIn: "1", estimatedAmountSpent: "1" });
  });

  it("uses curated token decimals without requiring optional ERC-20 metadata", async () => {
    const { registry, readContract } = offlineRegistry({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      outputDecimals: 18,
      unitSize: 1_000_000_000_000n,
    });
    const quote = await registry.action("clober", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected Query");

    const functions = readContract.mock.calls.map(([call]) => call.functionName);
    expect(functions).not.toContain("decimals");
    expect(functions).not.toContain("name");
    expect(functions).not.toContain("symbol");
  });

  it("builds an ERC-20 approval followed by exact Controller.spend calldata", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const expectedBookId = bookId({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      unitSize: 1_000_000_000_000n,
    });
    const { registry } = offlineRegistry({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      inputDecimals: 6,
      outputDecimals: 18,
      unitSize: 1_000_000_000_000n,
    });
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("missing Clober transactions");

    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toEqual({
      functionName: "approve",
      args: [CLOBER_CONTROLLER_ADDRESS, 1_500_000n],
    });
    const decoded = decodeFunctionData({ abi: CloberControllerAbi, data: swap.transaction.data });
    expect(decoded).toEqual({
      functionName: "spend",
      args: [
        [
          {
            id: expectedBookId,
            limitPrice: 0n,
            baseAmount: 1_500_000n,
            minQuoteAmount: 1_990_000n,
            hookData: zeroHash,
          },
        ],
        [USDC_ADDRESS],
        [],
        1_700_001_200n,
      ],
    });
    expect(BigInt(swap.transaction.value)).toBe(0n);
  });

  it("zero-resets a non-zero insufficient ERC-20 allowance before approving amountIn", async () => {
    const { registry } = offlineRegistry({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      inputDecimals: 6,
      outputDecimals: 18,
      unitSize: 1_000_000_000_000n,
      allowance: 500_000n,
    });
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const [reset, approval, swap] = flattenCapabilityTree(capability);
    if (!reset || !approval || !swap) throw new Error("missing Clober transactions");

    expect(flattenCapabilityTree(capability)).toHaveLength(3);
    expect(reset.capability).toMatchObject({
      protocol: "erc20",
      method: "approve",
      params: { amount: "0" },
    });
    expect(approval.capability).toMatchObject({
      protocol: "erc20",
      method: "approve",
      params: { amount: "1500000" },
    });
    expect(decodeFunctionData({ abi: ERC20Abi, data: reset.transaction.data })).toEqual({
      functionName: "approve",
      args: [CLOBER_CONTROLLER_ADDRESS, 0n],
    });
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toEqual({
      functionName: "approve",
      args: [CLOBER_CONTROLLER_ADDRESS, 1_500_000n],
    });
    expect(
      decodeFunctionData({ abi: CloberControllerAbi, data: swap.transaction.data }),
    ).toMatchObject({ functionName: "spend" });
  });

  it("skips ERC-20 approval when the current allowance covers amountIn", async () => {
    const { registry, readContract } = offlineRegistry({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      inputDecimals: 6,
      outputDecimals: 18,
      unitSize: 1_000_000_000_000n,
      allowance: 1_500_000n,
    });
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const [swap] = flattenCapabilityTree(capability);
    if (!swap) throw new Error("missing Clober transaction");

    expect(flattenCapabilityTree(capability)).toHaveLength(1);
    expect(
      decodeFunctionData({ abi: CloberControllerAbi, data: swap.transaction.data }),
    ).toMatchObject({ functionName: "spend" });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: USDC_ADDRESS,
        functionName: "allowance",
        args: [ACCOUNT, CLOBER_CONTROLLER_ADDRESS],
      }),
    );
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

  it("builds and parses the ERC-20 to native MON direction", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const expectedBookId = bookId({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      unitSize: 1_000_000_000_000n,
    });
    const { registry } = offlineRegistry({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      inputDecimals: 6,
      outputDecimals: 18,
      unitSize: 1_000_000_000_000n,
    });
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("missing Clober transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toEqual({
      functionName: "approve",
      args: [CLOBER_CONTROLLER_ADDRESS, 1_000_000n],
    });
    const decoded = decodeFunctionData({ abi: CloberControllerAbi, data: swap.transaction.data });
    expect(decoded).toEqual({
      functionName: "spend",
      args: [
        [
          {
            id: expectedBookId,
            limitPrice: 0n,
            baseAmount: 1_000_000n,
            minQuoteAmount: 1_990_000n,
            hookData: zeroHash,
          },
        ],
        [USDC_ADDRESS],
        [],
        1_700_001_200n,
      ],
    });
    expect(BigInt(swap.transaction.value)).toBe(0n);

    const take = takeChange(expectedBookId, CLOBER_CONTROLLER_ADDRESS, 123, 2n);
    const debit = erc20Transfer(USDC_ADDRESS, ACCOUNT, CLOBER_BOOK_MANAGER_ADDRESS, 1_000_000n);
    const credit = nativeTransfer(CLOBER_BOOK_MANAGER_ADDRESS, ACCOUNT, 2_000_000n);
    expect(registry.parseReceipt(capability, [take, debit, credit]).outcome).toMatchObject({
      fills: [{ bookId: expectedBookId.toString() }],
      settlements: [
        { operation: "transfer", token: USDC_ADDRESS, from: ACCOUNT },
        { operation: "transfer", token: NATIVE, to: ACCOUNT, amount: "2000000" },
      ],
    });
    expect(() =>
      registry.parseReceipt(capability, [
        take,
        debit,
        credit,
        erc20Transfer(USDC_ADDRESS, CLOBER_CONTROLLER_ADDRESS, ACCOUNT, 1n),
      ]),
    ).toThrow("contains an unexpected token or participant");
  });

  it("rejects markets outside the curated catalog before any chain read", async () => {
    const { registry, readContract } = offlineRegistry({ base: TOKEN_IN, quote: OTHER_TOKEN });
    await expect(
      registry.action("clober", "quote", ACCOUNT, {
        tokenIn: TOKEN_IN,
        tokenOut: OTHER_TOKEN,
        amountIn: "1",
      }),
    ).rejects.toThrow("supports only native MON/USDC markets");
    expect(readContract).not.toHaveBeenCalled();
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

  it("enforces the conservative 99.9% utilization boundary exactly", async () => {
    const minimumSpent = 999_000_000_000_000_000n;
    const accepted = offlineRegistry({ spentBaseAmount: minimumSpent }).registry;
    const quote = await accepted.action("clober", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected Query");
    expect(quote.data).toMatchObject({ estimatedAmountSpent: "0.999" });

    const rejected = offlineRegistry({ spentBaseAmount: minimumSpent - 1n }).registry;
    await expect(
      rejected.action("clober", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("cannot spend at least 99.9% of the input amount");
  });

  it("rejects a non-zero small quote when whole-unit dust exceeds the policy", async () => {
    const { registry } = offlineRegistry({
      amountOut: 20n,
      spentBaseAmount: 970_516_235_692_685n,
    });
    await expect(
      registry.action("clober", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "0.001",
      }),
    ).rejects.toThrow("cannot spend at least 99.9% of the input amount");
  });

  it("rejects a Viewer quote that claims to spend more than the requested input", async () => {
    const { registry } = offlineRegistry({ spentBaseAmount: 1_000_000_000_000_000_001n });
    await expect(
      registry.action("clober", "swap", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("exceeds the requested input amount");
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
    const { registry } = offlineRegistry({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      inputDecimals: 6,
      outputDecimals: 18,
      unitSize: 1_000_000_000_000n,
    });
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const expectedBookId = bookId({
      base: USDC_ADDRESS,
      quote: zeroAddress,
      unitSize: 1_000_000_000_000n,
    });
    const take = takeChange(expectedBookId, CLOBER_CONTROLLER_ADDRESS, 123, 9n);
    const debit = erc20Transfer(USDC_ADDRESS, ACCOUNT, CLOBER_BOOK_MANAGER_ADDRESS, 1_000_000n);
    const credit = nativeTransfer(CLOBER_BOOK_MANAGER_ADDRESS, ACCOUNT, 2_000_000n);
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
          token: USDC_ADDRESS,
          from: ACCOUNT,
          to: CLOBER_BOOK_MANAGER_ADDRESS,
          amount: "1000000",
        },
        {
          operation: "transfer",
          token: NATIVE,
          from: CLOBER_BOOK_MANAGER_ADDRESS,
          to: ACCOUNT,
          amount: "2000000",
        },
      ],
    });
    expect(receipt.changes[1]).toMatchObject({
      kind: "receipt",
      outcome: [expect.objectContaining({ operation: "transfer", token: USDC_ADDRESS })],
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
    expect(receipt.changes.map(firstChange)[0]).toBe(take);
    expect(receipt.changes.map(firstChange)[1]).toBe(debit);
    expect(receipt.changes.map(firstChange)[2]).toBe(credit);
  });

  it("allows multiple fills from one book but rejects a second book", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const expectedBookId = bookId({ base: zeroAddress, quote: USDC_ADDRESS, unitSize: 1n });
    const first = takeChange(expectedBookId, CLOBER_CONTROLLER_ADDRESS, -12, 2n);
    const second = takeChange(expectedBookId, CLOBER_CONTROLLER_ADDRESS, -13, 3n);
    const debit = nativeTransfer(ACCOUNT, CLOBER_CONTROLLER_ADDRESS, 1_000_000_000_000_000_000n);
    const settledInput = nativeTransfer(
      CLOBER_CONTROLLER_ADDRESS,
      CLOBER_BOOK_MANAGER_ADDRESS,
      1_000_000_000_000_000_000n,
    );
    const credit = erc20Transfer(USDC_ADDRESS, CLOBER_BOOK_MANAGER_ADDRESS, ACCOUNT, 2_000_000n);

    const receipt = registry.parseReceipt(capability, [debit, first, second, settledInput, credit]);
    expect(receipt.outcome).toMatchObject({
      fills: [
        { bookId: expectedBookId.toString(), tick: "-12", unit: "2" },
        { bookId: expectedBookId.toString(), tick: "-13", unit: "3" },
      ],
    });
    expect(() =>
      registry.parseReceipt(capability, [
        debit,
        first,
        takeChange(expectedBookId + 1n, CLOBER_CONTROLLER_ADDRESS, -13, 3n),
        settledInput,
        credit,
      ]),
    ).toThrow("contains multiple book IDs");
  });

  it("binds native settlement evidence to the curated market, user, and contracts", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const expectedBookId = bookId({ base: zeroAddress, quote: USDC_ADDRESS, unitSize: 1n });
    const take = takeChange(expectedBookId, CLOBER_CONTROLLER_ADDRESS, 123, 1n);
    const input = nativeTransfer(ACCOUNT, CLOBER_CONTROLLER_ADDRESS, 1_000_000n);
    const settledInput = nativeTransfer(
      CLOBER_CONTROLLER_ADDRESS,
      CLOBER_BOOK_MANAGER_ADDRESS,
      999_000n,
    );
    const fullySettledInput = nativeTransfer(
      CLOBER_CONTROLLER_ADDRESS,
      CLOBER_BOOK_MANAGER_ADDRESS,
      1_000_000n,
    );
    const output = erc20Transfer(USDC_ADDRESS, CLOBER_BOOK_MANAGER_ADDRESS, ACCOUNT, 2_000_000n);
    const refund = nativeTransfer(CLOBER_CONTROLLER_ADDRESS, ACCOUNT, 1_000n);

    expect(() =>
      registry.parseReceipt(capability, [input, take, settledInput, output, refund]),
    ).not.toThrow();

    const invalidCases: readonly {
      name: string;
      changes: readonly Change[];
      error: string;
    }[] = [
      {
        name: "missing output",
        changes: [input, take, fullySettledInput],
        error: "requires output-token settlement",
      },
      {
        name: "wrong output token",
        changes: [
          input,
          take,
          fullySettledInput,
          erc20Transfer(OTHER_TOKEN, CLOBER_BOOK_MANAGER_ADDRESS, ACCOUNT, 2_000_000n),
        ],
        error: "requires output-token settlement",
      },
      {
        name: "uncurated BookId",
        changes: [
          input,
          takeChange(expectedBookId + 1n, CLOBER_CONTROLLER_ADDRESS, 123, 1n),
          fullySettledInput,
          output,
        ],
        error: "not in the curated market catalog",
      },
      {
        name: "wrong output participant",
        changes: [
          input,
          take,
          fullySettledInput,
          erc20Transfer(USDC_ADDRESS, CLOBER_BOOK_MANAGER_ADDRESS, OTHER_TOKEN, 2_000_000n),
        ],
        error: "requires output-token settlement",
      },
      {
        name: "zero-value input",
        changes: [
          nativeTransfer(ACCOUNT, CLOBER_CONTROLLER_ADDRESS, 0n),
          take,
          fullySettledInput,
          output,
        ],
        error: "requires non-zero settlement amounts",
      },
      {
        name: "unrelated extra transfer",
        changes: [
          input,
          take,
          fullySettledInput,
          output,
          erc20Transfer(OTHER_TOKEN, ACCOUNT, CLOBER_BOOK_MANAGER_ADDRESS, 1n),
        ],
        error: "contains an unexpected token or participant",
      },
      {
        name: "unbalanced native refund",
        changes: [
          input,
          take,
          settledInput,
          output,
          nativeTransfer(CLOBER_CONTROLLER_ADDRESS, ACCOUNT, 999n),
        ],
        error: "native input and refund amounts do not balance",
      },
    ];
    for (const { name, changes, error } of invalidCases) {
      expect(() => registry.parseReceipt(capability, changes), name).toThrow(error);
    }
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

  it("does not accept a Take without input and output transfer evidence", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const expectedBookId = bookId({ base: zeroAddress, quote: USDC_ADDRESS, unitSize: 1n });
    const take = takeChange(expectedBookId, CLOBER_CONTROLLER_ADDRESS, 123, 1n);

    expect(() => registry.parseReceipt(capability, [take])).toThrow("requires one native input");
    expect(() =>
      registry.parseReceipt(capability, [
        take,
        erc20Approval(USDC_ADDRESS, ACCOUNT, CLOBER_CONTROLLER_ADDRESS, 1n),
      ]),
    ).toThrow("accepts only transfer settlements");
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

  it("rejects zero-unit Take events", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const expectedBookId = bookId({ base: zeroAddress, quote: USDC_ADDRESS, unitSize: 1n });
    expect(() =>
      registry.parseReceipt(capability, [
        takeChange(expectedBookId, CLOBER_CONTROLLER_ADDRESS, 123, 0n),
      ]),
    ).toThrow("Take must contain a non-zero unit amount");
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

  it("matches a zero-slippage Viewer quote in Controller.spend simulation", {
    timeout: 180_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Clober);
    const capability = await registry.action("clober", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
      slippage: 0,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const [swap] = flattenCapabilityTree(capability);
    if (!swap) throw new Error("missing Clober transaction");
    const decoded = decodeFunctionData({
      abi: CloberControllerAbi,
      data: swap.transaction.data,
    });
    if (decoded.functionName !== "spend") throw new Error("expected Controller.spend");
    const viewerAmountOut = decoded.args[0][0]?.minQuoteAmount;
    if (viewerAmountOut === undefined) throw new Error("missing Clober order");

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "swap",
      protocol: "clober",
    });
    const receipt = outcome.results[0]?.receipt;
    if (!receipt) throw new Error("missing Clober receipt");
    const swapOutcome = receipt.outcome as CloberSwapOutcome;
    const actualAmountOut = swapOutcome.settlements.reduce((sum, settlement) => {
      if (
        settlement.operation === "transfer" &&
        settlement.token !== NATIVE &&
        settlement.token.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        settlement.to.toLowerCase() === ACCOUNT.toLowerCase()
      ) {
        return sum + BigInt(settlement.amount);
      }
      return sum;
    }, 0n);
    expect(viewerAmountOut).toBeGreaterThan(0n);
    expect(actualAmountOut).toBeGreaterThanOrEqual(viewerAmountOut);
  });

  it("quotes the reverse USDC to native MON direction", { timeout: 60_000 }, async () => {
    const quote = await new Registry(await monadRuntime())
      .use(Clober)
      .action("clober", "quote", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: NATIVE,
        amountIn: "1",
      });
    if (quote.kind !== "query") throw new Error("expected Query");
    expect(
      Number((quote.data as { estimatedAmountOut: string }).estimatedAmountOut),
    ).toBeGreaterThan(0);
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
  allowance?: bigint;
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
      if (functionName === "decimals") {
        return address.toLowerCase() === base.toLowerCase() ? inputDecimals : outputDecimals;
      }
      if (functionName === "allowance") return options.allowance ?? 0n;
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

function erc20Approval(
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
): Change {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Approval",
      args: { owner, spender },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function nativeTransfer(from: `0x${string}`, to: `0x${string}`, amount: bigint): Change {
  return { kind: "nativeTransfer", from, to, value: amount.toString() };
}

function firstChange(entry: ReceiptResult["changes"][number]): Change {
  if (entry.kind === "change") return entry.change;
  const [child] = entry.changes;
  if (child?.kind !== "change") throw new Error("expected one nested ReceiptChange");
  return child.change;
}
