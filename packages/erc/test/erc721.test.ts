import {
  createRuntime,
  DecodeError,
  type MossRuntime,
  type Plan,
  type QueryResult,
  Registry,
} from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ercManifest } from "../src/index.js";

// Checksummed: this address lands in CALLDATA (safeTransferFrom's `from`),
// where viem enforces EIP-55 — a wrong-checksum account fails loudly.
const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = "0x1111111111111111111111111111111111111111";
// The interface layer knows no real chain data — fixture collections only.
const FIXTURE_COLLECTION = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");

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

describe("erc721 generic protocol (offline)", () => {
  it("fills the nft category with a transfer and ownership queries", () => {
    const registry = offlineRegistry();
    const nft = registry.discover({ category: "nft" });
    expect(nft).toHaveLength(5); // erc721: 3; erc1155: 2
    expect(nft).toContainEqual(
      expect.objectContaining({ protocol: "erc721", method: "transfer", verb: "transfer" }),
    );
    const [stub] = registry.load([{ protocol: "erc721", method: "transfer" }]);
    expect(Object.keys(stub?.params ?? {})).toEqual(["collection", "tokenId", "to"]);
  });

  it("builds a safeTransferFrom with the caller as `from` in calldata", async () => {
    const registry = offlineRegistry();
    const built = (await registry.action("erc721", "transfer", ACCOUNT, {
      collection: FIXTURE_COLLECTION,
      tokenId: "42",
      to: RECIPIENT,
    })) as Plan;
    const data = built.txs[0]?.data ?? "0x";
    expect(built.txs[0]?.to).toBe(FIXTURE_COLLECTION);
    expect(data.startsWith("0x42842e0e")).toBe(true); // safeTransferFrom(address,address,uint256)
    // ERC-721 needs the owner in CALLDATA, not just as tx sender (ActionCtx).
    expect(data.toLowerCase()).toContain(ACCOUNT.slice(2).toLowerCase());
    expect(built.expects.nfts).toEqual([
      {
        collection: FIXTURE_COLLECTION,
        count: 1,
        direction: "out",
        items: [{ tokenId: "42" }],
      },
    ]);
    expect(built.intent).toBe(`Transfer ${FIXTURE_COLLECTION} #42 to ${RECIPIENT}`);
  });

  it("rejects fractional and negative token ids loudly", async () => {
    const registry = offlineRegistry();
    for (const tokenId of ["1.5", "-3"]) {
      await expect(
        registry.action("erc721", "transfer", ACCOUNT, {
          collection: FIXTURE_COLLECTION,
          tokenId,
          to: RECIPIENT,
        }),
      ).rejects.toThrow(DecodeError);
    }
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("erc721 generic protocol (Monad mainnet e2e)", () => {
  // Uniswap v4 Positions NFT on Monad mainnet — test data, verified two ways
  // (2026-07-08): (1) Uniswap's official deployments record lists it for
  // chain 143 (Uniswap/docs docs/contracts/v4/deployments.mdx and
  // Uniswap/contracts deployments/143.md); (2) on-chain via rpc.monad.xyz:
  // supportsInterface(0x80ac58cd) = true, name() = "Uniswap v4 Positions
  // NFT", symbol() = "UNI-V4-POSM". Chosen for the e2e because canonical
  // infrastructure with live transfer activity outlasts any PFP collection.
  const POSM = "0x5b7ec4a94ff9bedb700fb82ab09d5846972f4016";
  const runtime = createRuntime({ rpcUrl: "https://rpc.monad.xyz", chainId: 143 });
  const registry = new Registry(runtime);
  registry.use(ercManifest);

  it("transfers a live position NFT from its real owner with zero warnings", {
    timeout: 120_000,
  }, async () => {
    // Whoever owns this token right now becomes the plan's account — the
    // test holds no keys and stays valid as the token changes hands.
    let tokenId = 0n;
    let owner: string | undefined;
    for (const candidate of [1n, 2n, 3n, 5n, 8n]) {
      try {
        const result = (await registry.action("erc721", "ownerOf", ACCOUNT, {
          collection: POSM,
          tokenId: candidate.toString(),
        })) as QueryResult;
        owner = (result.data as { owner: string }).owner;
        tokenId = candidate;
        break;
      } catch {
        // burned/nonexistent id — try the next one
      }
    }
    if (!owner) throw new Error("no live token id found among candidates");

    const plan = (await registry.action("erc721", "transfer", owner as `0x${string}`, {
      collection: POSM,
      tokenId: tokenId.toString(),
      to: RECIPIENT,
    })) as Plan;

    const simulator = createTraceSimulator(runtime);
    const { results } = await simulator.simulate([plan]);
    expect(results[0]?.reverted).toBe(false);
    expect(results[0]?.warnings).toEqual([]);
    expect(results[0]?.effects.nftsOut).toEqual([
      { collection: POSM, count: 1, items: [{ tokenId: tokenId.toString() }] },
    ]);
  });
});
