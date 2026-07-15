import { type MossRuntime, NATIVE, type Plan } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { buildMintPlan } from "../../src/simple-mint.mjs";

const ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc";
const COLLECTION = "0x1111111111111111111111111111111111111111";
const TOKEN_URI = "ipfs://example-token";
const MINT_PRICE = 25n * 10n ** 16n;

describe("simple mint example", () => {
  it("builds a public ERC-721 mint plan with quantified expects", async () => {
    const runtime: MossRuntime = {
      chainId: 143,
      rpcUrl: "http://offline",
      client: {
        readContract: async () => MINT_PRICE,
        // biome-ignore lint/suspicious/noExplicitAny: only readContract is used in this example test
      } as any,
    };

    const plan = (await buildMintPlan(runtime, {
      account: ACCOUNT,
      collection: COLLECTION,
      tokenUri: TOKEN_URI,
    })) as Plan;

    expect(plan.protocol).toBe("public-mint-721");
    expect(plan.method).toBe("mint");
    expect(plan.verb).toBe("mint");
    expect(plan.txs[0]?.to).toBe(COLLECTION);
    expect(plan.txs[0]?.value).toBe("0x3782dace9d90000");
    expect(plan.expects.out).toEqual([{ token: NATIVE, amountMax: MINT_PRICE.toString() }]);
    expect(plan.expects.nfts).toEqual([{ collection: COLLECTION, count: 1, direction: "in" }]);
  });
});
