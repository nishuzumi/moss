/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/morpho.ts purely
 * from the committed abis-src/ files + VENDOR.json metadata. No network, no
 * clock — same inputs, same bytes. This is what makes the provenance chain
 * enforceable: test/abis.test.ts asserts generate() === the committed file,
 * so hand-edits to the generated TS, generator edits without regeneration,
 * and abis-src edits without regeneration all fail the suite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SourceSpec {
  localFile: string;
  upstreamPath: string;
  upstreamName: string;
  exportName: string;
}

/** Full upstream ABIs are exported (ADR 0007) — the adapter's callable surface
 * is reviewed where Capabilities and Receipt parsers live, and simulation is
 * the enforcement layer. Both constants live in the same upstream module. */
export const SOURCES: readonly SourceSpec[] = [
  {
    localFile: "abis.js.txt",
    upstreamPath: "lib/esm/abis.js",
    upstreamName: "vaultV2Abi",
    exportName: "MorphoVaultV2Abi",
  },
  {
    localFile: "abis.js.txt",
    upstreamPath: "lib/esm/abis.js",
    upstreamName: "vaultV2FactoryAbi",
    exportName: "MorphoVaultV2FactoryAbi",
  },
];

export interface VendorInfo {
  name: string;
  version: string;
  tarballSha256: string;
  vendoredAt: string;
  releaseAgeGuardDays: number;
}

/** The upstream module holds many `export const <name>Abi = [...]` literals in
 * one file, so each extraction is bounded by the next `export const` rather
 * than the end of the file. */
function extractAbiLiteral(source: string, spec: SourceSpec): string {
  const marker = `export const ${spec.upstreamName} = `;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`${spec.localFile}: missing ${marker.trim()}`);
  const body = source.slice(start + marker.length);
  const nextExport = body.indexOf("export const ");
  const scope = nextExport < 0 ? body : body.slice(0, nextExport);
  const end = scope.lastIndexOf("];");
  if (end < 0) throw new Error(`${spec.localFile}: missing ABI array terminator`);
  return scope.slice(0, end + 1);
}

export function generate(packageRoot: string): string {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;

  let generated = `// GENERATED FILE - do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source:   ${vendor.name}@${vendor.version} (npm), full upstream ABI constants
//   tarball:  sha256 ${vendor.tarballSha256}
//   vendored: ${vendor.vendoredAt} (release-age guard: ${vendor.releaseAgeGuardDays}d)
//   verification: the fixed factory deployment and exercised functions are
//   checked live on Monad mainnet; the adapter's e2e tests pin observable behavior.
`;

  for (const spec of SOURCES) {
    const source = readFileSync(join(packageRoot, "abis-src", spec.localFile), "utf8");
    const literal = extractAbiLiteral(source, spec);
    generated += `\nexport const ${spec.exportName} = ${literal} as const;\n`;
  }

  return generated;
}
