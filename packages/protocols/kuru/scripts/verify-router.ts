/** Build/test-only deployment verification. See DEPLOYMENT.md and ADR 0007. */
import { compareDeployedAbi, fetchAbi } from "@themoss/abi-tools";
import { type Address, getAddress, type Hex, keccak256 } from "viem";
import { KuruRouterAbi } from "../src/abis/kuru.js";

export interface RouterVerification {
  proxy: Address;
  implementation: Address;
  verification: string;
  allowedExplorerOnly: string[];
}

/** One reviewed deployment, not a fallback for arbitrary explorer failures. */
export const REVIEWED_ROUTER = {
  proxy: "0xd651346d7c789536ebf06dc72aE3C8502cd695CC",
  implementation: "0xf1635175914acF4Db170395D524323225e1F1a04",
  proxyCodeHash: "0xb3fcfca704395c210e969b841f35fff7483f99721de8d65b219615dd5e03f43b",
  implementationCodeHash: "0xee2c47d70994c70feea9e7ae98ce9810e0f1893f377b7d949f2b6ec6f0cc53dc",
} as const;

/** Caller first pins the observed implementation address and both reads to one block. */
export async function verifyRouter(
  router: RouterVerification,
  code: { proxy: Hex | undefined; implementation: Hex | undefined },
  explorerKey: string | undefined,
): Promise<void> {
  switch (router.verification) {
    case "deployment-evidence":
      if (
        getAddress(router.proxy) !== getAddress(REVIEWED_ROUTER.proxy) ||
        getAddress(router.implementation) !== getAddress(REVIEWED_ROUTER.implementation)
      )
        throw new Error("Deployment evidence is only valid for the reviewed Router addresses");
      if (!code.proxy || keccak256(code.proxy) !== REVIEWED_ROUTER.proxyCodeHash)
        throw new Error("Router proxy runtime changed; re-review deployment evidence");
      if (
        !code.implementation ||
        keccak256(code.implementation) !== REVIEWED_ROUTER.implementationCodeHash
      )
        throw new Error("Router implementation runtime changed; re-review deployment evidence");
      return;
    case "explorer": {
      if (!explorerKey) throw new Error("MONADSCAN_API_KEY is required for explorer verification");
      const explorerAbi = await fetchAbi(router.implementation, explorerKey);
      const issues = compareDeployedAbi(KuruRouterAbi, explorerAbi, {
        allowedActualOnly: router.allowedExplorerOnly,
      });
      if (issues.length) throw new Error(`Router ABI mismatch: ${JSON.stringify(issues)}`);
      return;
    }
    default:
      throw new Error(`Unknown Router verification mode: ${router.verification}`);
  }
}
