/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/neverland.ts
 * purely from the committed abis-src/ files + VENDOR.json metadata. No
 * network, no clock — same inputs, same bytes. test/abis.test.ts asserts
 * generate() === the committed file, so hand-edits to the generated TS,
 * generator edits without regeneration, and abis-src edits without
 * regeneration all fail the suite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface NpmFileSpec {
  /** Path of the artifact inside the upstream npm tarball. */
  packagePath: string;
  /** Verbatim copy committed under abis-src/. */
  file: string;
  exportName: string;
}

export interface NpmSource {
  kind: "npm";
  name: string;
  version: string;
  tarballSha256: string;
  files: NpmFileSpec[];
}

export interface GithubExportSpec {
  exportName: string;
  /** Event to extract from the committed Solidity source. */
  event: string;
}

export interface GithubSource {
  kind: "github";
  repo: string;
  /** Pinned commit; bumping it is a deliberate human edit of VENDOR.json. */
  commit: string;
  path: string;
  file: string;
  fileSha256: string;
  exports: GithubExportSpec[];
}

export type VendorSource = NpmSource | GithubSource;

export interface VendorManifest {
  vendoredAt: string;
  releaseAgeGuardDays: number;
  sources: VendorSource[];
}

interface AbiEntry {
  type: string;
  name?: string;
  inputs?: unknown[];
  anonymous?: boolean;
  stateMutability?: string;
  outputs?: unknown[];
}

export function generate(packageRoot: string): string {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorManifest;

  let generated = `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
`;

  for (const source of vendor.sources) {
    if (source.kind === "npm") {
      for (const file of source.files) {
        generated += `//   source:   ${source.name}@${source.version} (npm), ${file.packagePath} — verbatim copy in ../../abis-src/${file.file}
//   tarball:  sha256 ${source.tarballSha256}
`;
      }
    } else {
      generated += `//   source:   ${source.repo}@${source.commit.slice(0, 10)} (GitHub), ${source.path} — verbatim copy in ../../abis-src/${source.file}
//   file:     sha256 ${source.fileSha256}
`;
    }
  }

  generated += `//   vendored: ${vendor.vendoredAt} (release-age guard: ${vendor.releaseAgeGuardDays}d)
//   verification: functions exercised live on Monad mainnet via rpc.monad.xyz;
//   the adapter's e2e tests pin observable behavior. The Pool and gateway ABIs
//   are also cross-checked against the explorer-verified contracts by
//   \`pnpm test:abi:online\` (abis.json records the expected addresses).
//   caveat:   Neverland Pool is a transparent proxy (ERC-1967 slot). The Pool
//   ABI vendored here is the upstream Aave V3 IPool interface; Neverland keeps
//   this callable surface (stable-rate and portal entrypoints intentionally
//   revert) and adds PriceObserved emissions on nToken/debt-token actions,
//   extracted here from the pinned PriceEmitter.sol.
`;

  for (const source of vendor.sources) {
    if (source.kind === "npm") {
      for (const file of source.files) {
        const raw = readFileSync(join(packageRoot, "abis-src", file.file), "utf8");
        const artifact = JSON.parse(raw) as AbiEntry[] | { abi: AbiEntry[] };
        // Upstream ships hardhat artifacts ({ contractName, abi, bytecode, … });
        // tolerate bare ABI arrays too.
        const abi = Array.isArray(artifact) ? artifact : artifact.abi;
        if (!Array.isArray(abi)) {
          throw new Error(`${file.file}: could not locate an ABI array in the upstream file`);
        }
        generated += `\nexport const ${file.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
      }
    } else {
      const sol = readFileSync(join(packageRoot, "abis-src", source.file), "utf8");
      for (const exported of source.exports) {
        const entry = extractEventAbi(sol, exported.event, source.file);
        generated += `\nexport const ${exported.exportName} = ${JSON.stringify([entry], null, 2)} as const;\n`;
      }
    }
  }

  return generated;
}

/**
 * Extract one `event Name(...)` definition from committed Solidity source and
 * render it as a canonical ABI entry. Deterministic: the same source bytes
 * always produce the same entry, and a source edit that changes the event
 * breaks the byte-for-byte derivation test until regenerated.
 */
export function extractEventAbi(source: string, eventName: string, file: string): AbiEntry {
  const pattern = new RegExp(`event\\s+${eventName}\\s*\\(([\\s\\S]*?)\\)\\s*;`);
  const match = source.match(pattern);
  if (!match?.[1]) {
    throw new Error(`${file}: event ${eventName} not found in the committed Solidity source`);
  }
  const inputs = match[1]
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean)
    .map((param) => {
      const parts = param.split(/\s+/);
      if (parts.length === 3 && parts[1] === "indexed") {
        return { indexed: true, internalType: parts[0], name: parts[2], type: parts[0] };
      }
      if (parts.length === 2) {
        return { indexed: false, internalType: parts[0], name: parts[1], type: parts[0] };
      }
      throw new Error(`${file}: unsupported ${eventName} parameter "${param}"`);
    });
  return { anonymous: false, inputs, name: eventName, type: "event" };
}
