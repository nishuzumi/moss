import { type MossRuntime, NATIVE, type Plan, type QueryResult, Registry } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { nftMintManifest } from "../src/index.js";

const ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc";
const COLLECTION = "0x1111111111111111111111111111111111111111";
const TOKEN_URI = "ipfs://example-token";
const MINT_PRICE = 25n * 10n ** 16n;

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    client: {
      readContract: async () => MINT_PRICE,
      // biome-ignore lint/suspicious/noExplicitAny: only readContract is used in these tests
    } as any,
  };
  const registry = new Registry(runtime);
  registry.use(nftMintManifest);
  return registry;
}

describe("public mint 721 adapter (offline)", () => {
  it("is discoverable and builds a quantified mint plan", async () => {
    const registry = offlineRegistry();

    const [coordinate] = registry.discover({ protocol: "public-mint-721", verb: "mint" });
    expect(coordinate).toMatchObject({
      protocol: "public-mint-721",
      method: "mint",
      kind: "capability",
      category: "nft",
    });

    const [stub] = registry.load([{ protocol: "public-mint-721", method: "mint" }]);
    expect(stub?.risk).toEqual(["fundOut"]);
    expect(Object.keys(stub?.params ?? {})).toEqual(["collection", "tokenUri"]);

    const built = (await registry.action("public-mint-721", "mint", ACCOUNT, {
      collection: COLLECTION,
      tokenUri: TOKEN_URI,
    })) as Plan;

    expect(built.txs).toHaveLength(1);
    expect(built.txs[0]?.to).toBe(COLLECTION);
    expect(built.txs[0]?.value).toBe("0x3782dace9d90000");
    expect(built.expects.out).toEqual([{ token: NATIVE, amountMax: MINT_PRICE.toString() }]);
    expect(built.expects.nfts).toEqual([{ collection: COLLECTION, count: 1, direction: "in" }]);
    expect(built.planHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("queries mintPrice as base units and MON", async () => {
    const registry = offlineRegistry();

    const [stub] = registry.load([{ protocol: "public-mint-721", method: "mintPrice" }]);
    expect(stub?.kind).toBe("query");
    expect(Object.keys(stub?.params ?? {})).toEqual(["collection"]);

    const result = (await registry.action("public-mint-721", "mintPrice", ACCOUNT, {
      collection: COLLECTION,
    })) as QueryResult;

    expect(result.data).toEqual({
      collection: COLLECTION,
      priceWei: MINT_PRICE.toString(),
      priceMon: "0.25",
    });
  });
});
