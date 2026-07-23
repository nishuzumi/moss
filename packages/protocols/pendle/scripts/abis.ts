import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SourceSpec {
  file: string;
  sourcePath: string;
  exportName: string;
  contractName: string;
  role: string;
  requiredEntries: readonly { type: "function" | "event"; name: string }[];
}

export const SOURCES: readonly SourceSpec[] = [
  {
    file: "IPMarketFactory.json",
    sourcePath: "build/artifacts/contracts/interfaces/IPMarketFactory.sol/IPMarketFactory.json",
    exportName: "PendleMarketFactoryAbi",
    contractName: "IPMarketFactory",
    role: "marketFactoryV6 validation interface",
    requiredEntries: [{ type: "function", name: "isValidMarket" }],
  },
  {
    file: "IPMarket.json",
    sourcePath: "build/artifacts/contracts/interfaces/IPMarket.sol/IPMarket.json",
    exportName: "PendleMarketAbi",
    contractName: "IPMarket",
    role: "dynamically discovered Market reads and events",
    requiredEntries: [
      { type: "function", name: "readTokens" },
      { type: "function", name: "expiry" },
      { type: "function", name: "factory" },
      { type: "event", name: "Swap" },
    ],
  },
  {
    file: "IStandardizedYield.json",
    sourcePath:
      "build/artifacts/contracts/interfaces/IStandardizedYield.sol/IStandardizedYield.json",
    exportName: "PendleStandardizedYieldAbi",
    contractName: "IStandardizedYield",
    role: "dynamically discovered SY token support and events",
    requiredEntries: [
      { type: "function", name: "getTokensIn" },
      { type: "function", name: "getTokensOut" },
      { type: "event", name: "Deposit" },
      { type: "event", name: "Redeem" },
    ],
  },
  {
    // Router V4 delegates the V3 action facets named by the deployment manifest, so its official aggregate remains IPAllActionV3.
    file: "IPAllActionV3.json",
    sourcePath: "build/artifacts/contracts/interfaces/IPAllActionV3.sol/IPAllActionV3.json",
    exportName: "PendleRouterAbi",
    contractName: "IPAllActionV3",
    role: "PendleRouterV4 selector-proxy composite interface",
    requiredEntries: [
      { type: "function", name: "swapExactTokenForPt" },
      { type: "function", name: "swapExactPtForToken" },
      { type: "event", name: "SwapPtAndToken" },
    ],
  },
  {
    file: "IPRouterStatic.json",
    sourcePath: "build/artifacts/contracts/interfaces/IPRouterStatic.sol/IPRouterStatic.json",
    exportName: "PendleRouterStaticAbi",
    contractName: "IPRouterStatic",
    role: "PendleRouterStatic selector-proxy quote interface",
    requiredEntries: [
      { type: "function", name: "swapExactTokenForPtStatic" },
      { type: "function", name: "swapExactPtForTokenStatic" },
      { type: "function", name: "getDefaultApproxParams" },
      { type: "function", name: "swapExactTokenForPtStaticAndGenerateApproxParams" },
    ],
  },
  {
    // The YT emits NewInterestIndex inside a PT swap trace; the exhaustive Receipt parser needs it.
    file: "IPYieldToken.json",
    sourcePath: "build/artifacts/contracts/interfaces/IPYieldToken.sol/IPYieldToken.json",
    exportName: "PendleYieldTokenAbi",
    contractName: "IPYieldToken",
    role: "dynamically discovered YT swap-trace event evidence",
    requiredEntries: [{ type: "event", name: "NewInterestIndex" }],
  },
] as const;

