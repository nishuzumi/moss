import { type AddressValue, type MossRuntime, Registry } from "@themoss/core";
import { getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import { NAD_NAME_SERVICE_ADDRESS, NadNameService } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");

interface ReadContractRequest {
  address: AddressValue;
  functionName: string;
  args?: readonly unknown[];
}

function offlineRegistry() {
  const readContract = vi.fn(async (request: ReadContractRequest): Promise<unknown> => {
    expect(request.address).toBe(NAD_NAME_SERVICE_ADDRESS);

    switch (request.functionName) {
      case "getPrimaryNameForAddress":
        expect(request.args).toEqual([ACCOUNT]);
        return "salmo.nad";
      case "getProfileForAddress":
        expect(request.args).toEqual([ACCOUNT]);
        return { addr: ACCOUNT, primaryName: "salmo.nad", avatar: "ipfs://avatar" };
      default:
        throw new Error(`Unexpected readContract function ${request.functionName}`);
    }
  });

  const runtime = {
    rpcUrl: "http://offline",
    client: { readContract } as unknown as MossRuntime["client"],
  };

  return { registry: new Registry(runtime).use(NadNameService), readContract };
}

describe("NadNameService", () => {
  it("discovers self-describing identity Queries", () => {
    const { registry } = offlineRegistry();
    const coordinates = registry.discover({ protocol: "nns" });

    expect(coordinates).toHaveLength(2);
    expect(coordinates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "nns",
          method: "primaryName",
          kind: "query",
          category: "token",
          tags: ["identity", "name-service"],
        }),
        expect.objectContaining({
          protocol: "nns",
          method: "profile",
          kind: "query",
          category: "token",
          tags: ["identity", "name-service"],
        }),
      ]),
    );

    expect(registry.load([{ protocol: "nns", method: "profile" }])).toMatchObject([
      {
        params: {
          address: {
            description: "Address whose Nad Name Service identity is queried.",
          },
        },
      },
    ]);
  });

  it("reads a primary name and preserves the requested address", async () => {
    const { registry, readContract } = offlineRegistry();

    const result = await registry.action("nns", "primaryName", ACCOUNT, { address: ACCOUNT });

    expect(result).toEqual({
      kind: "query",
      protocol: "nns",
      method: "primaryName",
      data: { address: ACCOUNT, primaryName: "salmo.nad" },
    });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: NAD_NAME_SERVICE_ADDRESS,
        functionName: "getPrimaryNameForAddress",
        args: [ACCOUNT],
      }),
    );
  });

  it("normalizes the on-chain profile tuple into JSON-safe fields", async () => {
    const { registry, readContract } = offlineRegistry();

    const result = await registry.action("nns", "profile", ACCOUNT, { address: ACCOUNT });

    expect(result).toEqual({
      kind: "query",
      protocol: "nns",
      method: "profile",
      data: {
        address: ACCOUNT,
        primaryName: "salmo.nad",
        avatar: "ipfs://avatar",
      },
    });
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getProfileForAddress",
        args: [ACCOUNT],
      }),
    );
  });

  it("also accepts a positional tuple profile from a lower-level mock client", async () => {
    const { registry, readContract } = offlineRegistry();
    readContract.mockImplementationOnce(async () => [ACCOUNT, "salmo.nad", "ipfs://avatar"]);

    const result = await registry.action("nns", "profile", ACCOUNT, { address: ACCOUNT });

    expect(result).toMatchObject({
      kind: "query",
      data: { address: ACCOUNT, primaryName: "salmo.nad", avatar: "ipfs://avatar" },
    });
  });

  it("rejects invalid addresses before an RPC read", async () => {
    const { registry, readContract } = offlineRegistry();

    await expect(
      registry.action("nns", "primaryName", ACCOUNT, { address: "not-an-address" }),
    ).rejects.toThrow();
    expect(readContract).not.toHaveBeenCalled();
  });
});
