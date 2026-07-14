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
      {
        collection: FIXTURE_COLLECTION,
        count: 1,
        direction: "out",
        items: [{ tokenId: "42", amountMax: "3" }],
      },
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
  // LootGO Looties Logs on Monad mainnet. The canonical Monad protocol
  // registry records this exact address, and MonadScan identifies item #4 as
  // ERC-1155 with a broad holder set:
  // https://github.com/monad-developers/protocols/blob/main/mainnet/lootgo.jsonc
  // https://monadscan.com/nft/0xd2c7fd8e7ab1527a2cb5a7177d1a29393f416a6d/4
  // On-chain supportsInterface(0xd9b67a26) is true. Candidates are checked at
  // runtime; the test holds no keys, signs nothing, and sends nothing.
  const COLLECTION = "0xD2C7FD8e7Ab1527a2cb5A7177d1A29393F416A6d";
  const TOKEN_ID = "4";
  const HOLDER_CANDIDATES = [
    "0x745098b2c028BA7490452b3A13049a7Fe10b6a87",
    "0xBB78A151673FaC1A0A2162Abc7BEE3a39b3767b5",
    "0xf26de9DD7D737243089648633d62641Ff238d51f",
    "0xd4bF7BF399c752F4fD97b6976035DcA3FD2E012B",
    "0xB350D7cb33dB07E00FF5074461Ab3ac9Aa989926",
    "0x3D8250Ac679dcfd1E90c29E7a64AB5013645E579",
    "0xc498067D0831e6Ae3Ea9f83c958f704521025CD2",
    "0x747c63e713843117Ef99CE689D9F029E3F10da96",
    "0x8b59Ba7533f0F451c58B6EAFfc1860C0B9034810",
    "0x36B55a8C16bEc8CBe1Ec58cB190A8a25F32d2682",
  ] as const;
  const runtime = createRuntime({ rpcUrl: "https://rpc.monad.xyz", chainId: 143 });
  const registry = new Registry(runtime);
  registry.use(ercManifest);

  it("transfers one live multi-token unit with zero warnings", { timeout: 120_000 }, async () => {
    let holder: (typeof HOLDER_CANDIDATES)[number] | undefined;
    for (const candidate of HOLDER_CANDIDATES) {
      const balance = (await registry.action("erc1155", "balanceOf", candidate, {
        collection: COLLECTION,
        tokenId: TOKEN_ID,
        owner: candidate,
      })) as QueryResult;
      if (BigInt((balance.data as { balance: string }).balance) > 0n) {
        holder = candidate;
        break;
      }
    }
    if (!holder) throw new Error("no live ERC-1155 fixture holder has a positive balance");

    const transfer = (await registry.action("erc1155", "transfer", holder, {
      collection: COLLECTION,
      tokenId: TOKEN_ID,
      amount: "1",
      to: RECIPIENT,
    })) as Plan;
    const { results } = await createTraceSimulator(runtime).simulate([transfer]);
    expect(results[0]?.reverted).toBe(false);
    expect(results[0]?.warnings).toEqual([]);
    expect(results[0]?.effects.nftsOut).toHaveLength(1);
    expect(results[0]?.effects.nftsOut[0]).toMatchObject({
      count: 1,
      items: [{ tokenId: TOKEN_ID, amount: "1" }],
    });
    expect(results[0]?.effects.nftsOut[0]?.collection.toLowerCase()).toBe(COLLECTION.toLowerCase());
  });
});
