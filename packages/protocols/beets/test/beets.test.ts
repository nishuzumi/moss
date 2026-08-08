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
import { AUSD_ADDRESS, USDC_ADDRESS, WMON_ADDRESS } from "@themoss/system";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  getAddress,
} from "viem";
import { describe, expect, it } from "vitest";
import { BeetsRouterAbi, BeetsVaultAbi, BeetsVaultExplorerAbi } from "../src/abis/beets.js";
import {
  BEETS_ROUTER_ADDRESS,
  BEETS_VAULT_ADDRESS,
  BEETS_VAULT_EXPLORER_ADDRESS,
  BEETS_VAULT_EXTENSION_ADDRESS,
  Beets,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const POOL = getAddress("0x1111111111111111111111111111111111111111");
const POOL_TOKENS = [WMON_ADDRESS, USDC_ADDRESS, AUSD_ADDRESS] as const;
const BALANCES = [1_000_000_000_000_000_000_000n, 1_000_000_000n, 1_000_000_000n];
const GMON_ADDRESS = getAddress("0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081");
const LIVE_WMON_GMON_POOL = getAddress("0x66b7b2389ccedF5f0F5217b7811741344b34b4fA");

const DECIMALS: Record<string, number> = {
  [WMON_ADDRESS.toLowerCase()]: 18,
  [USDC_ADDRESS.toLowerCase()]: 6,
  [AUSD_ADDRESS.toLowerCase()]: 6,
  [POOL.toLowerCase()]: 18,
};

describe("Beets", () => {
  it("loads the swap surface with human amounts and slippage defaults", async () => {
    const { registry } = offlineRegistry();
    const [loaded] = registry.load([{ protocol: "beets", method: "swap" }]);
    expect(loaded?.params.amountIn).toMatchObject({
      description: expect.stringContaining("Fixed input"),
      type: { description: expect.stringContaining("display units") },
    });
    expect(loaded?.params.amountOut).toMatchObject({
      description: expect.stringContaining("Minimum output"),
    });
    expect(loaded?.params.slippage).toMatchObject({
      type: { default: 50, minimum: 50, maximum: 5_000 },
    });
    await expect(
      registry.action("beets", "swap", ACCOUNT, {
        pool: POOL,
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
      }),
    ).rejects.toThrow("provide exactly one of amountIn or amountOut");
    await expect(
      registry.action("beets", "swap", ACCOUNT, {
        pool: POOL,
        tokenIn: USDC_ADDRESS,
        tokenOut: AUSD_ADDRESS,
        amountIn: "1",
        amountOut: "1",
      }),
    ).rejects.toThrow("provide exactly one of amountIn or amountOut");
    for (const slippage of [49, 5_001]) {
      await expect(
        registry.action("beets", "swap", ACCOUNT, {
          pool: POOL,
          tokenIn: USDC_ADDRESS,
          tokenOut: AUSD_ADDRESS,
          amountIn: "1",
          slippage,
        }),
      ).rejects.toThrow();
    }
  });

  it("rejects tokens outside the pool and identical sides", async () => {
    const { registry } = offlineRegistry();
    await expect(
      registry.action("beets", "swap", ACCOUNT, {
        pool: POOL,
        tokenIn: USDC_ADDRESS,
        tokenOut: getAddress("0x9999999999999999999999999999999999999999"),
        amountIn: "1",
      }),
    ).rejects.toThrow("tokenOut is not a token of pool");
    await expect(
      registry.action("beets", "swap", ACCOUNT, {
        pool: POOL,
        tokenIn: USDC_ADDRESS,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
      }),
    ).rejects.toThrow("tokenIn and tokenOut must differ");
  });

  it("builds approve + swapSingleTokenExactIn for an ERC20 exact-in swap", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("beets", "swap", ACCOUNT, {
      pool: POOL,
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [approval, swap] = flattenCapabilityTree(capability);
    if (!approval || !swap) throw new Error("missing Beets transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [BEETS_ROUTER_ADDRESS, 1_500_000n],
    });
    const decoded = decodeFunctionData({ abi: BeetsRouterAbi, data: swap.transaction.data });
    expect(decoded.functionName).toBe("swapSingleTokenExactIn");
    expect(decoded.args.slice(0, 6)).toEqual([
      POOL,
      USDC_ADDRESS,
      AUSD_ADDRESS,
      1_500_000n,
      1_492_500n,
      expect.any(BigInt),
    ]);
    expect(decoded.args.slice(6)).toEqual([false, "0x"]);
    expect(swap.transaction.value).toBe("0x0");
  });

  it("forwards native MON and sets wethIsEth for a native-in exact-in swap", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("beets", "swap", ACCOUNT, {
      pool: POOL,
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "2",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const nodes = flattenCapabilityTree(capability);
    expect(nodes).toHaveLength(1); // no approval for native input
    const decoded = decodeFunctionData({
      abi: BeetsRouterAbi,
      data: nodes[0]?.transaction.data ?? "0x",
    });
    expect(decoded.functionName).toBe("swapSingleTokenExactIn");
    expect(decoded.args.slice(1, 4)).toEqual([
      WMON_ADDRESS,
      USDC_ADDRESS,
      2_000_000_000_000_000_000n,
    ]);
    expect(decoded.args[6]).toBe(true);
    expect(nodes[0]?.transaction.value).toBe("0x1bc16d674ec80000");
  });

  it("reverse-quotes an exact-out swap with input headroom", async () => {
    const { registry } = offlineRegistry();
    const quote = await registry.action("beets", "quote", ACCOUNT, {
      pool: POOL,
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1.2",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toEqual({
      pool: POOL,
      amountSide: "amountOut",
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      estimatedAmountIn: "1.2",
      maximumAmountIn: "1.206",
      amountOut: "1.2",
    });

    const capability = await registry.action("beets", "swap", ACCOUNT, {
      pool: POOL,
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountOut: "1.2",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const swap = flattenCapabilityTree(capability).at(-1);
    if (!swap) throw new Error("missing Beets transaction");
    const decoded = decodeFunctionData({ abi: BeetsRouterAbi, data: swap.transaction.data });
    expect(decoded.functionName).toBe("swapSingleTokenExactOut");
    expect(decoded.args.slice(3, 5)).toEqual([1_200_000n, 1_206_000n]);
  });

  it("places the single deposit amount at the pool token index", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("beets", "addLiquidity", ACCOUNT, {
      pool: POOL,
      tokenIn: USDC_ADDRESS,
      amountIn: "5",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [approval, add] = flattenCapabilityTree(capability);
    if (!approval || !add) throw new Error("missing Beets transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [BEETS_ROUTER_ADDRESS, 5_000_000n],
    });
    const decoded = decodeFunctionData({ abi: BeetsRouterAbi, data: add.transaction.data });
    expect(decoded.functionName).toBe("addLiquidityUnbalanced");
    expect(decoded.args.slice(0, 3)).toEqual([POOL, [0n, 5_000_000n, 0n], expect.any(BigInt)]);
    expect(decoded.args.slice(3)).toEqual([false, "0x"]);
  });

  it("quotes add liquidity from the Router and enforces a minimum BPT", async () => {
    const { registry } = offlineRegistry();
    const quote = await registry.action("beets", "quoteAddLiquidity", ACCOUNT, {
      pool: POOL,
      tokenIn: NATIVE,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toEqual({
      pool: POOL,
      tokenIn: NATIVE,
      amountIn: "1",
      estimatedBptOut: "1000000000000000000",
      minimumBptOut: "995000000000000000",
    });
    const capability = await registry.action("beets", "addLiquidity", ACCOUNT, {
      pool: POOL,
      tokenIn: NATIVE,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [add] = flattenCapabilityTree(capability);
    if (!add) throw new Error("missing Beets transaction");
    const decoded = decodeFunctionData({ abi: BeetsRouterAbi, data: add.transaction.data });
    expect(decoded.args.slice(0, 3)).toEqual([
      POOL,
      [1_000_000_000_000_000_000n, 0n, 0n],
      995_000_000_000_000_000n,
    ]);
    expect(decoded.args[3]).toBe(true);
    expect(add.transaction.value).toBe("0xde0b6b3a7640000");
  });

  it("removes liquidity single-token without any approval", async () => {
    const { registry } = offlineRegistry();
    const quote = await registry.action("beets", "quoteRemoveLiquidity", ACCOUNT, {
      pool: POOL,
      tokenOut: USDC_ADDRESS,
      bptAmountIn: "0.5",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toEqual({
      pool: POOL,
      tokenOut: USDC_ADDRESS,
      bptAmountIn: "0.5",
      estimatedAmountOut: "500000000000000000",
      minimumAmountOut: "497500000000000000",
    });
    const capability = await registry.action("beets", "removeLiquidity", ACCOUNT, {
      pool: POOL,
      tokenOut: USDC_ADDRESS,
      bptAmountIn: "0.5",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [remove] = flattenCapabilityTree(capability);
    if (!remove) throw new Error("missing Beets transaction");
    const decoded = decodeFunctionData({ abi: BeetsRouterAbi, data: remove.transaction.data });
    expect(decoded.functionName).toBe("removeLiquiditySingleTokenExactIn");
    expect(decoded.args.slice(0, 4)).toEqual([
      POOL,
      500_000_000_000_000_000n,
      USDC_ADDRESS,
      497_500_000_000_000_000n,
    ]);
    expect(decoded.args.slice(4)).toEqual([false, "0x"]);
  });

  it("parses an ERC20 swap receipt from Vault Swap + Transfer changes", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("beets", "swap", ACCOUNT, {
      pool: POOL,
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const transferIn = erc20Transfer(USDC_ADDRESS, ACCOUNT, BEETS_VAULT_ADDRESS, 1_000_000n);
    const swapEvent = vaultSwapChange(POOL, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 990_000n);
    const transferOut = erc20Transfer(AUSD_ADDRESS, BEETS_VAULT_ADDRESS, ACCOUNT, 990_000n);

    const receipt = registry.parseReceipt(capability, [transferIn, swapEvent, transferOut]);
    expect(receipt.outcome).toEqual({
      operation: "swap",
      pool: POOL,
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1000000",
      amountOut: "990000",
      swapFeePercentage: "1000000",
      swapFeeAmount: "10000",
    });
    expect(receipt.changes.map(firstChange)).toEqual([transferIn, swapEvent, transferOut]);
  });

  it("labels native flows in the swap receipt when a matching native transfer exists", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("beets", "swap", ACCOUNT, {
      pool: POOL,
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: BEETS_ROUTER_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;
    const swapEvent = vaultSwapChange(
      POOL,
      WMON_ADDRESS,
      USDC_ADDRESS,
      1_000_000_000_000_000_000n,
      1_000_000n,
    );
    const receipt = registry.parseReceipt(capability, [native, swapEvent]);
    expect(receipt.outcome).toMatchObject({
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountIn: "1000000000000000000",
    });
  });

  it("keeps WMON in the swap receipt when no native transfer matches", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("beets", "swap", ACCOUNT, {
      pool: POOL,
      tokenIn: WMON_ADDRESS,
      tokenOut: USDC_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const swapEvent = vaultSwapChange(
      POOL,
      WMON_ADDRESS,
      USDC_ADDRESS,
      1_000_000_000_000_000_000n,
      1_000_000n,
    );
    const receipt = registry.parseReceipt(capability, [swapEvent]);
    expect(receipt.outcome).toMatchObject({ tokenIn: WMON_ADDRESS });
  });

  it("parses add and remove liquidity receipts from Vault events", async () => {
    const { registry } = offlineRegistry();
    const add = await registry.action("beets", "addLiquidity", ACCOUNT, {
      pool: POOL,
      tokenIn: USDC_ADDRESS,
      amountIn: "1",
    });
    if (add.kind !== "capability") throw new Error("expected capability");
    const added = liquidityAddedChange(POOL, ACCOUNT, 0, [0n, 1_000_000n, 0n]);
    const addReceipt = registry.parseReceipt(add, [added]);
    expect(addReceipt.outcome).toEqual({
      operation: "addLiquidity",
      pool: POOL,
      provider: ACCOUNT,
      kind: 0,
      amounts: ["0", "1000000", "0"],
      swapFees: ["0", "0", "0"],
      totalBptSupply: "1000000000000000000",
    });

    const remove = await registry.action("beets", "removeLiquidity", ACCOUNT, {
      pool: POOL,
      tokenOut: USDC_ADDRESS,
      bptAmountIn: "0.5",
    });
    if (remove.kind !== "capability") throw new Error("expected capability");
    const removed = liquidityRemovedChange(POOL, ACCOUNT, 1, [0n, 500_000n, 0n]);
    const removeReceipt = registry.parseReceipt(remove, [removed]);
    expect(removeReceipt.outcome).toMatchObject({
      operation: "removeLiquidity",
      kind: 1,
      amounts: ["0", "500000", "0"],
    });
  });

  it("rejects duplicate or mismatched Vault events in receipts", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("beets", "swap", ACCOUNT, {
      pool: POOL,
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amountIn: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const first = vaultSwapChange(POOL, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 990_000n);
    const second = vaultSwapChange(POOL, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 991_000n);
    expect(() => registry.parseReceipt(capability, [first, second])).toThrow(
      "multiple Vault Swap events",
    );
    const removed = liquidityRemovedChange(POOL, ACCOUNT, 1, [0n, 500_000n, 0n]);
    expect(() => registry.parseReceipt(capability, [removed])).toThrow(
      "Beets Vault emitted LiquidityRemoved",
    );
    expect(() => registry.parseReceipt(capability, [])).toThrow("requires a Vault Swap event");
  });

  it("inspects pool tokens, balances, and the static swap fee", async () => {
    const { registry } = offlineRegistry();
    const query = await registry.action("beets", "pool", ACCOUNT, { pool: POOL });
    if (query.kind !== "query") throw new Error("expected query");
    expect(query.data).toEqual({
      pool: POOL,
      tokens: [...POOL_TOKENS],
      balancesRaw: BALANCES.map(String),
      staticSwapFeePercentage: "5000000000000000",
    });
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Beets mainnet", () => {
  it("has deployed Router, Vault, VaultExtension, and VaultExplorer bytecode", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    for (const address of [
      BEETS_ROUTER_ADDRESS,
      BEETS_VAULT_ADDRESS,
      BEETS_VAULT_EXTENSION_ADDRESS,
      BEETS_VAULT_EXPLORER_ADDRESS,
    ]) {
      expect((await runtime.client.getCode({ address }))?.length).toBeGreaterThan(2);
    }
  });

  it("pins the Vault and VaultExtension through the VaultExplorer", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const [vault, extension] = await Promise.all([
      runtime.client.readContract({
        address: BEETS_VAULT_EXPLORER_ADDRESS,
        abi: BeetsVaultExplorerAbi,
        functionName: "getVault",
      }),
      runtime.client.readContract({
        address: BEETS_VAULT_EXPLORER_ADDRESS,
        abi: BeetsVaultExplorerAbi,
        functionName: "getVaultExtension",
      }),
    ]);
    expect(vault.toLowerCase()).toBe(BEETS_VAULT_ADDRESS.toLowerCase());
    expect(extension.toLowerCase()).toBe(BEETS_VAULT_EXTENSION_ADDRESS.toLowerCase());
  });

  it("quotes a live native-to-gMON swap", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    const quote = await new Registry(runtime).use(Beets).action("beets", "quote", ACCOUNT, {
      pool: LIVE_WMON_GMON_POOL,
      tokenIn: NATIVE,
      tokenOut: GMON_ADDRESS,
      amountIn: "1",
    });
    if (quote.kind !== "query") throw new Error("expected query");
    expect(quote.data).toMatchObject({ amountSide: "amountIn", amountIn: "1" });
    expect((quote.data as { minimumAmountOut?: string }).minimumAmountOut).toBeTruthy();
  });
});

function offlineRegistry() {
  const client = {
    readContract: async ({ address, functionName }: { address: string; functionName: string }) => {
      if (functionName === "decimals") return BigInt(DECIMALS[address.toLowerCase()] ?? 18);
      if (functionName === "getPoolTokens") return [...POOL_TOKENS];
      if (functionName === "getPoolTokenInfo") return [[...POOL_TOKENS], [], [...BALANCES]];
      if (functionName === "getStaticSwapFeePercentage") return 5_000_000_000_000_000n;
      throw new Error(`unexpected read ${functionName}`);
    },
    call: async ({ to, data }: { to: string; data: Hex }) => {
      if (to.toLowerCase() !== BEETS_ROUTER_ADDRESS.toLowerCase()) {
        throw new Error(`unexpected call target ${to}`);
      }
      const decoded = decodeFunctionData({ abi: BeetsRouterAbi, data });
      const args = decoded.args as readonly unknown[];
      let result: bigint;
      switch (decoded.functionName) {
        case "querySwapSingleTokenExactIn":
          result = args[3] as bigint;
          break;
        case "querySwapSingleTokenExactOut":
          result = args[3] as bigint;
          break;
        case "queryAddLiquidityUnbalanced": {
          const amounts = args[1] as readonly bigint[];
          result = amounts.reduce((sum: bigint, amount: bigint) => sum + amount, 0n);
          break;
        }
        case "queryRemoveLiquiditySingleTokenExactIn":
          result = args[1] as bigint;
          break;
        default:
          throw new Error(`unexpected call ${decoded.functionName}`);
      }
      return {
        data: encodeFunctionResult({
          abi: BeetsRouterAbi,
          functionName: decoded.functionName,
          result,
        }),
      };
    },
  } as unknown as MossRuntime["client"];
  return { registry: new Registry({ rpcUrl: "http://offline", client }).use(Beets) };
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

function vaultSwapChange(
  pool: `0x${string}`,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  amountOut: bigint,
): Change {
  return {
    kind: "event",
    address: BEETS_VAULT_ADDRESS,
    topics: encodeEventTopics({
      abi: BeetsVaultAbi,
      eventName: "Swap",
      args: { pool, tokenIn, tokenOut },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [amountIn, amountOut, 1_000_000n, 10_000n],
    ),
  };
}

function liquidityAddedChange(
  pool: `0x${string}`,
  provider: `0x${string}`,
  kind: number,
  amounts: readonly bigint[],
): Change {
  return {
    kind: "event",
    address: BEETS_VAULT_ADDRESS,
    topics: encodeEventTopics({
      abi: BeetsVaultAbi,
      eventName: "LiquidityAdded",
      args: { pool, liquidityProvider: provider, kind },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256[]" }, { type: "uint256[]" }],
      [1_000_000_000_000_000_000n, [...amounts], amounts.map(() => 0n)],
    ),
  };
}

function liquidityRemovedChange(
  pool: `0x${string}`,
  provider: `0x${string}`,
  kind: number,
  amounts: readonly bigint[],
): Change {
  return {
    kind: "event",
    address: BEETS_VAULT_ADDRESS,
    topics: encodeEventTopics({
      abi: BeetsVaultAbi,
      eventName: "LiquidityRemoved",
      args: { pool, liquidityProvider: provider, kind },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256[]" }, { type: "uint256[]" }],
      [500_000_000_000_000_000n, [...amounts], amounts.map(() => 0n)],
    ),
  };
}

function firstChange(entry: ReceiptResult["changes"][number]): Change {
  if (entry.kind === "change") return entry.change;
  const [child] = entry.changes;
  if (child?.kind !== "change") throw new Error("expected one nested ReceiptChange");
  return child.change;
}
