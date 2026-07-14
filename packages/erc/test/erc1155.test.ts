import {
  createRuntime,
  type MossRuntime,
  type Plan,
  type QueryResult,
  Registry,
} from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { decodeFunctionData, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ierc1155Abi } from "../src/abis/erc.js";
import { ercManifest } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const FIXTURE_COLLECTION = getAddress("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    // biome-ignore lint/suspicious/noExplicitAny: reads unused in offline tests
    client: {} as any,
  };
  const registry = new Registry(runtime);
  registry.use(ercManifest);
  return registry;
}

describe("erc1155 generic protocol (offline)", () => {
  it("adds a multi-token transfer and balance query to the nft category", () => {
    const registry = offlineRegistry();
    const nft = registry.discover({ category: "nft" });
    expect(nft).toHaveLength(5); // erc721: 3; erc1155: 2
    expect(nft).toContainEqual(
      expect.objectContaining({ protocol: "erc1155", method: "transfer", verb: "transfer" }),
    );
    const [stub] = registry.load([{ protocol: "erc1155", method: "transfer" }]);
    expect(Object.keys(stub?.params ?? {})).toEqual(["collection", "tokenId", "amount", "to"]);
  });

  it("builds safeTransferFrom and declares the transferred amount", async () => {
    const registry = offlineRegistry();
    const built = (await registry.action("erc1155", "transfer", ACCOUNT, {
      collection: FIXTURE_COLLECTION,
      tokenId: "42",
      amount: "3",
      to: RECIPIENT,
    })) as Plan;

    expect(built.txs[0]?.to).toBe(FIXTURE_COLLECTION);
    const decoded = decodeFunctionData({ abi: ierc1155Abi, data: built.txs[0]?.data ?? "0x" });
    expect(decoded.functionName).toBe("safeTransferFrom");
    expect(decoded.args).toEqual([ACCOUNT, RECIPIENT, 42n, 3n, "0x"]);
    expect(built.expects.nfts).toEqual([
      { collection: FIXTURE_COLLECTION, count: 1, direction: "out", amountMax: "3" },
    ]);
    expect(built.intent).toBe(`Transfer 3 of ${FIXTURE_COLLECTION} #42 to ${RECIPIENT}`);
  });

  it("rejects zero transfer amounts", async () => {
    const registry = offlineRegistry();
    await expect(
      registry.action("erc1155", "transfer", ACCOUNT, {
        collection: FIXTURE_COLLECTION,
        tokenId: "42",
        amount: "0",
        to: RECIPIENT,
      }),
    ).rejects.toThrow(/amount/);
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("erc1155 generic protocol (Monad mainnet e2e)", () => {
  // Lumiterra Game Item on Monad mainnet — test data verified independently
  // on 2026-07-14: Monad's official App Hub lists Lumiterra as a first-wave
  // mainnet app (https://app.monad.xyz/), while MonadScan identifies this
  // exact collection/item as ERC-1155 and records its mint + current holder:
  // https://monadscan.com/nft/0x8f28e18039c37cdb4389e6dcb8703966fb9480a8/91801109843487528103748472202153632723215093328
  // On-chain supportsInterface(0xd9b67a26) is true. The balance is checked at
  // runtime; the test holds no keys, signs nothing, and sends nothing.
  const COLLECTION = "0x8f28E18039c37cdB4389E6dcb8703966fb9480A8";
  const TOKEN_ID = "91801109843487528103748472202153632723215093328";
  const HOLDER = "0xEf8BB725e1056317dBafD9B356E63c160e63dCdd";
  const runtime = createRuntime({ rpcUrl: "https://rpc.monad.xyz", chainId: 143 });
  const registry = new Registry(runtime);
  registry.use(ercManifest);

  it("transfers one live multi-token unit with zero warnings", { timeout: 120_000 }, async () => {
    const balance = (await registry.action("erc1155", "balanceOf", HOLDER, {
      collection: COLLECTION,
      tokenId: TOKEN_ID,
      owner: HOLDER,
    })) as QueryResult;
    expect(BigInt((balance.data as { balance: string }).balance)).toBeGreaterThan(0n);

    const transfer = (await registry.action("erc1155", "transfer", HOLDER, {
      collection: COLLECTION,
      tokenId: TOKEN_ID,
      amount: "1",
      to: RECIPIENT,
    })) as Plan;
    const { results } = await createTraceSimulator(runtime).simulate([transfer]);
    expect(results[0]?.reverted).toBe(false);
    expect(results[0]?.warnings).toEqual([]);
    expect(results[0]?.effects.nftsOut).toHaveLength(1);
    expect(results[0]?.effects.nftsOut[0]).toMatchObject({ count: 1, amount: "1" });
    expect(results[0]?.effects.nftsOut[0]?.collection.toLowerCase()).toBe(COLLECTION.toLowerCase());
  });
});
