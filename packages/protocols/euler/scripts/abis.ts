/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/euler.ts purely
 * from the committed abis-src/ files + VENDOR.json metadata. No network, no
 * clock — same inputs, same bytes. This is what makes the provenance chain
 * enforceable: test/abis.test.ts asserts generate() === the committed file,
 * so hand-edits to the generated TS, generator edits without regeneration,
 * and abis-src edits without regeneration all fail the suite.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** `file` is the upstream path at the pinned commit; the same relative layout
 * is committed verbatim under abis-src/ (ADR 0007, Git-sourced vendored ABIs). */
export interface SourceSpec {
  file: string;
  exportName: string;
}

/** Full upstream ABIs are exported (ADR 0007) — the adapter's callable surface
 * is reviewed where Capabilities and Receipt parsers live, and simulation is
 * the enforcement layer. */
export const SOURCES: SourceSpec[] = [
  { file: "abis/EVault.json", exportName: "EVaultAbi" },
  { file: "abis/EthereumVaultConnector.json", exportName: "EthereumVaultConnectorAbi" },
  { file: "abis/GenericFactory.json", exportName: "GenericFactoryAbi" },
  { file: "abis/BasePerspective.json", exportName: "BasePerspectiveAbi" },
];

export interface VendoredFile {
  file: string;
  fileSha256: string;
}

export interface VendorInfo {
  sourceKind: "git";
  repository: string;
  commit: string;
  committedAt: string;
  vendoredAt: string;
  commitAgeGuardDays: number;
  files: VendoredFile[];
}

interface AbiEntry {
  type: string;
  name?: string;
}

export function readVendorInfo(packageRoot: string): VendorInfo {
  return JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;
}

export function sha256(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

export function generate(packageRoot: string): string {
  const vendor = readVendorInfo(packageRoot);
  const recordedDigest = (file: string) => {
    const entry = vendor.files.find(({ file: candidate }) => candidate === file);
    if (!entry) throw new Error(`${file}: no sha256 recorded in VENDOR.json`);
    return entry.fileSha256;
  };

  let generated = `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007, sourceKind: git)
//   source:   ${vendor.repository}
//             abis/*.json at commit ${vendor.commit} (${vendor.committedAt}),
//             committed verbatim under ../../abis-src/ at their original
//             paths, with per-file fileSha256 in VENDOR.json
//   vendored: ${vendor.vendoredAt} (commit-age guard: ${vendor.commitAgeGuardDays}d)
//   why this source: euler-interfaces is Euler's canonical published record of
//   deployed addresses and ABIs, and it is the same artifact the addresses in
//   ../addresses.ts are read from — one pinned commit backs both.
//   verification: every fixed address is bytecode-checked on Monad mainnet and
//   the EVault ABI is cross-checked against the explorer-verified EVault
//   implementation by \`pnpm test:abi:online\` (abis.json records the expected
//   addresses, so a factory upgrade turns the check red).
//   caveat:   EVault instances are GenericFactory proxies delegating to one
//   shared implementation, and that implementation is itself modular — the
//   published EVault ABI is the union of its module surfaces, which is why the
//   cross-check targets the implementation rather than any vault proxy.
`;

  for (const source of SOURCES) {
    const raw = readFileSync(join(packageRoot, "abis-src", source.file), "utf8");
    const digest = sha256(raw);
    const recorded = recordedDigest(source.file);
    if (recorded !== digest) {
      throw new Error(`${source.file}: sha256 ${digest} does not match VENDOR.json (${recorded})`);
    }
    const artifact = JSON.parse(raw) as AbiEntry[] | { abi: AbiEntry[] };
    // euler-interfaces ships bare ABI arrays; tolerate artifact wrappers too.
    const abi = Array.isArray(artifact) ? artifact : artifact.abi;
    if (!Array.isArray(abi)) {
      throw new Error(`${source.file}: could not locate an ABI array in the upstream file`);
    }
    generated += `\nexport const ${source.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  }

  return generated;
}
