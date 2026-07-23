import { type MossRuntime, Registry } from "@themoss/core";
import { getAddress, isAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAGMA_ADDRESS, Magma } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const CORE_VAULT = getAddress("0x1111111111111111111111111111111111111111");
const G_VAULT = getAddress("0x2222222222222222222222222222222222222222");

interface ReadRequest {
  address: string;
  functionName: string;
  args?: readonly unknown[];
}

const readContract = vi.fn(async ({ functionName }: ReadRequest) => {
  switch (functionName) {
    case "totalAssets":
      return 123456789n;
    case "coreVault":
      return CORE_VAULT;
    case "gVault":
      return G_VAULT;
    case "rewardsFee":
      return 300n;
    case "withdrawalFee":
      return 50n;
    default:
      throw new Error(`Unexpected read: ${functionName}`);
  }
});

const runtime = {
  rpcUrl: "http://offline",
  client: { readContract } as unknown as MossRuntime["client"],
};

describe("Magma read-only Protocol", () => {
  beforeEach(() => {
    readContract.mockClear();
  });

  it("registers the canonical address and five read-only Queries", () => {
    expect(isAddress(MAGMA_ADDRESS, { strict: false })).toBe(true);

    const registry = new Registry(runtime).use(Magma);
    const discovered = registry.discover({ protocol: "magma" });

    expect(discovered).toHaveLength(5);
    expect(discovered.map(({ method }) => method).sort()).toEqual(
      ["coreVault", "gVault", "rewardsFee", "totalAssets", "withdrawalFee"].sort(),
    );
    expect(
      discovered.every(({ kind, category }) => kind === "query" && category === "staking"),
    ).toBe(true);

    expect(registry.load([{ protocol: "magma", method: "totalAssets" }])[0]).toMatchObject({
      protocol: "magma",
      method: "totalAssets",
      kind: "query",
      category: "staking",
      risk: [],
      params: {},
    });
  });

  it("reads and serializes Magma vault state through the configured contract", async () => {
    const registry = new Registry(runtime).use(Magma);

    await expect(registry.action("magma", "totalAssets", ACCOUNT, {})).resolves.toEqual({
      kind: "query",
      protocol: "magma",
      method: "totalAssets",
      data: { assets: "123456789" },
    });

    await expect(registry.action("magma", "coreVault", ACCOUNT, {})).resolves.toEqual({
      kind: "query",
      protocol: "magma",
      method: "coreVault",
      data: { address: CORE_VAULT },
    });

    await expect(registry.action("magma", "gVault", ACCOUNT, {})).resolves.toEqual({
      kind: "query",
      protocol: "magma",
      method: "gVault",
      data: { address: G_VAULT },
    });

    await expect(registry.action("magma", "rewardsFee", ACCOUNT, {})).resolves.toEqual({
      kind: "query",
      protocol: "magma",
      method: "rewardsFee",
      data: { rewardsFee: "300" },
    });

    await expect(registry.action("magma", "withdrawalFee", ACCOUNT, {})).resolves.toEqual({
      kind: "query",
      protocol: "magma",
      method: "withdrawalFee",
      data: { withdrawalFee: "50" },
    });

    expect(readContract.mock.calls.map(([request]) => request.functionName)).toEqual([
      "totalAssets",
      "coreVault",
      "gVault",
      "rewardsFee",
      "withdrawalFee",
    ]);

    for (const [request] of readContract.mock.calls) {
      expect(request).toMatchObject({
        address: MAGMA_ADDRESS,
        args: [],
      });
    }
  });
});
