import { type AddressValue, type MossRuntime, Registry } from "@themoss/core";
import { getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import { NADFUN_LENS_ADDRESS, NadFun } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");

const TOKEN = getAddress("0xe85170a4303cBA6DD224628F5Aa052fb7FeB7777");

const BUY_ROUTER = getAddress("0x6F6B8F1a20703309951a5127c45B49b1CD981A22");

const SELL_ROUTER = getAddress("0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137");

interface ReadContractRequest {
  address: AddressValue;
  functionName: string;
  args?: readonly unknown[];
}

function offlineRegistry() {
  const readContract = vi.fn(async (request: ReadContractRequest): Promise<unknown> => {
    expect(request.address).toBe(NADFUN_LENS_ADDRESS);

    switch (request.functionName) {
      case "getAmountOut":
        return request.args?.[2] === true ? [BUY_ROUTER, 11_802n] : [SELL_ROUTER, 2_500n];

      case "isGraduated":
        return false;

      case "isLocked":
        return true;

      case "getProgress":
        return 7_500n;

      default:
        throw new Error(`Unexpected readContract function ${request.functionName}`);
    }
  });

  const runtime = {
    rpcUrl: "http://offline",
    client: {
      readContract,
    } as unknown as MossRuntime["client"],
  };

  return {
    registry: new Registry(runtime).use(NadFun),
    readContract,
  };
}

describe("NadFun", () => {
  it("discovers three self-describing Query methods", () => {
    const { registry } = offlineRegistry();

    const coordinates = registry.discover({
      protocol: "nadfun",
    });

    expect(coordinates).toHaveLength(3);

    expect(coordinates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "nadfun",
          method: "quoteBuy",
          kind: "query",
          category: "dex",
        }),
        expect.objectContaining({
          protocol: "nadfun",
          method: "quoteSell",
          kind: "query",
          category: "dex",
        }),
        expect.objectContaining({
          protocol: "nadfun",
          method: "tokenStatus",
          kind: "query",
          category: "dex",
        }),
      ]),
    );

    const [buyLoaded] = registry.load([
      {
        protocol: "nadfun",
        method: "quoteBuy",
      },
    ]);

    if (!buyLoaded) {
      throw new Error("quoteBuy load result is undefined");
    }

    expect(buyLoaded).toMatchObject({
      kind: "query",
      risk: [],
      tags: ["quote", "buy", "bonding-curve"],
      params: {
        token: {
          description: expect.stringContaining("buy"),
        },
        amountIn: {
          description: expect.stringContaining("wei"),
        },
      },
    });

    const [sellLoaded] = registry.load([
      {
        protocol: "nadfun",
        method: "quoteSell",
      },
    ]);

    if (!sellLoaded) {
      throw new Error("quoteSell load result is undefined");
    }

    expect(sellLoaded).toMatchObject({
      kind: "query",
      risk: [],
      tags: ["quote", "sell", "bonding-curve"],
      params: {
        token: {
          description: expect.stringContaining("sell"),
        },
        amountIn: {
          description: expect.stringContaining("base units"),
        },
      },
    });

    expect((buyLoaded.params.amountIn as { description: string }).description).not.toEqual(
      (sellLoaded.params.amountIn as { description: string }).description,
    );
  });

  it("quotes a buy with exact base-unit input", async () => {
    const { registry, readContract } = offlineRegistry();

    const result = await registry.action("nadfun", "quoteBuy", ACCOUNT, {
      token: TOKEN,
      amountIn: "1000000000000000000",
    });

    expect(result).toEqual({
      kind: "query",
      protocol: "nadfun",
      method: "quoteBuy",
      data: {
        side: "buy",
        token: TOKEN,
        amountIn: "1000000000000000000",
        router: BUY_ROUTER,
        amountOut: "11802",
      },
    });

    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: NADFUN_LENS_ADDRESS,
        functionName: "getAmountOut",
        args: [TOKEN, 1_000_000_000_000_000_000n, true],
      }),
    );
  });

  it("quotes a sell and preserves the Lens-selected router", async () => {
    const { registry, readContract } = offlineRegistry();

    const result = await registry.action("nadfun", "quoteSell", ACCOUNT, {
      token: TOKEN,
      amountIn: "1000",
    });

    expect(result).toMatchObject({
      kind: "query",
      data: {
        side: "sell",
        token: TOKEN,
        amountIn: "1000",
        router: SELL_ROUTER,
        amountOut: "2500",
      },
    });

    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getAmountOut",
        args: [TOKEN, 1_000n, false],
      }),
    );
  });

  it("reads graduation, lock, and progress status", async () => {
    const { registry, readContract } = offlineRegistry();

    const result = await registry.action("nadfun", "tokenStatus", ACCOUNT, {
      token: TOKEN,
    });

    expect(result).toEqual({
      kind: "query",
      protocol: "nadfun",
      method: "tokenStatus",
      data: {
        token: TOKEN,
        graduated: false,
        locked: true,
        progressBps: "7500",
      },
    });

    const functions = readContract.mock.calls.map(
      ([request]) => (request as ReadContractRequest).functionName,
    );

    expect(functions).toEqual(["isGraduated", "isLocked", "getProgress"]);
  });

  it("rejects zero or non-integer input before an RPC read", async () => {
    const { registry, readContract } = offlineRegistry();

    for (const amountIn of ["0", "-1", "1.5"]) {
      await expect(
        registry.action("nadfun", "quoteBuy", ACCOUNT, {
          token: TOKEN,
          amountIn,
        }),
      ).rejects.toThrow();
    }

    expect(readContract).not.toHaveBeenCalled();
  });
});
