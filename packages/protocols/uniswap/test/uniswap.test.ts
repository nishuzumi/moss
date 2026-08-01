import { readFileSync } from "node:fs";
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
import { USDC_ADDRESS } from "@themoss/system";
import {
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  getAddress,
  keccak256,
  toEventSelector,
  toFunctionSelector,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  Permit2Abi,
  PoolManagerAbi,
  UniversalRouterAbi,
  V4QuoterAbi,
} from "../src/abis/uniswap.js";
import {
  PERMIT2_ADDRESS,
  UNISWAP_V4_POOL_MANAGER_ADDRESS,
  UNISWAP_V4_QUOTER_ADDRESS,
  UNISWAP_V4_ROUTER_ADDRESS,
  Uniswap,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");
const POOL_ID = "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

/** Mock exact-input quotes per fee tier; missing tiers revert like an
 * uninitialized v4 pool. */
const TIER_QUOTES = new Map<number, bigint>([
  [500, 20_000_000n],
  [3_000, 19_000_000n],
]);

const EXACT_INPUT_SINGLE_PARAMS = [
  {
    type: "tuple",
    components: [
      {
        name: "poolKey",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "zeroForOne", type: "bool" },
      { name: "amountIn", type: "uint128" },
      { name: "amountOutMinimum", type: "uint128" },
      { name: "hookData", type: "bytes" },
    ],
  },
] as const;

describe("Uniswap", () => {
  it("is self-describing and loads bounded slippage metadata", async () => {
    const { registry } = offlineRegistry();
    expect(registry.discover({ protocol: "uniswap" })).toMatchObject([
      { method: "quote", kind: "query", category: "dex" },
      { method: "swap", kind: "capability", verb: "swap", category: "dex" },
      { method: "permit2Approve", kind: "capability", verb: "approve", category: "dex" },
    ]);
    const [loaded] = registry.load([{ protocol: "uniswap", method: "swap" }]);
    expect(loaded).toMatchObject({
      risk: ["fundOut", "approval", "priceImpact"],
      tags: ["amm", "v4"],
      params: {
        amountIn: { description: expect.stringContaining("Fixed input") },
        slippage: {
          description: expect.stringContaining("adverse movement"),
          type: {
            default: 50,
            minimum: 1,
            maximum: 5_000,
            description: expect.stringContaining("1 bps equals 0.01%"),
          },
        },
      },
    });
  });

  it("rejects equal tokens and out-of-range slippage before any chain read", async () => {
    const { registry, client } = offlineRegistry();
    await expect(
      registry.action("uniswap", "quote", ACCOUNT, {
        tokenIn: USDC_ADDRESS,
        tokenOut: USDC_ADDRESS.toLowerCase(),
        amountIn: "1",
      }),
    ).rejects.toThrow("tokenIn and tokenOut must differ");
    for (const slippage of [0, 5_001]) {
      await expect(
        registry.action("uniswap", "swap", ACCOUNT, {
          tokenIn: NATIVE,
          tokenOut: USDC_ADDRESS,
          amountIn: "1",
          slippage,
        }),
      ).rejects.toThrow();
    }
    expect(client.call).not.toHaveBeenCalled();
  });

  it("fails when no canonical fee tier has an initialized pool", async () => {
    const { registry } = offlineRegistry(new Map());
    await expect(
      registry.action("uniswap", "quote", ACCOUNT, {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("no initialized Uniswap v4 pool");
  });

  it("quotes the best tier in display units", async () => {
    const { registry } = offlineRegistry();
    const quote = await registry.action("uniswap", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    expect(quote).toMatchObject({
      kind: "query",
      data: {
        amountIn: "1",
        estimatedAmountOut: "20",
        minimumAmountOut: "19.9",
        feeTier: 500,
        tickSpacing: 10,
        path: [NATIVE, USDC_ADDRESS],
      },
    });
  });

  it("builds a native exact-in swap as one Universal Router transaction", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("uniswap", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const flattened = flattenCapabilityTree(capability);
    expect(flattened).toHaveLength(1);
    const swap = flattened[0];
    if (!swap) throw new Error("missing swap transaction");
    expect(swap.transaction.to).toBe(UNISWAP_V4_ROUTER_ADDRESS);
    expect(swap.transaction.value).toBe("0xde0b6b3a7640000");

    const decoded = decodeFunctionData({ abi: UniversalRouterAbi, data: swap.transaction.data });
    expect(decoded.functionName).toBe("execute");
    const [commands, inputs] = decoded.args as readonly [Hex, readonly Hex[], bigint];
    expect(commands).toBe("0x10");
    const input = inputs[0];
    if (!input) throw new Error("missing V4_SWAP input");
    const [actions, actionParams] = decodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      input,
    );
    expect(actions).toBe("0x060c0f");
    expect(actionParams).toHaveLength(3);
    const [swapAction] = decodeAbiParameters(EXACT_INPUT_SINGLE_PARAMS, actionParams[0] as Hex);
    expect(swapAction).toEqual({
      poolKey: {
        currency0: ZERO,
        currency1: USDC_ADDRESS,
        fee: 500,
        tickSpacing: 10,
        hooks: ZERO,
      },
      zeroForOne: true,
      amountIn: 10n ** 18n,
      amountOutMinimum: 19_900_000n,
      hookData: "0x",
    });
    expect(
      decodeAbiParameters([{ type: "address" }, { type: "uint256" }], actionParams[1] as Hex),
    ).toEqual([ZERO, 10n ** 18n]);
    expect(
      decodeAbiParameters([{ type: "address" }, { type: "uint256" }], actionParams[2] as Hex),
    ).toEqual([USDC_ADDRESS, 19_900_000n]);
  });

  it("settles ERC-20 input through exact-amount plain approvals", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("uniswap", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
      slippage: 100,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(capability.children[1]).toMatchObject({
      kind: "capability",
      protocol: "uniswap",
      method: "permit2Approve",
    });
    const [approval, permit2Approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !permit2Approval || !swap) throw new Error("missing swap transactions");

    expect(approval.transaction.to).toBe(USDC_ADDRESS);
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [PERMIT2_ADDRESS, 1_000_000n],
    });

    expect(permit2Approval.transaction.to).toBe(PERMIT2_ADDRESS);
    const permit2Decoded = decodeFunctionData({
      abi: Permit2Abi,
      data: permit2Approval.transaction.data,
    });
    expect(permit2Decoded).toMatchObject({
      functionName: "approve",
      args: [USDC_ADDRESS, UNISWAP_V4_ROUTER_ADDRESS, 1_000_000n, expect.any(Number)],
    });

    expect(swap.transaction.value).toBe("0x0");
    const decoded = decodeFunctionData({ abi: UniversalRouterAbi, data: swap.transaction.data });
    const [, inputs, deadline] = decoded.args as readonly [Hex, readonly Hex[], bigint];
    expect((permit2Decoded.args as readonly unknown[])[3]).toBe(Number(deadline));
    const [, actionParams] = decodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      inputs[0] as Hex,
    );
    const [swapAction] = decodeAbiParameters(EXACT_INPUT_SINGLE_PARAMS, actionParams[0] as Hex);
    expect(swapAction).toMatchObject({
      zeroForOne: false,
      amountIn: 1_000_000n,
      amountOutMinimum: 19_800_000n,
    });
    expect(
      decodeAbiParameters([{ type: "address" }, { type: "uint256" }], actionParams[1] as Hex),
    ).toEqual([USDC_ADDRESS, 1_000_000n]);
    expect(
      decodeAbiParameters([{ type: "address" }, { type: "uint256" }], actionParams[2] as Hex),
    ).toEqual([ZERO, 19_800_000n]);
  });

  it("translates ordered swap Changes and cross-checks them against the Swap event", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("uniswap", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const valueIn = nativeTransfer(ACCOUNT, UNISWAP_V4_ROUTER_ADDRESS, 10n ** 18n);
    const swapEvent = poolManagerSwap(-(10n ** 18n), 20_000_000n, 500);
    const settle = nativeTransfer(
      UNISWAP_V4_ROUTER_ADDRESS,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      10n ** 18n,
    );
    const take = erc20Transfer(USDC_ADDRESS, UNISWAP_V4_POOL_MANAGER_ADDRESS, ACCOUNT, 20_000_000n);
    const changes = [valueIn, swapEvent, settle, take] as const;

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "swap",
      protocol: "uniswap",
      recipient: ACCOUNT,
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1000000000000000000",
      amountOut: "20000000",
      fee: 500,
    });
    expect(receipt.text).toBe(
      `Uniswap v4 Swap: 1000000000000000000 native to 20000000 ${USDC_ADDRESS} for ${ACCOUNT}`,
    );
    expect(receipt.changes[1]).toMatchObject({
      kind: "change",
      text: "Uniswap v4 Swap: 1000000000000000000 in, 20000000 out at fee tier 500 by Package(Uniswap:UniversalRouter)",
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("parses a native-output swap where the PoolManager pays the recipient", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("uniswap", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const swapNode = capability;

    const settle = erc20Transfer(
      USDC_ADDRESS,
      ACCOUNT,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      1_000_000n,
    );
    const swapEvent = poolManagerSwap(5n * 10n ** 16n, -1_000_000n, 500);
    const take = nativeTransfer(UNISWAP_V4_POOL_MANAGER_ADDRESS, ACCOUNT, 5n * 10n ** 16n);
    const receipt = registry.parseReceipt(swapNode, [settle, swapEvent, take]);
    expect(receipt.outcome).toMatchObject({
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1000000",
      amountOut: "50000000000000000",
      recipient: ACCOUNT,
    });
  });

  it("rejects swap evidence that does not reconcile", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("uniswap", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const valueIn = nativeTransfer(ACCOUNT, UNISWAP_V4_ROUTER_ADDRESS, 10n ** 18n);
    const swapEvent = poolManagerSwap(-(10n ** 18n), 20_000_000n, 500);
    const settle = nativeTransfer(
      UNISWAP_V4_ROUTER_ADDRESS,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      10n ** 18n,
    );
    const take = erc20Transfer(USDC_ADDRESS, UNISWAP_V4_POOL_MANAGER_ADDRESS, ACCOUNT, 20_000_000n);

    expect(() => registry.parseReceipt(capability, [valueIn, settle, take])).toThrow(
      "requires the PoolManager Swap event",
    );
    expect(() =>
      registry.parseReceipt(capability, [valueIn, swapEvent, swapEvent, settle, take]),
    ).toThrow("multiple Swap events");
    expect(() =>
      registry.parseReceipt(capability, [
        valueIn,
        swapEvent,
        nativeTransfer(UNISWAP_V4_ROUTER_ADDRESS, UNISWAP_V4_POOL_MANAGER_ADDRESS, 1n),
        take,
      ]),
    ).toThrow("input settlement does not match");
    expect(() =>
      registry.parseReceipt(capability, [
        valueIn,
        swapEvent,
        settle,
        erc20Transfer(USDC_ADDRESS, UNISWAP_V4_POOL_MANAGER_ADDRESS, ACCOUNT, 1n),
      ]),
    ).toThrow("output settlement does not match");
    expect(() =>
      registry.parseReceipt(capability, [
        valueIn,
        swapEvent,
        settle,
        take,
        nativeTransfer(ACCOUNT, getAddress("0x9999999999999999999999999999999999999999"), 5n),
      ]),
    ).toThrow("not part of a Uniswap swap");
    expect(() =>
      registry.parseReceipt(capability, [
        valueIn,
        poolManagerSwap(-(10n ** 18n), -20_000_000n, 500),
        settle,
        take,
      ]),
    ).toThrow("do not describe an exact-in swap");
  });

  it("parses the Permit2 approval Receipt and pins its spender", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("uniswap", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const permit2Node = capability.children[1];
    if (permit2Node?.kind !== "capability") throw new Error("expected permit2 capability");
    const expiration = (permit2Node.params as { expiration: string }).expiration;

    const approval = permit2Approval(ACCOUNT, USDC_ADDRESS, 1_000_000n, BigInt(expiration));
    const receipt = registry.parseReceipt(permit2Node, [approval]);
    expect(receipt.outcome).toEqual({
      operation: "approve",
      token: USDC_ADDRESS,
      owner: ACCOUNT,
      spender: UNISWAP_V4_ROUTER_ADDRESS,
      amount: "1000000",
      expiration,
    });
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `Permit2 Approval: ${ACCOUNT} approved Package(Uniswap:UniversalRouter) for 1000000 ${USDC_ADDRESS} until ${expiration}`,
    });
    expect(receipt.changes.map(firstChange)).toEqual([approval]);

    const foreignSpender: Change = {
      kind: "event",
      address: PERMIT2_ADDRESS,
      topics: encodeEventTopics({
        abi: Permit2Abi,
        eventName: "Approval",
        args: { owner: ACCOUNT, token: USDC_ADDRESS, spender: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [{ type: "uint160" }, { type: "uint48" }],
        [1_000_000n, Number(expiration)],
      ),
    };
    expect(() => registry.parseReceipt(permit2Node, [foreignSpender])).toThrow(
      "spender is not the Universal Router",
    );
    expect(() =>
      registry.parseReceipt(permit2Node, [
        erc20Transfer(USDC_ADDRESS, ACCOUNT, PERMIT2_ADDRESS, 1n),
      ]),
    ).toThrow("expects one Permit2 event");
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Uniswap mainnet", () => {
  it("matches the pinned deployments and quotes both directions live", {
    timeout: 120_000,
  }, async () => {
    const runtime = await createRuntime();
    const manifest = JSON.parse(
      readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
    ) as Record<string, { address: `0x${string}`; deployedBytecodeKeccak256: Hex }>;
    const codes = new Map<string, Hex>();
    for (const key of ["universalRouter", "v4Quoter", "poolManager", "permit2"]) {
      const entry = manifest[key];
      if (!entry) throw new Error(`abis.json is missing ${key}`);
      const code = await runtime.client.getCode({ address: entry.address });
      if (!code || code === "0x") throw new Error(`${key} has no deployed bytecode`);
      expect(keccak256(code), key).toBe(entry.deployedBytecodeKeccak256);
      codes.set(key, code);
    }
    expect(manifest.universalRouter?.address).toBe(UNISWAP_V4_ROUTER_ADDRESS);
    expect(manifest.v4Quoter?.address).toBe(UNISWAP_V4_QUOTER_ADDRESS);
    expect(manifest.poolManager?.address).toBe(UNISWAP_V4_POOL_MANAGER_ADDRESS);
    expect(manifest.permit2?.address).toBe(PERMIT2_ADDRESS);

    // The vendored ABI surface this adapter calls exists in the deployed
    // bytecode, and the quoter is wired to the pinned PoolManager.
    expect(codes.get("universalRouter")).toContain(
      toFunctionSelector("execute(bytes,bytes[],uint256)").slice(2),
    );
    expect(codes.get("v4Quoter")).toContain(
      toFunctionSelector(
        "quoteExactInputSingle(((address,address,uint24,int24,address),bool,uint128,bytes))",
      ).slice(2),
    );
    expect(codes.get("permit2")).toContain(
      toFunctionSelector("approve(address,address,uint160,uint48)").slice(2),
    );
    expect(codes.get("poolManager")).toContain(
      toEventSelector("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)").slice(2),
    );
    const wiredPoolManager = await runtime.client.readContract({
      address: UNISWAP_V4_QUOTER_ADDRESS,
      abi: V4QuoterAbi,
      functionName: "poolManager",
    });
    expect(wiredPoolManager).toBe(UNISWAP_V4_POOL_MANAGER_ADDRESS);

    const registry = new Registry(runtime).use(Uniswap);
    const quote = await registry.action("uniswap", "quote", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toMatchObject({ amountIn: "1", path: [NATIVE, USDC_ADDRESS] });
    expect(
      Number((quote.data as { estimatedAmountOut: string }).estimatedAmountOut),
    ).toBeGreaterThan(0);

    const reverse = await registry.action("uniswap", "quote", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
    });
    if (reverse.kind !== "query") throw new Error("expected query");
    expect(
      Number((reverse.data as { estimatedAmountOut: string }).estimatedAmountOut),
    ).toBeGreaterThan(0);
  });

  it("simulates a native swap into an exhaustive typed Receipt with zero Warnings", {
    timeout: 180_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Uniswap);
    const capability = await registry.action("uniswap", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "swap",
      protocol: "uniswap",
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: (10n ** 18n).toString(),
    });
    expect(outcome.results[0]?.receipt?.text).toContain("Uniswap v4 Swap");
  });

  it("simulates the chained ERC-20 approval path live", { timeout: 180_000 }, async () => {
    // USDC -> native MON builds erc20.approve to Permit2, then
    // uniswap.permit2Approve to the router, then the Universal Router
    // swap, state-chained in one simulate run. The unfunded test account
    // proves both approval Receipts live with zero Warnings; the final
    // swap then reverts only on the account's missing USDC balance
    // (deterministic for any unfunded account), never on encoding.
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Uniswap);
    const capability = await registry.action("uniswap", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const flattened = flattenCapabilityTree(capability);
    expect(flattened.map(({ capability: node }) => `${node.protocol}.${node.method}`)).toEqual([
      "erc20.approve",
      "uniswap.permit2Approve",
      "uniswap.swap",
    ]);
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.results).toHaveLength(3);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "approve",
      spender: PERMIT2_ADDRESS,
    });
    expect(outcome.results[1]?.warnings).toEqual([]);
    expect(outcome.results[1]?.receipt?.outcome).toMatchObject({
      operation: "approve",
      token: USDC_ADDRESS,
      spender: UNISWAP_V4_ROUTER_ADDRESS,
      amount: "1000000",
    });
    expect(outcome.results[2]?.reverted).toBe(true);
    expect(outcome.halted?.transactionIndex).toBe(2);
  });
});

