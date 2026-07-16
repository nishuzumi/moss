import { type MossRuntime, Registry } from "@themoss/core";
import { AUSD_ADDRESS, monadRuntime } from "@themoss/system";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import * as morpho from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const OWNER = getAddress("0x1111111111111111111111111111111111111111");
const LIVE_OWNER = getAddress("0x484693915Abe4C4fDdF35443Eb42C76C1Ff9E367");

function offlineRegistry() {
  const client = {
    readContract: async ({ functionName }: { functionName: string }) =>
      functionName === "balanceOf" ? 1_250_000_000_000_000_000n : 1_265_000n,
  } as unknown as MossRuntime["client"];
  return new Registry({ rpcUrl: "http://offline", client }).use(morpho);
}

describe("Morpho", () => {
  it("discovers the exported Protocol and preserves parameter descriptions", async () => {
    const registry = offlineRegistry();
    expect(registry.discover({ protocol: "morpho" })).toEqual([
      expect.objectContaining({
        protocol: "morpho",
        method: "position",
        kind: "query",
        category: "lending",
        tags: ["vault", "erc4626"],
      }),
    ]);
    expect(registry.load([{ protocol: "morpho", method: "position" }])[0]?.params.owner).toEqual({
      type: expect.objectContaining({
        description: expect.stringContaining("20-byte EVM address"),
      }),
      description: expect.stringContaining("vault shares"),
    });
    await expect(
      registry.action("morpho", "position", ACCOUNT, { owner: "not-an-address" }),
    ).rejects.toThrow("Expected a 20-byte 0x address");
  });

  it("reads an owner's shares and current asset equivalent", async () => {
    const result = await offlineRegistry().action("morpho", "position", ACCOUNT, {
      owner: OWNER,
    });
    expect(result).toMatchObject({
      kind: "query",
      data: { owner: OWNER, shares: "1250000000000000000", assets: "1265000" },
    });
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Morpho mainnet", () => {
  it("verifies the curated vault and reads a live position", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();
    const [bytecode, name, symbol, decimals, asset] = await Promise.all([
      runtime.client.getCode({ address: morpho.MORPHO_AUSD_VAULT_ADDRESS }),
      runtime.client.readContract({
        address: morpho.MORPHO_AUSD_VAULT_ADDRESS,
        abi: morpho.MetaMorphoV1_1Abi,
        functionName: "name",
      }),
      runtime.client.readContract({
        address: morpho.MORPHO_AUSD_VAULT_ADDRESS,
        abi: morpho.MetaMorphoV1_1Abi,
        functionName: "symbol",
      }),
      runtime.client.readContract({
        address: morpho.MORPHO_AUSD_VAULT_ADDRESS,
        abi: morpho.MetaMorphoV1_1Abi,
        functionName: "decimals",
      }),
      runtime.client.readContract({
        address: morpho.MORPHO_AUSD_VAULT_ADDRESS,
        abi: morpho.MetaMorphoV1_1Abi,
        functionName: "asset",
      }),
    ]);
    expect(bytecode?.length).toBeGreaterThan(2);
    expect({ name, symbol, decimals: Number(decimals), asset }).toEqual({
      name: "Grove x Steakhouse High Yield AUSD",
      symbol: "grove-bbqAUSD",
      decimals: 18,
      asset: AUSD_ADDRESS,
    });

    const result = await new Registry(runtime).use(morpho).action("morpho", "position", ACCOUNT, {
      owner: LIVE_OWNER,
    });
    if (result.kind !== "query") throw new Error("expected query");
    const data = result.data as { shares: string; assets: string };
    expect(BigInt(data.shares)).toBeGreaterThan(0n);
    expect(BigInt(data.assets)).toBeGreaterThan(0n);
  });
});
