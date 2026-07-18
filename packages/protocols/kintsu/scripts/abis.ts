/** Deterministically derives the full typed ABI from the committed upstream artifact. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface VendorInfo {
  name: string;
  version: string;
  tarballSha256: string;
  vendoredAt: string;
  releaseAgeGuardDays: number;
}

interface Artifact {
  abi: readonly unknown[];
}

export const ARTIFACT_PATH = "out/StakedMonad.sol/143_artifact.json";
// Keep the upstream bytes under a non-JSON extension so repository formatters
// cannot rewrite the verbatim artifact (the source file itself is JSON).
export const VENDORED_FILE = "StakedMonad.artifact";

export function generate(packageRoot: string): string {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;
  const raw = readFileSync(join(packageRoot, "abis-src", VENDORED_FILE), "utf8");
  const artifact = JSON.parse(raw) as Artifact;
  if (!Array.isArray(artifact.abi)) throw new Error(`${VENDORED_FILE}: missing full ABI array`);

  return `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source:   ${vendor.name}@${vendor.version} (npm), ${ARTIFACT_PATH}
//   tarball:  sha256 ${vendor.tarballSha256}
//   vendored: ${vendor.vendoredAt} (release-age guard: ${vendor.releaseAgeGuardDays}d)
//   deployment: the upstream 143_deployment.json and Monad protocol registry both name
//   0xA3227C5969757783154C60bF0bC1944180ed81B9; live tests verify proxy bytecode and metadata.

export const StakedMonadAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;
`;
}
