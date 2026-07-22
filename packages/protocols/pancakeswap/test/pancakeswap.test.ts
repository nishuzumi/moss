import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { monadRuntime, USDC_ADDRESS, WMON_ADDRESS } from "@themoss/system";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { factoryAbi } from "../src/abis/factory.js";
import { swapRouterAbi } from "../src/abis/swap-router.js";
import {
  PANCAKESWAP_V3_FACTORY_ADDRESS,
  PANCAKESWAP_V3_ROUTER_ADDRESS,
  PancakeSwap,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const TOKEN_A = getAddress("0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa");
const TOKEN_B = getAddress("0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb");

// ── Helpers ──────────────────────────────────────────────────────────────

function firstChange(entry: unknown): Change | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const obj = entry as Record<string, unknown>;
  if (obj.kind === "receipt" && Array.isArray(obj.changes)) {
    for (const child of obj.changes) {
      const found = firstChange(child);
      if (found) return found;
    }
    return undefined;
  }
  if (obj.kind === "change" && obj.change && typeof obj.change === "object") {
    return obj.change as Change;
  }
  return entry as Change;
}

function erc20Transfer(token: string, from: string, to: string, amount: bigint): Change {
  return {
    kind: "event",
    address: token as `0x${string}`,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from: from as `0x${string}`, to: to as `0x${string}` },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function erc20Approval(token: string, from: string, to: string, amount: bigint): Change {
  return {
    kind: "event",
    address: token as `0x${string}`,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Approval",
      args: { owner: from as `0x${string}`, spender: to as `0x${string}` },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

// ── Param validation tests ───────────────────────────────────────────────

describe("PancakeSwap param validation", () => {
  const registry = new Registry({
    rpcUrl: "http://offline",
    client: {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "decimals") return 18;
        if (functionName === "getPool") return "0x63e48B725540A3Db24ACF6682a29f877808C53F2";
        if (functionName === "token0") return TOKEN_A;
        throw new Error(`unexpected readContract ${functionName}`);
      },
      call: async () => ({
        data: "0x0000000000000000000000000000000000000000000000000000000000000000",
      }),
    } as unknown as MossRuntime["client"],
  }).use(PancakeSwap);

  it("rejects same tokenIn and tokenOut", async () => {
    await expect(
      registry.action("pancakeswap", "swap", ACCOUNT, {
        tokenIn: TOKEN_A,
        tokenOut: TOKEN_A,
        amount: "1",
        fee: 3000,
        slippage: 50,
      }),
    ).rejects.toThrow("tokenIn and tokenOut must differ");
  });

  it("rejects native tokenOut in swap v1", async () => {
    await expect(
      registry.action("pancakeswap", "swap", ACCOUNT, {
        tokenIn: TOKEN_A,
        tokenOut: "native",
        amount: "1",
        fee: 3000,
        slippage: 50,
      }),
    ).rejects.toThrow("tokenOut=native is not supported in v1");
  });

  it("rejects native tokenOut in quote v1", async () => {
    await expect(
      registry.action("pancakeswap", "quote", ACCOUNT, {
        tokenIn: TOKEN_A,
        tokenOut: "native",
        amount: "1",
        fee: 3000,
        slippage: 50,
      }),
    ).rejects.toThrow("tokenOut=native is not supported in v1");
  });
});

// ── Quote query tests ───────────────────────────────────────────────────

describe("PancakeSwap quote", () => {
  const QUOTE_OUT = 900_000_000_000_000_000n;
  const EXPECTED_MIN_OUT = 895_500_000_000_000_000n;

  it("returns slippage-adjusted amountOut", async () => {
    const registry = new Registry({
      rpcUrl: "http://offline",
      client: {
        readContract: async (_fn: string, _args: readonly unknown[]) => 18,
        call: async () => ({ data: encodeAbiParameters([{ type: "uint256" }], [QUOTE_OUT]) }),
      } as unknown as MossRuntime["client"],
    }).use(PancakeSwap);

    const result = await registry.action("pancakeswap", "quote", ACCOUNT, {
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amount: "1",
      fee: 3000,
      slippage: 50,
    });

    expect(result).toEqual({
      kind: "query",
      protocol: "pancakeswap",
      method: "quote",
      data: {
        amountOut: EXPECTED_MIN_OUT.toString(),
        fee: "3000",
        note: "slippage-adjusted eth_call quote; requires router allowance.",
      },
    });
  });

  it("throws when router allowance is not set", async () => {
    const registry = new Registry({
      rpcUrl: "http://offline",
      client: {
        readContract: async () => 18,
        call: async () => {
          throw new Error("execution reverted");
        },
      } as unknown as MossRuntime["client"],
    }).use(PancakeSwap);

    await expect(
      registry.action("pancakeswap", "quote", ACCOUNT, {
        tokenIn: TOKEN_A,
        tokenOut: TOKEN_B,
        amount: "1",
        fee: 3000,
        slippage: 50,
      }),
    ).rejects.toThrow("pancakeswap.quote: eth_call reverted");
  });
});

// ── Capability tree tests ────────────────────────────────────────────────

describe("PancakeSwap swap capability tree", () => {
  const QUOTE_OUT = 900_000_000_000_000_000n;
  const EXPECTED_MIN_OUT = 895_500_000_000_000_000n;

  it("delegates approve to erc20 and builds exactInputSingle with slippage-adjusted minOut", async () => {
    const registry = new Registry({
      rpcUrl: "http://offline",
      client: {
        readContract: async ({ functionName }: { functionName: string }) => {
          if (functionName === "decimals") return 18;
          if (functionName === "getPool") return "0x63e48B725540A3Db24ACF6682a29f877808C53F2";
          if (functionName === "token0") return TOKEN_A;
          throw new Error(`unexpected readContract ${functionName}`);
        },
        call: async () => ({ data: encodeAbiParameters([{ type: "uint256" }], [QUOTE_OUT]) }),
      } as unknown as MossRuntime["client"],
    }).use(PancakeSwap);

    const capability = await registry.action("pancakeswap", "swap", ACCOUNT, {
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amount: "1",
      fee: 3000,
      slippage: 50,
    });

    if (capability.kind !== "capability") throw new Error("expected capability");
    const txs = flattenCapabilityTree(capability);

    expect(txs.length).toBe(2);
    const swap = txs.at(-1);
    if (!swap) throw new Error("missing swap transaction");
    expect(swap.capability.protocol).toBe("pancakeswap");

    const decoded = decodeFunctionData({ abi: swapRouterAbi, data: swap.transaction.data });
    if (decoded.functionName !== "exactInputSingle") throw new Error("unexpected function");
    const [routerParams] = decoded.args;
    expect(routerParams.amountOutMinimum).toBe(EXPECTED_MIN_OUT);
  });

  it("sends native MON as msg.value (no pre-wrap) and builds exactInputSingle", async () => {
    const registry = new Registry({
      rpcUrl: "http://offline",
      client: {
        readContract: async ({ functionName }: { functionName: string }) => {
          if (functionName === "decimals") return 18;
          if (functionName === "getPool") return "0x63e48B725540A3Db24ACF6682a29f877808C53F2";
          if (functionName === "token0") return "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
          throw new Error(`unexpected readContract ${functionName}`);
        },
        call: async () => ({ data: encodeAbiParameters([{ type: "uint256" }], [QUOTE_OUT]) }),
      } as unknown as MossRuntime["client"],
    }).use(PancakeSwap);

    const capability = await registry.action("pancakeswap", "swap", ACCOUNT, {
      tokenIn: "native",
      tokenOut: TOKEN_B,
      amount: "1",
      fee: 3000,
      slippage: 50,
    });

    if (capability.kind !== "capability") throw new Error("expected capability");
    const txs = flattenCapabilityTree(capability);

    expect(txs.length).toBe(1);
    const first = txs.at(0);
    if (!first) throw new Error("missing swap transaction");
    expect(first.transaction.to.toLowerCase()).toBe(PANCAKESWAP_V3_ROUTER_ADDRESS.toLowerCase());
    expect(first.transaction.value).toBe("0xde0b6b3a7640000");

    const decoded = decodeFunctionData({ abi: swapRouterAbi, data: first.transaction.data });
    expect(decoded.functionName).toBe("exactInputSingle");
  });
});

// ── Receipt tests ────────────────────────────────────────────────────────

describe("PancakeSwap swapReceipt", () => {
  it("extracts outcome from the first and last ERC-20 Transfer events", async () => {
    const registry = new Registry({
      rpcUrl: "http://offline",
      client: {
        readContract: async ({ functionName }: { functionName: string }) => {
          if (functionName === "decimals") return 18;
          if (functionName === "getPool") return "0x63e48B725540A3Db24ACF6682a29f877808C53F2";
          if (functionName === "token0") return TOKEN_A;
          throw new Error(`unexpected readContract ${functionName}`);
        },
        call: async () => ({
          data: encodeAbiParameters([{ type: "uint256" }], [900_000_000_000_000_000n]),
        }),
      } as unknown as MossRuntime["client"],
    }).use(PancakeSwap);

    const capability = await registry.action("pancakeswap", "swap", ACCOUNT, {
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amount: "1",
      fee: 3000,
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const changes = [
      erc20Transfer(TOKEN_A, ACCOUNT, PANCAKESWAP_V3_ROUTER_ADDRESS, 1_000_000_000_000_000_000n),
      erc20Transfer(TOKEN_B, PANCAKESWAP_V3_ROUTER_ADDRESS, ACCOUNT, 900_000_000_000_000_000n),
    ];

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "swap",
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amountIn: "1000000000000000000",
      amountOut: "900000000000000000",
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("treats a native MON transfer as part of the swap outcome", async () => {
    const wmonAddr = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
    const registry = new Registry({
      rpcUrl: "http://offline",
      client: {
        readContract: async ({ functionName }: { functionName: string }) => {
          if (functionName === "decimals") return 18;
          if (functionName === "getPool") return "0x63e48B725540A3Db24ACF6682a29f877808C53F2";
          if (functionName === "token0") return wmonAddr;
          throw new Error(`unexpected readContract ${functionName}`);
        },
        call: async () => ({
          data: encodeAbiParameters([{ type: "uint256" }], [900_000_000_000_000_000n]),
        }),
      } as unknown as MossRuntime["client"],
    }).use(PancakeSwap);

    const capability = await registry.action("pancakeswap", "swap", ACCOUNT, {
      tokenIn: "native",
      tokenOut: TOKEN_B,
      amount: "1",
      fee: 3000,
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const changes = [
      {
        kind: "nativeTransfer" as const,
        from: ACCOUNT,
        to: wmonAddr as `0x${string}`,
        value: "500000000000000000",
      },
      erc20Transfer(TOKEN_B, wmonAddr, ACCOUNT, 450_000_000_000_000_000n),
    ];

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "swap",
      tokenIn: ACCOUNT,
      tokenOut: TOKEN_B,
      amountIn: "500000000000000000",
      amountOut: "450000000000000000",
    });
  });

  it("delegates ERC-20 event parsing to erc20.changesReceipt", async () => {
    const registry = new Registry({
      rpcUrl: "http://offline",
      client: {
        readContract: async ({ functionName }: { functionName: string }) => {
          if (functionName === "decimals") return 18;
          if (functionName === "getPool") return "0x63e48B725540A3Db24ACF6682a29f877808C53F2";
          if (functionName === "token0") return TOKEN_A;
          throw new Error(`unexpected readContract ${functionName}`);
        },
        call: async () => ({
          data: encodeAbiParameters([{ type: "uint256" }], [900_000_000_000_000_000n]),
        }),
      } as unknown as MossRuntime["client"],
    }).use(PancakeSwap);

    const capability = await registry.action("pancakeswap", "swap", ACCOUNT, {
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amount: "1",
      fee: 3000,
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const changes = [
      erc20Transfer(TOKEN_A, ACCOUNT, PANCAKESWAP_V3_ROUTER_ADDRESS, 1_000_000_000_000_000_000n),
      erc20Approval(TOKEN_A, ACCOUNT, PANCAKESWAP_V3_ROUTER_ADDRESS, 0n),
      erc20Transfer(TOKEN_B, PANCAKESWAP_V3_ROUTER_ADDRESS, ACCOUNT, 900_000_000_000_000_000n),
    ];

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.changes.map(firstChange)).toEqual(changes);
    expect(receipt.outcome).toEqual({
      operation: "swap",
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amountIn: "1000000000000000000",
      amountOut: "900000000000000000",
    });
  });

  it("returns zero placeholders when no Transfer changes are present", async () => {
    const registry = new Registry({
      rpcUrl: "http://offline",
      client: {
        readContract: async ({ functionName }: { functionName: string }) => {
          if (functionName === "decimals") return 18;
          if (functionName === "getPool") return "0x63e48B725540A3Db24ACF6682a29f877808C53F2";
          if (functionName === "token0") return TOKEN_A;
          throw new Error(`unexpected readContract ${functionName}`);
        },
        call: async () => ({
          data: encodeAbiParameters([{ type: "uint256" }], [900_000_000_000_000_000n]),
        }),
      } as unknown as MossRuntime["client"],
    }).use(PancakeSwap);

    const capability = await registry.action("pancakeswap", "swap", ACCOUNT, {
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amount: "1",
      fee: 3000,
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    const receipt = registry.parseReceipt(capability, []);
    expect(receipt.outcome).toEqual({
      operation: "swap",
      tokenIn: "0x0000000000000000000000000000000000000000",
      tokenOut: "0x0000000000000000000000000000000000000000",
      amountIn: "0",
      amountOut: "0",
    });
  });
});

// ── Live Monad mainnet checks (free: read-only, Moss never signs/sends) ──

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("PancakeSwap mainnet", () => {
  it("has deployed bytecode and self-consistent router/factory/WMON wiring", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();

    for (const address of [PANCAKESWAP_V3_ROUTER_ADDRESS, PANCAKESWAP_V3_FACTORY_ADDRESS]) {
      expect((await runtime.client.getCode({ address }))?.length ?? 0).toBeGreaterThan(2);
    }

    const [factoryAddress, weth9] = await Promise.all([
      runtime.client.readContract({
        address: PANCAKESWAP_V3_ROUTER_ADDRESS,
        abi: swapRouterAbi,
        functionName: "factory",
      }),
      runtime.client.readContract({
        address: PANCAKESWAP_V3_ROUTER_ADDRESS,
        abi: swapRouterAbi,
        functionName: "WETH9",
      }),
    ]);
    expect(getAddress(factoryAddress)).toBe(getAddress(PANCAKESWAP_V3_FACTORY_ADDRESS));
    expect(getAddress(weth9)).toBe(getAddress(WMON_ADDRESS));

    const pool = await runtime.client.readContract({
      address: PANCAKESWAP_V3_FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: "getPool",
      args: [WMON_ADDRESS, USDC_ADDRESS, 500],
    });
    expect(pool).not.toBe("0x0000000000000000000000000000000000000000");
    expect((await runtime.client.getCode({ address: pool }))?.length ?? 0).toBeGreaterThan(2);
  });
});
