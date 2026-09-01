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
//   the adapter's e2e tests pin observable behavior. The Router ABI is also
//   cross-checked against the explorer-verified implementation by
//   \`pnpm test:abi:online\` (abis.json records the expected addresses).
//   caveat:   Kuru contracts are upgradeable proxies (ERC-1967). The OrderBook
//   ABI is vendored-only: this SDK version matches neither of the two deployed
//   implementations checked on 2026-07-20 — see test-online/abi-explorer.test.ts
//   for the required-surface verification record and the upgrade tripwire.
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
