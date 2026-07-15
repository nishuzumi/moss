import { type MossRuntime, type QueryResult, Registry } from "@themoss/core";
import { monadRuntime } from "@themoss/system";
import { describe, expect, it } from "vitest";
import {
  AUSD_ADDRESS,
  MetaMorphoV1_1Abi,
  MORPHO_AUSD_VAULT_ADDRESS,
  morphoManifest,
} from "../src/index.js";

const ACCOUNT = "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC";
const OWNER = "0x1111111111111111111111111111111111111111";
// Holder returned by the official Morpho API on 2026-07-15.
const LIVE_OWNER = "0x484693915Abe4C4fDdF35443Eb42C76C1Ff9E367";

it("is discoverable and loadable as a lending position query", () => {
  const registry = new Registry({
    chainId: 143,
    rpcUrl: "http://offline",
    // biome-ignore lint/suspicious/noExplicitAny: discover/load performs no RPC reads
    client: {} as any,
  });
  registry.use(morphoManifest);

  expect(registry.discover({ protocol: "morpho" })).toEqual([
    expect.objectContaining({
      protocol: "morpho",
      method: "position",
      kind: "query",
      category: "lending",
      tags: ["vault", "erc4626"],
    }),
  ]);
  expect(registry.load([{ protocol: "morpho", method: "position" }])).toEqual([
    expect.objectContaining({ risk: [], params: { owner: expect.stringContaining("address") } }),
  ]);
});

it("queries one owner's AUSD vault position", async () => {
  const reads: string[] = [];
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    client: {
      readContract: async ({ functionName }: { functionName: string }) => {
        reads.push(functionName);
        return functionName === "balanceOf" ? 1_250_000_000_000_000_000n : 1_265_000n;
      },
      // biome-ignore lint/suspicious/noExplicitAny: minimal public-client test double
    } as any,
  };
  const registry = new Registry(runtime);
  registry.use(morphoManifest);

  const result = (await registry.action("morpho", "position", ACCOUNT, {
    owner: OWNER,
  })) as QueryResult;

  expect(result.data).toEqual({
    owner: OWNER,
    vault: MORPHO_AUSD_VAULT_ADDRESS,
    vaultName: "Grove x Steakhouse High Yield AUSD",
    shareSymbol: "grove-bbqAUSD",
    shareDecimals: 18,
    shares: "1250000000000000000",
    asset: AUSD_ADDRESS,
    assetSymbol: "AUSD",
    assetDecimals: 6,
    assets: "1265000",
  });
  expect(reads).toEqual(["balanceOf", "convertToAssets"]);
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("morpho adapter (Monad mainnet e2e)", () => {
  it("reads a live AUSD vault position", { timeout: 60_000 }, async () => {
    const runtime = monadRuntime();
    const registry = new Registry(runtime);
    registry.use(morphoManifest);

    const result = (await registry.action("morpho", "position", ACCOUNT, {
      owner: LIVE_OWNER,
    })) as QueryResult;
    const data = result.data as { shares: string; assets: string };
    const shares = await runtime.client.readContract({
      abi: MetaMorphoV1_1Abi,
      address: MORPHO_AUSD_VAULT_ADDRESS,
      functionName: "balanceOf",
      args: [LIVE_OWNER],
    });
    const assets = await runtime.client.readContract({
      abi: MetaMorphoV1_1Abi,
      address: MORPHO_AUSD_VAULT_ADDRESS,
      functionName: "convertToAssets",
      args: [shares],
    });

    expect(data).toMatchObject({ shares: shares.toString(), assets: assets.toString() });
  });
});
