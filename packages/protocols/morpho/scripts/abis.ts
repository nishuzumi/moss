/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/morpho.ts purely
 * from the committed abis-src/ files + VENDOR.json metadata. No network, no
 * clock, so the same inputs give the same bytes. test/abis.test.ts asserts generate() equals
 * the committed file, so hand-edits to the generated TS, generator edits
 * without regeneration, and abis-src edits without regeneration all fail.
 *
 * Morpho publishes its ABIs as ES modules rather than JSON artifacts, and the
 * module that carries the Morpho Blue and IRM ABIs re-exports the vault ABIs
 * from its sibling package. Both upstream modules are therefore committed
 * verbatim and staged into a throwaway module layout so that bare re-export
 * resolves against the committed copy instead of node_modules.
 */

import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Upstream package whose `lib/esm/abis.js` is committed under abis-src/. */
export interface VendorSource {
  /** npm package name. */
  name: string;
  /** Exact version the committed copy came from. */
  version: string;
  /** sha256 of the npm tarball the copy was extracted from. */
  tarballSha256: string;
  /**
   * sha256 of the vendored file's own bytes, as published inside that tarball.
   * ADR 0007 wants the copy verbatim, and a tarball digest alone cannot show
   * that: it authenticates the archive, not the one file taken out of it. This
   * digest closes that gap offline, so any later reformat or edit of the
   * committed copy fails a test instead of passing review as upstream bytes.
   */
  fileSha256: string;
  /** Path inside the tarball (below `package/`) that was copied verbatim. */
  path: string;
  /** Directory under abis-src/ holding the verbatim copy. */
  dir: string;
}

export interface VendorInfo {
  sources: VendorSource[];
  vendoredAt: string;
  releaseAgeGuardDays: number;
}

export const digest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

/**
 * Every committed abis-src/ file whose bytes no longer match the digest
 * VENDOR.json recorded for it, as `path: actual != recorded` lines. Empty means
 * each copy is still the published file byte for byte.
 */
export function verifyVendored(packageRoot: string): string[] {
  const mismatches: string[] = [];
  for (const source of readVendorInfo(packageRoot).sources) {
    const path = join("abis-src", source.dir, "abis.js");
    const actual = digest(readFileSync(join(packageRoot, path)));
    if (actual !== source.fileSha256) {
      mismatches.push(`${path}: ${actual} != ${source.fileSha256}`);
    }
  }
  return mismatches;
}

export interface AbiExport {
  /** Export name in the upstream module. */
  upstream: string;
  /** Export name emitted into src/abis/morpho.ts. */
  exportName: string;
  /** One-line note recorded above the emitted ABI. */
  note: string;
}

/** The entry module: everything the adapter needs is reachable from it. */
export const ENTRY_DIR = "blue-sdk-viem";

/** Full upstream ABIs are exported (ADR 0007): the callable surface is
 * reviewed where Capabilities and Receipt parsers live, and simulation plus
 * exhaustive Receipt coverage is the enforcement layer. */
export const EXPORTS: AbiExport[] = [
  {
    upstream: "blueAbi",
    exportName: "MorphoBlueAbi",
    note: "Morpho Blue: the market events a vault deposit or withdrawal triggers.",
  },
  {
    upstream: "adaptiveCurveIrmAbi",
    exportName: "AdaptiveCurveIrmAbi",
    note: "Adaptive Curve IRM: BorrowRateUpdate, emitted while a market accrues.",
  },
];

export function readVendorInfo(packageRoot: string): VendorInfo {
  return JSON.parse(readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"));
}

/**
 * Stage the committed modules so the entry module's bare re-export resolves,
 * then import it. Only committed bytes are read; nothing is fetched.
 */
async function loadUpstream(packageRoot: string, vendor: VendorInfo) {
  const abisSrc = join(packageRoot, "abis-src");
  const stage = mkdtempSync(join(tmpdir(), "moss-morpho-abis-"));
  try {
    for (const source of vendor.sources) {
      if (source.dir === ENTRY_DIR) continue;
      const target = join(stage, "node_modules", source.name);
      mkdirSync(target, { recursive: true });
      cpSync(join(abisSrc, source.dir, "abis.js"), join(target, "abis.js"));
      writeFileSync(
        join(target, "package.json"),
        `${JSON.stringify({ name: source.name, type: "module", exports: { "./abis": "./abis.js" } })}\n`,
      );
    }
    const entry = join(stage, "entry.js");
    cpSync(join(abisSrc, ENTRY_DIR, "abis.js"), entry);
    writeFileSync(join(stage, "package.json"), `${JSON.stringify({ type: "module" })}\n`);
    return (await import(pathToFileURL(entry).href)) as Record<string, unknown>;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

export async function generate(packageRoot: string): Promise<string> {
  const vendor = readVendorInfo(packageRoot);
  const mismatches = verifyVendored(packageRoot);
  if (mismatches.length > 0) {
    throw new Error(`vendored abis-src/ does not match VENDOR.json:\n  ${mismatches.join("\n  ")}`);
  }
  const upstream = await loadUpstream(packageRoot, vendor);

  const provenance = vendor.sources
    .map(
      (source) =>
        `//   source:   ${source.name}@${source.version} (npm), ${source.path}\n` +
        `//             verbatim copy in ../../abis-src/${source.dir}/abis.js\n` +
        `//             tarball sha256 ${source.tarballSha256}\n` +
        `//             file sha256    ${source.fileSha256}`,
    )
    .join("\n");

  let generated = `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
${provenance}
//   vendored: ${vendor.vendoredAt} (release-age guard: ${vendor.releaseAgeGuardDays}d)
//   scope:    only the Morpho Blue side. Morpho Blue and the Adaptive Curve IRM
//   are immutable, single-version deployments, so the SDK artifact cannot drift
//   from the deployed code. The MetaMorpho V1.1 vault ABI is NOT taken from this
//   SDK: the SDK still ships the V1.0 vault artifact, which omits an event every
//   V1.1 vault emits, so that one is compiled (see ./metamorpho-v1-1.ts).
//   verification: the addresses these ABIs are used against come from the
//   canonical Monad protocol registry and are bytecode-checked live; the
//   Monad-mainnet test decodes every Morpho Blue and IRM event a real deposit
//   emits through exactly these ABIs. There is no live withdrawal run. That
//   side is covered offline by fixtures encoded from these same ABIs, so it
//   corroborates the parser rather than the deployed signatures.
//   caveat:   the explorer cross-check (pnpm test:abi:online) needs a
//   MONADSCAN_API_KEY and a verified source page; neither was available when
//   this package landed, so the tarball digest plus the live decode are the
//   provenance record.
`;

  for (const entry of EXPORTS) {
    const abi = upstream[entry.upstream];
    if (!Array.isArray(abi)) {
      throw new Error(`${entry.upstream}: upstream module does not export an ABI array`);
    }
    generated += `\n// ${entry.note}\nexport const ${entry.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  }

  return generated;
}
