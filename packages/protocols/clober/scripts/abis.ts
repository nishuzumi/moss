import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SourceSpec {
  localFile: string;
  upstreamPath: string;
  upstreamName: string;
  exportName: string;
}

export const SOURCES: readonly SourceSpec[] = [
  {
    localFile: "controller-abi.js.txt",
    upstreamPath: "dist/esm/constants/abis/core/controller-abi.js",
    upstreamName: "CONTROLLER_ABI",
    exportName: "CloberControllerAbi",
  },
  {
    localFile: "book-manager-abi.js.txt",
    upstreamPath: "dist/esm/constants/abis/core/book-manager-abi.js",
    upstreamName: "BOOK_MANAGER_ABI",
    exportName: "CloberBookManagerAbi",
  },
  {
    localFile: "book-viewer-abi.js.txt",
    upstreamPath: "dist/esm/constants/abis/core/book-viewer-abi.js",
    upstreamName: "BOOK_VIEWER_ABI",
    exportName: "CloberBookViewerAbi",
  },
];

export interface VendorInfo {
  name: string;
  version: string;
  tarballSha256: string;
  vendoredAt: string;
  releaseAgeGuardDays: number;
}

function extractAbiLiteral(source: string, spec: SourceSpec): string {
  const marker = `export const ${spec.upstreamName} = `;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`${spec.localFile}: missing ${marker.trim()}`);
  const body = source.slice(start + marker.length);
  const end = body.lastIndexOf("];");
  if (end < 0) throw new Error(`${spec.localFile}: missing ABI array terminator`);
  return body.slice(0, end + 1);
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
//   verification: fixed deployments and exercised functions are checked live on Monad mainnet.
`;

  for (const spec of SOURCES) {
    const source = readFileSync(join(packageRoot, "abis-src", spec.localFile), "utf8");
    const literal = extractAbiLiteral(source, spec);
    generated += `\nexport const ${spec.exportName} = ${literal} as const;\n`;
  }

  return generated;
}
