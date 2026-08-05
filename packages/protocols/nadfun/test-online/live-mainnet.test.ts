import { defaultRpcUrl, type MossRuntime, Registry } from "@themoss/core";
import { createPublicClient, getAddress, http } from "viem";
import { describe, expect, it } from "vitest";
import {
  NADFUN_LENS_ADDRESS,
  NadFun,
  type NadFunBuyQuote,
  type NadFunSellQuote,
  type NadFunTokenStatus,
} from "../src/index.js";

const RPC_URL = defaultRpcUrl();

const SAMPLE_TOKEN = getAddress(
  process.env.NADFUN_SAMPLE_TOKEN ?? "0xe85170a4303cBA6DD224628F5Aa052fb7FeB7777",
);

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");

function queryData<T>(result: Awaited<ReturnType<Registry["action"]>>): T {
  if (result.kind !== "query") {
    throw new Error("Expected a Query result");
  }

  return result.data as T;
}

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Nad.fun Lens live Monad mainnet", () => {
  it("verifies deployment and executes all three Query methods", { timeout: 60_000 }, async () => {
    const client = createPublicClient({
      transport: http(RPC_URL, {
        timeout: 30_000,
        retryCount: 2,
      }),
    });

    const chainId = await client.getChainId();

    expect(chainId).toBe(143);

    const runtime = {
      rpcUrl: RPC_URL,
      client,
    } satisfies MossRuntime;

    const lensCode = await client.getCode({
      address: NADFUN_LENS_ADDRESS,
    });

    expect(lensCode).toBeDefined();
    expect(lensCode).not.toBe("0x");

    const tokenCode = await client.getCode({
      address: SAMPLE_TOKEN,
    });

    expect(tokenCode).toBeDefined();
    expect(tokenCode).not.toBe("0x");

    const registry = new Registry(runtime).use(NadFun);

    expect(
      registry.discover({
        protocol: "nadfun",
      }),
    ).toHaveLength(3);

    const buyResult = await registry.action("nadfun", "quoteBuy", ACCOUNT, {
      token: SAMPLE_TOKEN,
      amountIn: "1000000000000000000",
    });

    const buy = queryData<NadFunBuyQuote>(buyResult);

    expect(buy.side).toBe("buy");
    expect(buy.token).toBe(SAMPLE_TOKEN);
    expect(BigInt(buy.amountOut)).toBeGreaterThan(0n);

    const buyRouterCode = await client.getCode({
      address: buy.router,
    });

    expect(buyRouterCode).toBeDefined();
    expect(buyRouterCode).not.toBe("0x");

    const sellResult = await registry.action("nadfun", "quoteSell", ACCOUNT, {
      token: SAMPLE_TOKEN,
      amountIn: buy.amountOut,
    });

    const sell = queryData<NadFunSellQuote>(sellResult);

    expect(sell.side).toBe("sell");
    expect(sell.token).toBe(SAMPLE_TOKEN);
    expect(BigInt(sell.amountOut)).toBeGreaterThan(0n);

    const sellRouterCode = await client.getCode({
      address: sell.router,
    });

    expect(sellRouterCode).toBeDefined();
    expect(sellRouterCode).not.toBe("0x");

    const statusResult = await registry.action("nadfun", "tokenStatus", ACCOUNT, {
      token: SAMPLE_TOKEN,
    });

    const status = queryData<NadFunTokenStatus>(statusResult);

    const progress = BigInt(status.progressBps);

    expect(status.token).toBe(SAMPLE_TOKEN);
    expect(typeof status.graduated).toBe("boolean");
    expect(typeof status.locked).toBe("boolean");
    expect(progress).toBeGreaterThanOrEqual(0n);
    expect(progress).toBeLessThanOrEqual(10_000n);

    expect(() =>
      JSON.stringify({
        buy,
        sell,
        status,
      }),
    ).not.toThrow();

    console.log({
      chainId,
      lens: NADFUN_LENS_ADDRESS,
      token: SAMPLE_TOKEN,
      buy,
      sell,
      status,
    });
  });
});
