import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  NATIVE,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi, WETH9Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { AUSD_ADDRESS, monadRuntime, USDC_ADDRESS, WMON_ADDRESS } from "@themoss/system";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  type PublicClient,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import { pancakeV2PairAbi } from "../src/abis/v2-pair.js";
import { pancakeV2RouterAbi } from "../src/abis/v2-router.js";
import {
  PANCAKESWAP_V2_FACTORY_ADDRESS,
  PANCAKESWAP_V2_PAIR_ABI_SOURCE_ADDRESS,
  PANCAKESWAP_V2_ROUTER_ADDRESS,
  PancakeSwapV2,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const PAIR = getAddress("0x1111111111111111111111111111111111111111");
const SECOND_PAIR = getAddress("0x2222222222222222222222222222222222222222");

describe("PancakeSwapV2", () => {
  it("is self-describing and loads separate human-amount fields", async () => {
    const { registry } = offlineRegistry();
    expect(registry.discover({ protocol: "pancakeswap-v2" })).toMatchObject([
      { method: "quote", kind: "query", category: "dex" },
      { method: "swap", kind: "capability", verb: "swap", category: "dex" },
    ]);
    const [loaded] = registry.load([{ protocol: "pancakeswap-v2", method: "swap" }]);
    expect(loaded).toMatchObject({
      risk: ["fundOut", "approval", "priceImpact"],
      tags: ["amm", "v2"],
      params: {
        amountIn: { description: expect.stringContaining("Fixed input") },
        amountOut: { description: expect.stringContaining("Minimum output") },
        slippage: { type: { default: 50, maximum: 5_000 } },
      },
    });
  });

  it("requires exactly one amount side and rejects MON/WMON before router reads", async () => {
    const { registry, client } = offlineRegistry();
    for (const params of [
      { tokenIn: NATIVE, tokenOut: USDC_ADDRESS },
      { tokenIn: NATIVE, tokenOut: USDC_ADDRESS, amountIn: "1", amountOut: "1" },
    ]) {
      await expect(registry.action("pancakeswap-v2", "quote", ACCOUNT, params)).rejects.toThrow(
        "provide exactly one of amountIn or amountOut",
      );
    }
    await expect(
      registry.action("pancakeswap-v2", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: WMON_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("resolve to the same router token");
    expect(client.readContract).not.toHaveBeenCalled();
  });

  it("quotes exact input by maximizing output and target output by minimizing input", async () => {
    const { registry } = offlineRegistry();
    const exactInput = await registry.action("pancakeswap-v2", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
      slippage: 100,
    });
    expect(exactInput).toMatchObject({
      kind: "query",
      data: {
        amountSide: "amountIn",
        estimatedAmountOut: "0.03",
        minimumAmountOut: "0.0297",
        path: [USDC_ADDRESS, NATIVE, AUSD_ADDRESS],
      },
    });

    const targetOutput = await registry.action("pancakeswap-v2", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "0.03",
      slippage: 50,
    });
    expect(targetOutput).toMatchObject({
      kind: "query",
      data: {
        amountSide: "amountOut",
        estimatedAmountIn: "0.02",
        maximumAmountIn: "0.0201",
        minimumAmountOut: "0.03",
        path: [USDC_ADDRESS, NATIVE, AUSD_ADDRESS],
      },
    });
  });

  it("prefers the direct path when quotes are equal", async () => {
    const { registry } = offlineRegistry({ equalQuotes: true });
    const quote = await registry.action("pancakeswap-v2", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    expect(quote).toMatchObject({
      kind: "query",
      data: { path: [USDC_ADDRESS, AUSD_ADDRESS] },
    });
  });

  it("owns one native-input transaction", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const executable = flattenCapabilityTree(capability);
    expect(executable).toHaveLength(1);
    expect(executable[0]?.transaction).toMatchObject({
      from: ACCOUNT,
      to: PANCAKESWAP_V2_ROUTER_ADDRESS,
      value: `0x${(10n ** 18n).toString(16)}`,
    });
    const decoded = decodeFunctionData({
      abi: pancakeV2RouterAbi,
      data: executable[0]?.transaction.data ?? "0x",
    });
    expect(decoded.functionName).toBe("swapExactETHForTokens");
  });

  it("nests approval before one target-output swap transaction", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "0.03",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    expect(capability.children[0]).toMatchObject({
      kind: "capability",
      protocol: "erc20",
      method: "approve",
      params: {
        token: USDC_ADDRESS,
        spender: PANCAKESWAP_V2_ROUTER_ADDRESS,
        amount: "20100",
      },
    });
    const executable = flattenCapabilityTree(capability);
    expect(executable).toHaveLength(2);
    const decoded = decodeFunctionData({
      abi: pancakeV2RouterAbi,
      data: executable[1]?.transaction.data ?? "0x",
    });
    expect(decoded.functionName).toBe("swapTokensForExactTokens");
    expect(decoded.args?.slice(0, 3)).toEqual([
      30_000n,
      20_100n,
      [USDC_ADDRESS, WMON_ADDRESS, AUSD_ADDRESS],
    ]);
  });

  it("parses every direct token swap Change in exact order", async () => {
    const { registry } = offlineRegistry({ equalQuotes: true });
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const changes = [
      transferChange(USDC_ADDRESS, ACCOUNT, PAIR, 1_000_000n),
      transferChange(AUSD_ADDRESS, PAIR, ACCOUNT, 20_000n),
      syncChange(PAIR, 10_000_000n, 20_000_000n),
      swapChange(PAIR, 1_000_000n, 0n, 0n, 20_000n, ACCOUNT),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "swap",
      protocol: "pancakeswap-v2",
      sender: ACCOUNT,
      recipient: ACCOUNT,
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1000000",
      amountOut: "20000",
      pairs: [PAIR],
    });
    expect(flattenReceiptChanges(receipt)).toEqual(changes);
  });

  it("derives native input only from ordered wrap and Pair evidence", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const amount = 10n ** 18n;
    const changes = [
      nativeChange(ACCOUNT, PANCAKESWAP_V2_ROUTER_ADDRESS, amount),
      nativeChange(PANCAKESWAP_V2_ROUTER_ADDRESS, WMON_ADDRESS, amount),
      wethChange("Deposit", PANCAKESWAP_V2_ROUTER_ADDRESS, amount),
      transferChange(WMON_ADDRESS, PANCAKESWAP_V2_ROUTER_ADDRESS, PAIR, amount),
      transferChange(USDC_ADDRESS, PAIR, ACCOUNT, 20_000n),
      syncChange(PAIR, amount, 20_000n),
      swapChange(PAIR, amount, 0n, 0n, 20_000n, ACCOUNT),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      sender: ACCOUNT,
      recipient: ACCOUNT,
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: amount.toString(),
      amountOut: "20000",
    });
    expect(flattenReceiptChanges(receipt)).toEqual(changes);
  });

  it("parses a two-Pair WMON hop in execution order", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const changes = [
      transferChange(USDC_ADDRESS, ACCOUNT, PAIR, 1_000_000n),
      transferChange(WMON_ADDRESS, PAIR, SECOND_PAIR, 500_000n),
      syncChange(PAIR, 1_000_000n, 500_000n),
      swapChange(PAIR, 1_000_000n, 0n, 0n, 500_000n, SECOND_PAIR),
      transferChange(AUSD_ADDRESS, SECOND_PAIR, ACCOUNT, 20_000n),
      syncChange(SECOND_PAIR, 500_000n, 20_000n),
      swapChange(SECOND_PAIR, 500_000n, 0n, 0n, 20_000n, ACCOUNT),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1000000",
      amountOut: "20000",
      pairs: [PAIR, SECOND_PAIR],
    });
    expect(flattenReceiptChanges(receipt)).toEqual(changes);
  });

  it("derives native output from ordered withdrawal and payout evidence", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const amountOut = 2n * 10n ** 18n;
    const changes = [
      transferChange(USDC_ADDRESS, ACCOUNT, PAIR, 1_000_000n),
      transferChange(WMON_ADDRESS, PAIR, PANCAKESWAP_V2_ROUTER_ADDRESS, amountOut),
      syncChange(PAIR, 1_000_000n, amountOut),
      swapChange(PAIR, 1_000_000n, 0n, 0n, amountOut, PANCAKESWAP_V2_ROUTER_ADDRESS),
      nativeChange(WMON_ADDRESS, PANCAKESWAP_V2_ROUTER_ADDRESS, amountOut),
      wethChange("Withdrawal", PANCAKESWAP_V2_ROUTER_ADDRESS, amountOut),
      nativeChange(PANCAKESWAP_V2_ROUTER_ADDRESS, ACCOUNT, amountOut),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      sender: ACCOUNT,
      recipient: ACCOUNT,
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1000000",
      amountOut: amountOut.toString(),
    });
    expect(flattenReceiptChanges(receipt)).toEqual(changes);
  });

  it("rejects missing or reordered Pair evidence", async () => {
    const { registry } = offlineRegistry({ equalQuotes: true });
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const input = transferChange(USDC_ADDRESS, ACCOUNT, PAIR, 1_000_000n);
    const output = transferChange(AUSD_ADDRESS, PAIR, ACCOUNT, 20_000n);
    const sync = syncChange(PAIR, 10_000_000n, 20_000_000n);
    const swap = swapChange(PAIR, 1_000_000n, 0n, 0n, 20_000n, ACCOUNT);
    expect(() => registry.parseReceipt(capability, [input, sync, swap])).toThrow("output transfer");
    expect(() => registry.parseReceipt(capability, [input, output, swap, sync])).toThrow(
      "ordered Sync/Swap",
    );
  });

  it("rejects disconnected or internally inconsistent Pair legs", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    const base = [
      transferChange(USDC_ADDRESS, ACCOUNT, PAIR, 1_000_000n),
      transferChange(WMON_ADDRESS, PAIR, SECOND_PAIR, 500_000n),
      syncChange(PAIR, 1_000_000n, 500_000n),
      swapChange(PAIR, 1_000_000n, 0n, 0n, 500_000n, SECOND_PAIR),
      transferChange(AUSD_ADDRESS, SECOND_PAIR, ACCOUNT, 20_000n),
      syncChange(SECOND_PAIR, 500_000n, 20_000n),
      swapChange(SECOND_PAIR, 500_000n, 0n, 0n, 20_000n, ACCOUNT),
    ] as const;

    const wrongIntermediateAmount = [...base];
    wrongIntermediateAmount[3] = swapChange(PAIR, 1_000_000n, 0n, 0n, 600_000n, SECOND_PAIR);
    expect(() => registry.parseReceipt(capability, wrongIntermediateAmount)).toThrow(
      "transfer amounts differ",
    );

    const wrongNextPair = [...base];
    wrongNextPair[3] = swapChange(PAIR, 1_000_000n, 0n, 0n, 500_000n, ACCOUNT);
    expect(() => registry.parseReceipt(capability, wrongNextPair)).toThrow(
      "output recipient differs",
    );
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("PancakeSwapV2 Monad mainnet", () => {
  it("verifies the official Router deployment and quotes both amount sides", {
    timeout: 90_000,
  }, async () => {
    const runtime = await monadRuntime();
    expect(
      (await runtime.client.getCode({ address: PANCAKESWAP_V2_ROUTER_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
    expect(
      (await runtime.client.getCode({ address: PANCAKESWAP_V2_FACTORY_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
    expect(
      (await runtime.client.getCode({ address: PANCAKESWAP_V2_PAIR_ABI_SOURCE_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
    expect(
      await runtime.client.readContract({
        address: PANCAKESWAP_V2_ROUTER_ADDRESS,
        abi: pancakeV2RouterAbi,
        functionName: "factory",
      }),
    ).toBe(PANCAKESWAP_V2_FACTORY_ADDRESS);
    expect(
      await runtime.client.readContract({
        address: PANCAKESWAP_V2_ROUTER_ADDRESS,
        abi: pancakeV2RouterAbi,
        functionName: "WETH",
      }),
    ).toBe(WMON_ADDRESS);
    expect(
      await runtime.client.readContract({
        address: PANCAKESWAP_V2_PAIR_ABI_SOURCE_ADDRESS,
        abi: pancakeV2PairAbi,
        functionName: "factory",
      }),
    ).toBe(PANCAKESWAP_V2_FACTORY_ADDRESS);
    expect(
      new Set(
        await Promise.all(
          (["token0", "token1"] as const).map((functionName) =>
            runtime.client.readContract({
              address: PANCAKESWAP_V2_PAIR_ABI_SOURCE_ADDRESS,
              abi: pancakeV2PairAbi,
              functionName,
            }),
          ),
        ),
      ),
    ).toEqual(new Set([WMON_ADDRESS, USDC_ADDRESS]));
    const registry = new Registry(runtime).use(PancakeSwapV2);
    for (const amount of [{ amountIn: "1" }, { amountOut: "0.01" }]) {
      const quote = await registry.action("pancakeswap-v2", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        ...amount,
      });
      if (quote.kind !== "query") throw new Error("expected Query");
      expect(quote.data).toMatchObject({ path: [NATIVE, USDC_ADDRESS] });
    }
  });

  it("simulates a native swap into an exhaustive typed Receipt", { timeout: 180_000 }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(PancakeSwapV2);
    const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
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
      protocol: "pancakeswap-v2",
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
    });
  });
});

function offlineRegistry(options: { equalQuotes?: boolean } = {}) {
  const client = {
    readContract: vi.fn(
      async ({ functionName, args }: { functionName: string; args?: readonly unknown[] }) => {
        if (functionName === "decimals") return 6;
        if (functionName === "name") return "Mock token";
        if (functionName === "symbol") return "MOCK";
        const path = args?.[1] as readonly AddressValue[] | undefined;
        const amount = (args?.[0] as bigint | undefined) ?? 0n;
        if (!path) throw new Error(`unexpected read ${functionName}`);
        if (functionName === "getAmountsOut") {
          const output = options.equalQuotes || path.length === 2 ? 20_000n : 30_000n;
          return path.length === 2 ? [amount, output] : [amount, 25_000n, output];
        }
        if (functionName === "getAmountsIn") {
          const input = options.equalQuotes || path.length === 2 ? 30_000n : 20_000n;
          return path.length === 2 ? [input, amount] : [input, 25_000n, amount];
        }
        throw new Error(`unexpected read ${functionName}`);
      },
    ),
  } as unknown as PublicClient;
  return {
    client: client as PublicClient & { readContract: ReturnType<typeof vi.fn> },
    registry: new Registry({ rpcUrl: "http://offline", client }).use(PancakeSwapV2),
  };
}

type AddressValue = `0x${string}`;

function nativeChange(from: AddressValue, to: AddressValue, value: bigint): Change {
  return { kind: "nativeTransfer", from, to, value: value.toString() };
}

function transferChange(
  token: AddressValue,
  from: AddressValue,
  to: AddressValue,
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

function syncChange(pair: AddressValue, reserve0: bigint, reserve1: bigint): Change {
  return {
    kind: "event",
    address: pair,
    topics: encodeEventTopics({ abi: pancakeV2PairAbi, eventName: "Sync" }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint112" }, { type: "uint112" }], [reserve0, reserve1]),
  };
}

function swapChange(
  pair: AddressValue,
  amount0In: bigint,
  amount1In: bigint,
  amount0Out: bigint,
  amount1Out: bigint,
  to: AddressValue,
): Change {
  return {
    kind: "event",
    address: pair,
    topics: encodeEventTopics({
      abi: pancakeV2PairAbi,
      eventName: "Swap",
      args: { sender: PANCAKESWAP_V2_ROUTER_ADDRESS, to },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [amount0In, amount1In, amount0Out, amount1Out],
    ),
  };
}

function wethChange(
  eventName: "Deposit" | "Withdrawal",
  account: AddressValue,
  amount: bigint,
): Change {
  return {
    kind: "event",
    address: WMON_ADDRESS,
    topics: encodeEventTopics({
      abi: WETH9Abi,
      eventName,
      args: eventName === "Deposit" ? { dst: account } : { src: account },
    } as never) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function flattenReceiptChanges(receipt: ReceiptResult): Change[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.change] : flattenReceiptChanges(entry),
  );
}
