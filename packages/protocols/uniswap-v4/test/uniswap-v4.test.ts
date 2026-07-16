import {
  type CapabilityNode,
  type Change,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { describe, expect, it } from "vitest";
import { monadRuntime } from "@themoss/system";
import { UniswapV4, UNIVERSAL_ROUTER_ADDRESS } from "../src/index.js";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const USDC = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";

// ── Helpers ──

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    // biome-ignore lint/suspicious/noExplicitAny: no reads in offline tests
    client: {} as any,
  } as MossRuntime;
  const registry = new Registry(runtime);
  registry.use(UniswapV4);
  return registry;
}

async function liveRegistry(): Promise<Registry> {
  const runtime = await monadRuntime();
  const reg = new Registry(runtime);
  reg.use(UniswapV4);
  return reg;
}

// ── Offline: shape & discovery ──

describe("uniswap-v4 adapter (offline shape)", () => {
  it("discovers swap/quote/markets", () => {
    const registry = offlineRegistry();
    const caps = registry.discover({ protocol: "uniswap-v4" });
    expect(caps.map((c) => c.method).sort()).toEqual(["markets", "quote", "swap"]);
  });

  it("loads the swap capability stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "uniswap-v4", method: "swap" }]);
    expect(stub?.verb).toBe("swap");
    expect(stub?.risk).toContain("fundOut");
    expect(stub?.tags).toContain("amm");
    expect(stub?.params).toHaveProperty("tokenIn");
    expect(stub?.params).toHaveProperty("tokenOut");
    expect(stub?.params).toHaveProperty("amount");
    expect(stub?.params).toHaveProperty("slippage");
  });

  it("loads the quote query stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "uniswap-v4", method: "quote" }]);
    expect(stub?.kind).toBe("query");
  });

  it("builds a swap capability with approve + swap for ERC20 inputs", async () => {
    const registry = offlineRegistry();
    const cap = (await registry.action("uniswap-v4", "swap", ACCOUNT, {
      tokenIn: USDC,
      tokenOut: "native",
      amount: "0.001",
      slippage: 500,
    })) as CapabilityNode;
    expect(cap.kind).toBe("capability");
    expect(cap.protocol).toBe("uniswap-v4");
    expect(cap.method).toBe("swap");
    expect(cap.receipt).toBe("swapReceipt");
    // Two children: approve (CapabilityNode) + swap (TransactionNode)
    expect(cap.children).toHaveLength(2);
    expect(cap.children[0]?.kind).toBe("capability");
    expect((cap.children[0] as { protocol: string }).protocol).toBe("erc20");
    expect(cap.children[1]?.kind).toBe("transaction");
    expect((cap.children[1] as { transaction: { to: string } }).transaction.to).toBe(UNIVERSAL_ROUTER_ADDRESS);
  });

  it("builds a native-in swap with one direct transaction", async () => {
    const registry = offlineRegistry();
    const cap = (await registry.action("uniswap-v4", "swap", ACCOUNT, {
      tokenIn: "native",
      tokenOut: USDC,
      amount: "0.001",
      slippage: 500,
    })) as CapabilityNode;
    expect(cap.kind).toBe("capability");
    expect(cap.method).toBe("swap");
    expect(cap.children).toHaveLength(1);
    expect(cap.children[0]?.kind).toBe("transaction");
    expect((cap.children[0] as { transaction: { to: string } }).transaction.to).toBe(UNIVERSAL_ROUTER_ADDRESS);
  });

  it("rejects invalid slippage", async () => {
    const registry = offlineRegistry();
    await expect(
      registry.action("uniswap-v4", "swap", ACCOUNT, {
        tokenIn: "native",
        tokenOut: USDC,
        amount: "0.001",
        slippage: 20000, // > 10000
      }),
    ).rejects.toThrow(/invalid parameters/);
  });

  it("parses a swap receipt from empty changes (offline)", () => {
    const registry = offlineRegistry();
    const cap = {
      kind: "capability" as const,
      protocol: "uniswap-v4",
      method: "swap",
      params: { tokenIn: "native", tokenOut: USDC, amount: "0.001", slippage: 100 },
      receipt: "swapReceipt",
      children: [
        {
          kind: "transaction" as const,
          transaction: {
            from: ACCOUNT,
            to: UNIVERSAL_ROUTER_ADDRESS,
            data: "0x" as const,
            value: "0x0" as const,
          },
        },
      ],
    };
    const receipt = registry.parseReceipt(cap as CapabilityNode, []);
    expect(receipt.kind).toBe("receipt");
    expect(receipt.changes).toHaveLength(0);
  });
});

// ── E2E (live Monad mainnet) ──

const e2e = process.env.MOSS_SKIP_E2E ? describe.skip : describe;
e2e("uniswap-v4 adapter (Monad mainnet e2e)", () => {
  it(
    "quotes MON → USDC on mainnet",
    { timeout: 30_000 },
    async () => {
      const reg = await liveRegistry();
      const result = await reg.action("uniswap-v4", "quote", ACCOUNT, {
        tokenIn: "native", tokenOut: USDC, amount: "1",
      });
      if (result.kind !== "query") throw new Error("expected query result");
      const data = result.data as { amountOut: string };
      expect(data).toHaveProperty("amountOut");
      expect(BigInt(data.amountOut)).toBeGreaterThan(0n);
    },
  );

  it(
    "quotes USDC → MON on mainnet",
    { timeout: 30_000 },
    async () => {
      const reg = await liveRegistry();
      const result = await reg.action("uniswap-v4", "quote", ACCOUNT, {
        tokenIn: USDC, tokenOut: "native", amount: "10",
      });
      if (result.kind !== "query") throw new Error("expected query result");
      const data = result.data as { amountOut: string };
      expect(data).toHaveProperty("amountOut");
      expect(BigInt(data.amountOut)).toBeGreaterThan(0n);
    },
  );

  it(
    "swap builds valid calldata on mainnet",
    { timeout: 30_000 },
    async () => {
      const reg = await liveRegistry();
      const cap = (await reg.action("uniswap-v4", "swap", ACCOUNT, {
        tokenIn: "native", tokenOut: USDC, amount: "0.001", slippage: 500,
      })) as CapabilityNode;
      expect(cap.kind).toBe("capability");
      // execute() function selector: 0x24856bc3
      const tx = (cap.children[0] as { transaction: { to: string; data: string } }).transaction;
      expect(tx.to).toBe(UNIVERSAL_ROUTER_ADDRESS);
      expect(tx.data).toMatch(/^0x24856bc3/);
    },
  );
});