function offlineRegistry(tierQuotes: ReadonlyMap<number, bigint> = TIER_QUOTES) {
  const client = {
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
      if (functionName === "decimals") return 6;
      throw new Error(`unexpected read ${functionName}`);
    }),
    call: vi.fn(async ({ to, data }: { to: string; data: Hex }) => {
      if (to.toLowerCase() !== UNISWAP_V4_QUOTER_ADDRESS.toLowerCase()) {
        throw new Error(`unexpected call ${to}`);
      }
      const decoded = decodeFunctionData({ abi: V4QuoterAbi, data });
      if (decoded.functionName !== "quoteExactInputSingle") {
        throw new Error(`unexpected call ${decoded.functionName}`);
      }
      const [params] = decoded.args as readonly [{ poolKey: { fee: number } }];
      const amountOut = tierQuotes.get(params.poolKey.fee);
      if (amountOut === undefined) throw new Error("execution reverted: pool not initialized");
      return {
        data: encodeFunctionResult({
          abi: V4QuoterAbi,
          functionName: "quoteExactInputSingle",
          result: [amountOut, 70_000n],
        }),
      };
    }),
  } as unknown as MossRuntime["client"];
  return {
    client: client as MossRuntime["client"] & { call: ReturnType<typeof vi.fn> },
    registry: new Registry({ rpcUrl: "http://offline", client }).use(Uniswap),
  };
}

