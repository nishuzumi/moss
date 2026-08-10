/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/uniswap.ts
 * purely from the committed abis-src/ files + VENDOR.json metadata. No
 * network, no clock. Same inputs, same bytes. test/abis.test.ts asserts
 * generate() === the committed file, so hand-edits to the generated TS,
 * generator edits without regeneration, and abis-src edits without
 * regeneration all fail the suite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SourceSpec {
  file: string;
  exportName: string;
}

/** Full upstream ABIs are exported (ADR 0007): the adapter's callable surface
 * is reviewed where Capabilities and Receipt parsers live, and simulation is
 * the enforcement layer. */
export const SOURCES: SourceSpec[] = [
  { file: "UniversalRouter.json", exportName: "UniversalRouterAbi" },
  { file: "V4Quoter.json", exportName: "V4QuoterAbi" },
  { file: "PoolManager.json", exportName: "PoolManagerAbi" },
  { file: "IAllowanceTransfer.json", exportName: "Permit2Abi" },
];

export interface VendoredPackage {
  name: string;
  version: string;
  tarballSha256: string;
  /** abis-src filename -> path inside the extracted npm tarball. */
  files: Record<string, string>;
}

export interface VendorInfo {
  vendoredAt: string;
  releaseAgeGuardDays: number;
  packages: VendoredPackage[];
}

interface AbiEntry {
  type: string;
  name?: string;
}

export function generate(packageRoot: string): string {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;

  const sourceLines = vendor.packages
    .map(
      (pkg) =>
        `//   source:   ${pkg.name}@${pkg.version} (npm), tarball sha256 ${pkg.tarballSha256}\n` +
        Object.entries(pkg.files)
          .map(([file, upstream]) => `//     ${file} <- ${upstream} (verbatim)`)
          .join("\n"),
    )
    .join("\n");

  let generated = `// GENERATED FILE. Do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
${sourceLines}
//   vendored: ${vendor.vendoredAt} (release-age guard: ${vendor.releaseAgeGuardDays}d)
//   version policy: pinned to the releases whose artifacts match the DEPLOYED
//   Monad mainnet contracts, not dist-tags.latest. Uniswap's own deployment
//   record lists this Universal Router address separately from the newer
//   "Universal Router 2.1.1" deployment, and the 2.1-only ABI surface
//   (executeSigned, eip712Domain, per-hop slippage errors) is absent from the
//   deployed bytecode while the full 2.0.0 surface is present. The pins move
//   only when the recorded deployment does.
//   verification: abis.json pins each deployed address and its immutable
//   runtime bytecode keccak256; the live test recomputes the hashes via
//   rpc.monad.xyz and asserts every function selector and event topic this
//   adapter uses is present in the deployed bytecode. These deployments are
//   not proxies, so the pinned hashes cannot drift silently.
`;

  for (const source of SOURCES) {
    const raw = readFileSync(join(packageRoot, "abis-src", source.file), "utf8");
    const artifact = JSON.parse(raw) as AbiEntry[] | { abi: AbiEntry[] };
    // Hardhat and foundry artifacts both wrap the ABI in { abi: [...] };
    // tolerate bare ABI arrays too.
    const abi = Array.isArray(artifact) ? artifact : artifact.abi;
    if (!Array.isArray(abi)) {
      throw new Error(`${source.file}: could not locate an ABI array in the upstream file`);
    }
    generated += `\nexport const ${source.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  }

  return generated;
}