export interface VendorInfo {
  name: string;
  version: string;
  distTag: string;
  publishedAt: string;
  tarball: string;
  tarballSha256: string;
  vendoredAt: string;
  releaseAgeGuardDays: number;
  skippedReleases: readonly {
    version: string;
    publishedAt: string;
    reason: string;
  }[];
  deploymentSource: {
    repository: string;
    commit: string;
    path: string;
    url: string;
    chainId: number;
  };
  artifacts: readonly Omit<SourceSpec, "requiredEntries">[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Registry facts needed to pick a vendorable release, independent of transport and file I/O. */
export interface ReleaseCandidateSource {
  distTags: Record<string, string>;
  versions: Record<string, unknown>;
  stableVersions: readonly string[];
  /** Publication time in epoch milliseconds; NaN when the registry records none. */
  publishedAt: (version: string) => number;
}

export interface ReleaseSelectionOptions {
  distTag: string;
  now: number;
  minReleaseAgeDays: number;
  pinned?: string;
}

/**
 * Picks the @pendle/core-v2 version to vendor under ADR 0007's release-age guard. A pinned version
 * is honored only when it exists, is on the stable `x.y.z` line, and is at least `minReleaseAgeDays`
 * old — the same universe and freshness rule the automatic dist-tag walk enforces, so pinning
 * selects a specific vetted release without bypassing the guard or reaching a prerelease. Without a
 * pin, it takes dist-tag latest when old enough, otherwise the newest stable release that predates
 * latest and clears the guard.
 */
export function selectReleaseVersion(
  source: ReleaseCandidateSource,
  options: ReleaseSelectionOptions,
): string {
  const releaseCutoff = options.now - options.minReleaseAgeDays * DAY_MS;
  const ageDays = (version: string) =>
    Math.floor((options.now - source.publishedAt(version)) / DAY_MS);
  const clearsGuard = (version: string) => {
    const at = source.publishedAt(version);
    return Number.isFinite(at) && at <= releaseCutoff;
  };

  if (options.pinned !== undefined) {
    const pinned = options.pinned;
    if (!source.versions[pinned]) {
      throw new Error(`@pendle/core-v2@${pinned} does not exist`);
    }
    if (!source.stableVersions.includes(pinned)) {
      throw new Error(`pinned ${pinned} is not a stable x.y.z release`);
    }
    if (!Number.isFinite(source.publishedAt(pinned))) {
      throw new Error(`npm metadata has no publication time for ${pinned}`);
    }
    if (!clearsGuard(pinned)) {
      throw new Error(
        `pinned ${pinned} is ${ageDays(pinned)}d old, younger than the ${options.minReleaseAgeDays}-day release-age guard`,
      );
    }
    return pinned;
  }

  const latest = source.distTags[options.distTag];
  if (!latest) {
    throw new Error(`@pendle/core-v2 has no dist-tags.${options.distTag}`);
  }
  if (clearsGuard(latest)) {
    return latest;
  }
  const fallback = source.stableVersions
    .filter(clearsGuard)
    .filter((version) => source.publishedAt(version) < source.publishedAt(latest))
    .sort((a, b) => source.publishedAt(b) - source.publishedAt(a))[0];
  if (!fallback) {
    throw new Error(
      `no @pendle/core-v2 stable release is at least ${options.minReleaseAgeDays} days old to satisfy the release-age guard`,
    );
  }
  return fallback;
}

interface AbiEntry {
  type: string;
  name?: string;
}

interface HardhatArtifact {
  contractName?: string;
  abi?: AbiEntry[];
}

export function generate(packageRoot: string): string {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;

  let generated = `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source: ${vendor.name}@${vendor.version} (npm, dist-tags.${vendor.distTag})
//   tarball: sha256 ${vendor.tarballSha256}
//   vendored: ${vendor.vendoredAt} (release-age guard: ${vendor.releaseAgeGuardDays}d)
//   deployment: ${vendor.deploymentSource.url}
//   verification: the immutable manifest identifies chain ${vendor.deploymentSource.chainId},
//   marketFactoryV6, Router V4, and RouterStatic; live tests verify fixed-address bytecode.
//   Dynamic Market and SY addresses are intentionally not fixed in this package.
`;

  for (const source of SOURCES) {
    const recorded = vendor.artifacts.find((artifact) => artifact.file === source.file);
    if (
      !recorded ||
      recorded.sourcePath !== source.sourcePath ||
      recorded.exportName !== source.exportName ||
      recorded.contractName !== source.contractName ||
      recorded.role !== source.role
    ) {
      throw new Error(`${source.file}: VENDOR.json artifact mapping does not match the generator`);
    }

    const artifact = JSON.parse(
      readFileSync(join(packageRoot, "abis-src", source.file), "utf8"),
    ) as HardhatArtifact;
    if (artifact.contractName !== source.contractName || !Array.isArray(artifact.abi)) {
      throw new Error(`${source.file}: expected a ${source.contractName} Hardhat artifact`);
    }
    assertRequiredEntries(source, artifact.abi);
    generated += `//   artifact: ${source.sourcePath}
//   role: ${source.role}
export const ${source.exportName} = ${JSON.stringify(artifact.abi, null, 2)} as const;

`;
  }

  return generated;
}

export function assertRequiredEntries(source: SourceSpec, abi: readonly AbiEntry[]): void {
  for (const required of source.requiredEntries) {
    if (!abi.some((entry) => entry.type === required.type && entry.name === required.name)) {
      throw new Error(`${source.sourcePath}: missing required ${required.type} ${required.name}`);
    }
  }
}
