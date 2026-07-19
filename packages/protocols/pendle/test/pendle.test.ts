import { type MossRuntime, ParameterError, Registry } from "@themoss/core";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { Pendle } from "../src/pendle.js";

const MARKET = getAddress("0x1111111111111111111111111111111111111111");
const SY = getAddress("0x2222222222222222222222222222222222222222");
const PT = getAddress("0x3333333333333333333333333333333333333333");
const YT = getAddress("0x4444444444444444444444444444444444444444");
const UNDERLYING = getAddress("0x5555555555555555555555555555555555555555");
const OTHER = getAddress("0x6666666666666666666666666666666666666666");
const ACCOUNT = getAddress("0x7777777777777777777777777777777777777777");

function runtimeReadingTokens(tokens: readonly string[]): MossRuntime {
  return {
    rpcUrl: "",
    client: {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName !== "readTokens") throw new Error(`unexpected read ${functionName}`);
        return tokens;
      },
    },
  } as unknown as MossRuntime;
}

describe("Pendle protocol", () => {
  it("registers a dex swap tagged for yield PT trading", () => {
    const registry = new Registry({ rpcUrl: "" } as MossRuntime).use(Pendle);
    const swap = registry.discover().find((c) => c.protocol === "pendle" && c.method === "swap");

    expect(swap).toMatchObject({ kind: "capability", category: "dex", verb: "swap" });
    expect(swap?.tags).toEqual(expect.arrayContaining(["yield", "pt"]));
  });

  it("registers quote and markets as read-only queries", () => {
    const registry = new Registry({ rpcUrl: "" } as MossRuntime).use(Pendle);
    const byMethod = new Map(
      registry
        .discover({ protocol: "pendle" })
        .map((coordinate) => [coordinate.method, coordinate]),
    );

    expect(byMethod.get("quote")).toMatchObject({ kind: "query" });
    expect(byMethod.get("markets")).toMatchObject({ kind: "query" });
  });

  it("rejects a swap where neither token is the market PT", async () => {
    const registry = new Registry(runtimeReadingTokens([SY, PT, YT])).use(Pendle);
    await expect(
      registry.action("pendle", "swap", ACCOUNT, {
        market: MARKET,
        tokenIn: UNDERLYING,
        tokenOut: OTHER,
        amountIn: "1",
        slippageBps: 50,
      }),
    ).rejects.toThrow(ParameterError);
  });
});
