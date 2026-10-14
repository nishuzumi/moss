import { type AddressValue, type MossRuntime, Registry } from "@themoss/core";
import { getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PYTH_MAX_AGE_SECONDS,
  PYTH_FEEDS,
  PYTH_PRICE_FEED_ADDRESS,
  Pyth,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");

interface ReadContractRequest {
  address: AddressValue;
  functionName: string;
  args?: readonly unknown[];
}

const SAMPLE_PRICE = {
  price: 123_456_789n,
  conf: 10_000n,
  expo: -8,
  publishTime: 1_785_312_000n,
} as const;

function offlineRegistry() {
  const readContract = vi.fn(async (request: ReadContractRequest): Promise<unknown> => {
    expect(request.address).toBe(PYTH_PRICE_FEED_ADDRESS);
    if (request.functionName !== "getPriceNoOlderThan") {
      throw new Error(`Unexpected readContract function ${request.functionName}`);
    }
    return SAMPLE_PRICE;
  });

  const runtime = {
    rpcUrl: "http://offline",
    client: {
      readContract,
    } as unknown as MossRuntime["client"],
  };

  return {
    registry: new Registry(runtime).use(Pyth),
    readContract,
  };
}

describe("Pyth", () => {
  it("discovers and loads one self-describing oracle Query", () => {
    const { registry } = offlineRegistry();

    expect(registry.discover({ protocol: "pyth" })).toEqual([
      expect.objectContaining({
        protocol: "pyth",
        method: "price",
        kind: "query",
        category: "oracle",
        tags: ["price", "feed", "freshness"],
      }),
    ]);

    const [loaded] = registry.load([{ protocol: "pyth", method: "price" }]);
    expect(loaded).toMatchObject({
      kind: "query",
      risk: [],
      params: {
        feed: {
          type: {
            enum: expect.arrayContaining(["MON_USD", "BTC_USD", "ETH_USD"]),
          },
          description: expect.stringContaining("Official Monad"),
        },
        maxAgeSeconds: {
          type: {
            default: DEFAULT_PYTH_MAX_AGE_SECONDS,
            minimum: 1,
            maximum: 86_400,
          },
          description: expect.stringContaining("older"),
        },
      },
    });
  });

  it("reads an allowlisted feed with the default freshness limit", async () => {
    const { registry, readContract } = offlineRegistry();

    const result = await registry.action("pyth", "price", ACCOUNT, {
      feed: "MON_USD",
    });

    expect(result).toEqual({
      kind: "query",
      protocol: "pyth",
      method: "price",
      data: {
        feed: "MON_USD",
        feedId: PYTH_FEEDS.MON_USD,
        price: "123456789",
        confidence: "10000",
        exponent: -8,
        publishTime: "1785312000",
      },
    });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: PYTH_PRICE_FEED_ADDRESS,
        functionName: "getPriceNoOlderThan",
        args: [PYTH_FEEDS.MON_USD, 3_600n],
      }),
    );
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("passes an explicit freshness limit to the contract", async () => {
    const { registry, readContract } = offlineRegistry();

    await registry.action("pyth", "price", ACCOUNT, {
      feed: "BTC_USD",
      maxAgeSeconds: 120,
    });

    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [PYTH_FEEDS.BTC_USD, 120n],
      }),
    );
  });

  it("rejects unknown feeds and invalid freshness limits before RPC", async () => {
    const { registry, readContract } = offlineRegistry();

    for (const params of [
      { feed: "UNKNOWN_USD" },
      { feed: "MON_USD", maxAgeSeconds: 0 },
      { feed: "MON_USD", maxAgeSeconds: 86_401 },
      { feed: "MON_USD", maxAgeSeconds: 1.5 },
    ]) {
      await expect(registry.action("pyth", "price", ACCOUNT, params)).rejects.toThrow();
    }

    expect(readContract).not.toHaveBeenCalled();
  });

  it("propagates freshness and contract read failures", async () => {
    const readContract = vi.fn(async () => {
      throw new Error("StalePrice");
    });
    const runtime = {
      rpcUrl: "http://offline",
      client: { readContract } as unknown as MossRuntime["client"],
    };
    const registry = new Registry(runtime).use(Pyth);

    await expect(
      registry.action("pyth", "price", ACCOUNT, {
        feed: "MON_USD",
      }),
    ).rejects.toThrow("StalePrice");
  });
});
