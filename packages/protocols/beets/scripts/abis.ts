/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/beets.ts purely
 * from the committed abis-src/ files + VENDOR.json metadata. No network, no
 * clock — same inputs, same bytes. This is what makes the provenance chain
 * enforceable: test/abis.test.ts asserts generate() === the committed file,
 * so hand-edits to the generated TS, generator edits without regeneration,
 * and abis-src edits without regeneration all fail the suite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SourceSpec {
  file: string;
  exportName: string;
}

/** Full upstream ABIs are exported (ADR 0007) — the adapter's callable surface
 * is reviewed where Capabilities and Receipt parsers live, and simulation is
 * the enforcement layer. */
export const SOURCES: SourceSpec[] = [
  { file: "Router.json", exportName: "BeetsRouterAbi" },
  { file: "Vault.json", exportName: "BeetsVaultAbi" },
  { file: "VaultExtension.json", exportName: "BeetsVaultExtensionAbi" },
  { file: "VaultExplorer.json", exportName: "BeetsVaultExplorerAbi" },
];

export interface VendorInfo {
  name: string;
  branch: string;
  commit: string;
  fileSha256: Record<string, string>;
  vendoredAt: string;
}

interface AbiEntry {
  type: string;
  name?: string;
}

export function generate(packageRoot: string): string {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;

  const fileDigests = SOURCES.map(
    (source) => `//   ${source.file}: sha256 ${vendor.fileSha256[source.file]}`,
  ).join("\n");

  let generated = `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis [commit|latest]
// ABI origin: vendored (ADR 0007)
//   source:   ${vendor.name}@${vendor.branch} ${vendor.commit} (GitHub) — hardhat artifacts
//             copied verbatim into ../../abis-src/, no hand-edits
${fileDigests}
//   vendored: ${vendor.vendoredAt}
//   verification: swap/add/remove surfaces exercised live on Monad mainnet via
//   rpc.monad.xyz (the adapter's e2e tests pin observable behavior). The Router
//   and Vault ABIs are additionally cross-checked against explorer-verified
//   implementations by \`pnpm test:abi:online\` (see abis.json).
`;

  for (const source of SOURCES) {
    const raw = readFileSync(join(packageRoot, "abis-src", source.file), "utf8");
    const artifact = JSON.parse(raw) as AbiEntry[] | { abi: AbiEntry[] };
    // balancer-deployments ships hardhat artifacts ({ contractName, abi, bytecode, … });
    // tolerate bare ABI arrays too.
    const abi = Array.isArray(artifact) ? artifact : artifact.abi;
    if (!Array.isArray(abi)) {
      throw new Error(`${source.file}: could not locate an ABI array in the upstream file`);
    }
    generated += `\nexport const ${source.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  }

  return generated;
}
