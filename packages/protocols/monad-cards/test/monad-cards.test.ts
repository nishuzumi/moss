import { createRuntime, type MossRuntime, Registry } from "@themoss/core";

import { getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import { MONAD_CARDS_ADDRESS, MonadCards, monadCardsAbi } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");

function offlineRegistry(readContract: MossRuntime["client"]["readContract"]) {
  const runtime = {
    rpcUrl: "http://offline",
    client: { readContract } as unknown as MossRuntime["client"],
  };
  return new Registry(runtime).use(MonadCards);
}

describe("Monad Cards", () => {
  it("discovers and loads totalMinted with no parameters", () => {
    const registry = offlineRegistry(vi.fn());

    expect(registry.discover({ protocol: "monad-cards" })).toEqual([
      expect.objectContaining({
        protocol: "monad-cards",
        method: "totalMinted",
        kind: "query",
        category: "nft",
      }),
    ]);
    expect(registry.load([{ protocol: "monad-cards", method: "totalMinted" }])).toEqual([
      expect.objectContaining({
        protocol: "monad-cards",
        method: "totalMinted",
        kind: "query",
        params: {},
      }),
    ]);
  });

  it("reads the fixed contract and converts bigint to a decimal string", async () => {
    const readContract = vi.fn(async () => 12_345n);
    const registry = offlineRegistry(
      readContract as unknown as MossRuntime["client"]["readContract"],
    );

    await expect(registry.action("monad-cards", "totalMinted", ACCOUNT, {})).resolves.toEqual({
      kind: "query",
      protocol: "monad-cards",
      method: "totalMinted",
      data: { totalMinted: "12345" },
    });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MONAD_CARDS_ADDRESS,
        functionName: "totalMinted",
        args: [],
      }),
    );
  });

  it("propagates contract read failures", async () => {
    const readContract = vi.fn(async () => {
      throw new Error("Monad Cards read unavailable");
    });
    const registry = offlineRegistry(
      readContract as unknown as MossRuntime["client"]["readContract"],
    );

    await expect(registry.action("monad-cards", "totalMinted", ACCOUNT, {})).rejects.toThrow(
      "Monad Cards read unavailable",
    );
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Monad Cards on Monad mainnet", () => {
  it("is the Monad Cards collection and returns a positive minted supply", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    expect(
      (await runtime.client.getCode({ address: MONAD_CARDS_ADDRESS }))?.length,
    ).toBeGreaterThan(2);

    const collection = {
      address: MONAD_CARDS_ADDRESS,
      abi: monadCardsAbi,
    } as const;
    expect(await runtime.client.readContract({ ...collection, functionName: "name" })).toBe(
      "Monad Cards",
    );
    expect(await runtime.client.readContract({ ...collection, functionName: "symbol" })).toBe(
      "CARDS",
    );
    expect(
      await runtime.client.readContract({
        ...collection,
        functionName: "supportsInterface",
        args: ["0x80ac58cd"],
      }),
    ).toBe(true);

    const query = await new Registry(runtime)
      .use(MonadCards)
      .action("monad-cards", "totalMinted", ACCOUNT, {});
    if (query.kind !== "query") throw new Error("expected totalMinted Query");
    expect(BigInt((query.data as { totalMinted: string }).totalMinted)).toBeGreaterThan(0n);
  });
});
