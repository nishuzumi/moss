import { type MossRuntime, type QueryResult, Registry } from "@themoss/core";
import { monadRuntime } from "@themoss/system";
import { describe, expect, it } from "vitest";
import { morphoManifest } from "../src/index.js";

const OWNER = "0x1111111111111111111111111111111111111111";
// Holder returned by the official Morpho API on 2026-07-15.
const LIVE_OWNER = "0x484693915Abe4C4fDdF35443Eb42C76C1Ff9E367";

it("discovers, loads, and queries a position", async () => {
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    client: {
      readContract: async ({ functionName }: { functionName: string }) =>
        functionName === "balanceOf" ? 1_250_000_000_000_000_000n : 1_265_000n,
      // biome-ignore lint/suspicious/noExplicitAny: minimal public-client test double
    } as any,
  };
  const registry = new Registry(runtime);
  registry.use(morphoManifest);

  expect(registry.discover({ protocol: "morpho" })[0]).toMatchObject({
    protocol: "morpho",
    method: "position",
    kind: "query",
    category: "lending",
    tags: ["vault", "erc4626"],
  });
  expect(registry.load([{ protocol: "morpho", method: "position" }])[0]).toMatchObject({
    risk: [],
    params: { owner: expect.stringContaining("address") },
  });

  const result = (await registry.action("morpho", "position", OWNER, {
    owner: OWNER,
  })) as QueryResult;
  expect(result.data).toEqual({
    owner: OWNER,
    shares: "1250000000000000000",
    assets: "1265000",
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("morpho adapter (Monad mainnet e2e)", () => {
  it("reads a live AUSD vault position", { timeout: 60_000 }, async () => {
    const runtime = monadRuntime();
    const registry = new Registry(runtime);
    registry.use(morphoManifest);

    const result = (await registry.action("morpho", "position", LIVE_OWNER, {
      owner: LIVE_OWNER,
    })) as QueryResult;
    expect(result.data).toEqual({
      owner: LIVE_OWNER,
      shares: expect.stringMatching(/^\d+$/),
      assets: expect.stringMatching(/^\d+$/),
    });
  });
});
