import { defaultRpcUrl, type MossRuntime, Registry } from "@themoss/core";
import { createPublicClient, getAddress, http } from "viem";
import { describe, expect, it } from "vitest";
import {
  NAD_NAME_SERVICE_ADDRESS,
  NadNameService,
  type NadNameServicePrimaryName,
  type NadNameServiceProfile,
} from "../src/index.js";

const RPC_URL = defaultRpcUrl();
const SAMPLE_ADDRESS = getAddress(
  process.env.NNS_SAMPLE_ADDRESS ?? "0xcccccccccccccccccccccccccccccccccccccccc",
);

function queryData<T>(result: Awaited<ReturnType<Registry["action"]>>): T {
  if (result.kind !== "query") throw new Error("Expected a Query result");
  return result.data as T;
}

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("NNS live Monad mainnet", () => {
  it("verifies deployment and executes both read-only identity Queries", {
    timeout: 60_000,
  }, async () => {
    const client = createPublicClient({
      transport: http(RPC_URL, { timeout: 30_000, retryCount: 2 }),
    });

    expect(await client.getChainId()).toBe(143);
    expect(await client.getCode({ address: NAD_NAME_SERVICE_ADDRESS })).not.toBe("0x");

    const runtime = { rpcUrl: RPC_URL, client } satisfies MossRuntime;
    const registry = new Registry(runtime).use(NadNameService);

    expect(registry.discover({ protocol: "nns" })).toHaveLength(2);

    const primaryName = queryData<NadNameServicePrimaryName>(
      await registry.action("nns", "primaryName", SAMPLE_ADDRESS, { address: SAMPLE_ADDRESS }),
    );
    const profile = queryData<NadNameServiceProfile>(
      await registry.action("nns", "profile", SAMPLE_ADDRESS, { address: SAMPLE_ADDRESS }),
    );

    expect(primaryName.address).toBe(SAMPLE_ADDRESS);
    expect(typeof primaryName.primaryName).toBe("string");
    expect(profile).toMatchObject({
      address: SAMPLE_ADDRESS,
      primaryName: expect.any(String),
      avatar: expect.any(String),
    });
    expect(() => JSON.stringify({ primaryName, profile })).not.toThrow();

    console.log({
      chainId: 143,
      contract: NAD_NAME_SERVICE_ADDRESS,
      address: SAMPLE_ADDRESS,
      primaryName,
      profile,
    });
  });
});
