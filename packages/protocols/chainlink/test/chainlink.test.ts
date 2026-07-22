import { type MossRuntime, Registry } from "@themoss/core";
import { monadRuntime } from "@themoss/system";
import { getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import { aggregatorV3Abi, Chainlink } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");

/**
 * Official Chainlink MON / USD Standard Feed on Monad mainnet.
 *
 * Source:
 * https://data.chain.link/feeds/monad/monad/mon-usd
 */
const MON_USD_FEED = getAddress("0xBcD78f76005B7515837af6b50c7C52BCf73822fb");

const FEED = getAddress("0x1111111111111111111111111111111111111111");

describe("Chainlink", () => {
  it("registers and exposes the latestRound Query", () => {
    const { registry } = offlineRegistry();

    expect(registry.discover({ protocol: "chainlink" })).toEqual([
      {
        protocol: "chainlink",
        method: "latestRound",
        kind: "query",
        category: "token",
        tags: ["oracle", "price-feed"],
        summary: "Read the latest Chainlink Data Feed round",
      },
    ]);

    const [loaded] = registry.load([
      {
        protocol: "chainlink",
        method: "latestRound",
      },
    ]);

    expect(loaded).toMatchObject({
      protocol: "chainlink",
      method: "latestRound",
      kind: "query",
      category: "token",
      risk: [],
      tags: ["oracle", "price-feed"],
    });

    expect(loaded?.params.feed).toMatchObject({
      description: expect.stringContaining("proxy address"),
    });
  });

  it("reads and formats the latest Feed round", async () => {
    const { registry, readContract } = offlineRegistry();

    const result = await registry.action("chainlink", "latestRound", ACCOUNT, {
      feed: FEED,
    });

    expect(result).toEqual({
      kind: "query",
      protocol: "chainlink",
      method: "latestRound",
      data: {
        feed: FEED,
        description: "MON / USD",
        decimals: 8,
        version: "4",
        roundId: "123",
        answer: "123456789",
        formattedAnswer: "1.23456789",
        startedAt: "1700000000",
        updatedAt: "1700000010",
        answeredInRound: "123",
      },
    });

    expect(readContract).toHaveBeenCalledTimes(4);
  });

  it("rejects an invalid Feed address before reading RPC data", async () => {
    const { registry, readContract } = offlineRegistry();

    await expect(
      registry.action("chainlink", "latestRound", ACCOUNT, {
        feed: "not-an-address",
      }),
    ).rejects.toThrow("invalid parameters");

    expect(readContract).not.toHaveBeenCalled();
  });

  it("exports the complete AggregatorV3 interface", () => {
    const functionNames = aggregatorV3Abi
      .filter((item) => item.type === "function")
      .map((item) => item.name);

    expect(functionNames).toEqual(
      expect.arrayContaining([
        "decimals",
        "description",
        "version",
        "getRoundData",
        "latestRoundData",
      ]),
    );
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Chainlink Monad mainnet", () => {
  it("reads the official MON / USD Feed", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();

    const bytecode = await runtime.client.getCode({
      address: MON_USD_FEED,
    });

    expect(bytecode?.length).toBeGreaterThan(2);

    const result = await new Registry(runtime)
      .use(Chainlink)
      .action("chainlink", "latestRound", ACCOUNT, {
        feed: MON_USD_FEED,
      });

    if (result.kind !== "query") {
      throw new Error("expected Chainlink Query result");
    }

    const data = result.data as Record<string, unknown>;

    expect(data).toMatchObject({
      feed: MON_USD_FEED,
      description: expect.stringContaining("MON"),
      decimals: 8,
    });

    expect(BigInt(String(data.answer))).toBeGreaterThan(0n);
    expect(BigInt(String(data.updatedAt))).toBeGreaterThan(0n);
    expect(String(data.formattedAnswer)).not.toBe("");
  });
});

function offlineRegistry() {
  const readContract = vi.fn(
    async ({ address, functionName }: { address: string; functionName: string }) => {
      expect(address).toBe(FEED);

      switch (functionName) {
        case "description":
          return "MON / USD";

        case "decimals":
          return 8;

        case "version":
          return 4n;

        case "latestRoundData":
          return [123n, 123456789n, 1700000000n, 1700000010n, 123n] as const;

        default:
          throw new Error(`unexpected Chainlink read: ${functionName}`);
      }
    },
  );

  const client = {
    readContract,
  } as unknown as MossRuntime["client"];

  const runtime: MossRuntime = {
    rpcUrl: "http://offline",
    client,
  };

  return {
    registry: new Registry(runtime).use(Chainlink),
    readContract,
  };
}