function nativeTransfer(from: `0x${string}`, to: `0x${string}`, value: bigint): Change {
  return { kind: "nativeTransfer", from, to, value: value.toString() };
}

function poolManagerSwap(amount0: bigint, amount1: bigint, fee: number): Change {
  return {
    kind: "event",
    address: UNISWAP_V4_POOL_MANAGER_ADDRESS,
    topics: encodeEventTopics({
      abi: PoolManagerAbi,
      eventName: "Swap",
      args: { id: POOL_ID, sender: UNISWAP_V4_ROUTER_ADDRESS },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [
        { type: "int128" },
        { type: "int128" },
        { type: "uint160" },
        { type: "uint128" },
        { type: "int24" },
        { type: "uint24" },
      ],
      [amount0, amount1, 79_228_162_514_264_337_593_543_950_336n, 10n ** 18n, 0, fee],
    ),
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

function permit2Approval(
  owner: `0x${string}`,
  token: `0x${string}`,
  amount: bigint,
  expiration: bigint,
): Change {
  return {
    kind: "event",
    address: PERMIT2_ADDRESS,
    topics: encodeEventTopics({
      abi: Permit2Abi,
      eventName: "Approval",
      args: { owner, token, spender: UNISWAP_V4_ROUTER_ADDRESS },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint160" }, { type: "uint48" }],
      [amount, Number(expiration)],
    ),
  };
}

function firstChange(entry: ReceiptResult["changes"][number]): Change {
  if (entry.kind === "change") return entry.change;
  const [child] = entry.changes;
  if (child?.kind !== "change") throw new Error("expected one nested ReceiptChange");
  return child.change;
}
