/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/kuru.ts purely
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
  { file: "Router.json", exportName: "KuruRouterAbi" },
  { file: "OrderBook.json", exportName: "KuruOrderbookAbi" },
];

export interface VendorInfo {
  name: string;
  version: string;
  tarballSha256: string;
  vendoredAt: string;
  releaseAgeGuardDays: number;
}

interface AbiEntry {
  type: string;
  name?: string;
}

export function generate(packageRoot: string): string {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;

  let generated = `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source:   ${vendor.name}@${vendor.version} (npm), abi/*.json — verbatim copies in ../../abis-src/
//   tarball:  sha256 ${vendor.tarballSha256}
//   vendored: ${vendor.vendoredAt} (release-age guard: ${vendor.releaseAgeGuardDays}d)
//   verification: functions exercised live on Monad mainnet via rpc.monad.xyz;
//   the adapter's e2e tests pin observable behavior. abis.json explicitly selects
//   exact-deployment evidence for the reviewed unverified Router: proxy and
//   implementation code hashes plus required selectors/topics. Explorer mode
//   requires full verified ABI comparison; failures never select evidence mode.
//   Run \`pnpm test:abi:online\`; see DEPLOYMENT.md for the proof and limits.
//   caveat: upgradeable ERC-1967 deployments; code/surface checks and live tests
//   do not prove full ABI equivalence. Both trading ABIs retain vendored provenance.
`;

  for (const source of SOURCES) {
    const raw = readFileSync(join(packageRoot, "abis-src", source.file), "utf8");
    const artifact = JSON.parse(raw) as AbiEntry[] | { abi: AbiEntry[] };
    // The SDK ships hardhat artifacts ({ contractName, abi, bytecode, … });
    // tolerate bare ABI arrays too.
    const abi = Array.isArray(artifact) ? artifact : artifact.abi;
    if (!Array.isArray(abi)) {
      throw new Error(`${source.file}: could not locate an ABI array in the upstream file`);
    }
    generated += `\nexport const ${source.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  }

  return generated;
}

/** Keep the complete upstream orderBookAbi, not a hand-transcribed state getter. */
export function generateState(packageRoot: string): string {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src/ts-sdk/VENDOR.json"), "utf8"),
  ) as { commit: string; file: string };
  const raw = readFileSync(join(packageRoot, "abis-src/ts-sdk", vendor.file), "utf8");
  const start = raw.indexOf("export const orderBookAbi = ");
  const end = raw.indexOf("\nexport const ", start + 1);
  if (start < 0 || end < 0) throw new Error("upstream orderBookAbi export not found");
  const fullExport = raw.slice(start, end).trim().replace("orderBookAbi", "KuruStateOrderbookAbi");
  return `// GENERATED FILE — do not edit by hand.
// ABI origin: vendored (ADR 0007). Full orderBookAbi from Kuru-Labs/ts-sdk
// commit ${vendor.commit}; see abis-src/ts-sdk/VENDOR.json.
// Only marketState is used; the newer trading interface is NOT used by this adapter.
import type { Abi } from "viem";

${fullExport}
`;
}
