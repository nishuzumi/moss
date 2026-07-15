/**
 * Build and simulate a simple ERC-721 public mint Plan with the NFT mint
 * adapter.
 *
 * The collection is user supplied, so use a verified live Monad contract that
 * supports `mint(address,string) payable` and `mintPrice()`.
 *
 * Run:
 *   MOSS_COLLECTION=0x... MOSS_TOKEN_URI=ipfs://... pnpm --filter @themoss/example-simple-nft-mint mint:testnet
 */
import { type Address, type MossRuntime, type Plan, Registry } from "@themoss/core";
import { nftMintManifest } from "@themoss/protocol-nft-mint";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime } from "@themoss/system";

export interface SimpleMintInput {
  account: Address;
  collection: Address;
  tokenUri: string;
}

export function createMintRegistry(runtime: MossRuntime): Registry {
  const registry = new Registry(runtime);
  registry.use(nftMintManifest);
  return registry;
}

export async function buildMintPlan(runtime: MossRuntime, input: SimpleMintInput): Promise<Plan> {
  const registry = createMintRegistry(runtime);
  return (await registry.action("public-mint-721", "mint", input.account, {
    collection: input.collection,
    tokenUri: input.tokenUri,
  })) as Plan;
}

async function main() {
  const account = (process.env.MOSS_ACCOUNT ??
    "0xcccccccccccccccccccccccccccccccccccccccc") as Address;
  const collection = process.env.MOSS_COLLECTION as Address | undefined;
  const tokenUri = process.env.MOSS_TOKEN_URI ?? "ipfs://example-token";

  if (!collection) {
    throw new Error(
      "set MOSS_COLLECTION to an ERC-721 contract that supports mint(address,string)",
    );
  }

  const runtime = monadRuntime({ rpcUrl: process.env.MOSS_RPC_URL });
  const registry = createMintRegistry(runtime);
  const simulator = createTraceSimulator(runtime);

  const found = registry.discover({ category: "nft", verb: "mint" });
  console.log("1. discover(category: nft, verb: mint) →", found);

  const [stub] = registry.load([{ protocol: "public-mint-721", method: "mint" }]);
  console.log("\n2. load(public-mint-721.mint) →", stub);

  const price = await registry.action("public-mint-721", "mintPrice", account, { collection });
  console.log("\n3. mintPrice →", price);

  const plan = (await registry.action("public-mint-721", "mint", account, {
    collection,
    tokenUri,
  })) as Plan;

  console.log("\n4. action → Plan");
  console.log("   intent:  ", plan.intent);
  console.log("   risk:    ", plan.declaredRisk.join(", "));
  console.log("   expects: ", JSON.stringify(plan.expects));
  console.log("   txs:     ", plan.txs);

  const { results } = await simulator.simulate([plan]);
  const [result] = results;
  console.log("\n5. simulate →");
  console.log("   reverted:", result?.reverted);
  console.log("   effects: ", JSON.stringify(result?.effects, null, 2));
  console.log("   warnings:", result?.warnings);

  if (result && result.warnings.length === 0) {
    console.log("\n✓ No warnings — verify the NFT receipt, then hand the unsigned tx to a wallet.");
  } else {
    console.log("\n✗ Warnings present — STOP. Never hand this tx to a signer.");
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("simple-mint.mts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
