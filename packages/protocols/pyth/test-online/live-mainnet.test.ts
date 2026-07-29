import { type MossRuntime, Registry } from "@themoss/core";
import { createPublicClient, getAddress, http } from "viem";
import { describe, expect, it } from "vitest";
import { PYTH_PRICE_FEED_ADDRESS, Pyth, type PythPrice } from "../src/index.js";

const RPC_URL = process.env.MOSS_RPC_URL ?? "https://rpc.monad.xyz";
const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Pyth live Monad mainnet", () => {
  it("verifies deployment and reads a fresh MON/USD price", { timeout: 60_000 }, async () => {
    const client = createPublicClient({
      transport: http(RPC_URL, {
        timeout: 30_000,
        retryCount: 2,
      }),
    });
    expect(await client.getChainId()).toBe(143);

    const code = await client.getCode({ address: PYTH_PRICE_FEED_ADDRESS });
    expect(code).toBeDefined();
    expect(code).not.toBe("0x");

    const runtime = {
      rpcUrl: RPC_URL,
      client,
    } satisfies MossRuntime;
    const result = await new Registry(runtime).use(Pyth).action("pyth", "price", ACCOUNT, {
      feed: "MON_USD",
      maxAgeSeconds: 86_400,
    });
    if (result.kind !== "query") {
      throw new Error("Expected a Query result");
    }

    const price = result.data as unknown as PythPrice;
    const latestBlock = await client.getBlock({ blockTag: "latest" });
    const publishTime = BigInt(price.publishTime);

    expect(BigInt(price.price)).toBeGreaterThan(0n);
    expect(BigInt(price.confidence)).toBeGreaterThanOrEqual(0n);
    expect(publishTime).toBeLessThanOrEqual(latestBlock.timestamp);
    expect(latestBlock.timestamp - publishTime).toBeLessThanOrEqual(86_400n);
    expect(() => JSON.stringify(price)).not.toThrow();
  });
});
