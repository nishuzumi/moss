/**
 * Re-vendors complete official artifacts from @pendle/core-v2 and records the
 * npm tarball digest. Version selection follows dist-tags.latest with ADR
 * 0007's seven-day release-age guard, walking backward by publication time.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertRequiredEntries,
  generate,
  SOURCES,
  selectReleaseVersion,
  type VendorInfo,
} from "./abis.js";

const PACKAGE_NAME = "@pendle/core-v2";
const DIST_TAG = "latest";
const MIN_RELEASE_AGE_DAYS = 7;
const DEPLOYMENT_COMMIT = "6cd4773218e57dbda8925d10dfb672a0f594a9db";
const DEPLOYMENT_PATH = "deployments/143-core.json";
const dayMs = 24 * 60 * 60 * 1000;
const releaseCutoff = Date.now() - MIN_RELEASE_AGE_DAYS * dayMs;
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

interface RegistryDoc {
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<
    string,
    {
      dist: {
        tarball: string;
      };
    }
  >;
}

const registryResponse = await fetch(
  `https://registry.npmjs.org/${PACKAGE_NAME.replace("/", "%2F")}`,
);
if (!registryResponse.ok) {
  throw new Error(`npm registry returned ${registryResponse.status} for ${PACKAGE_NAME}`);
}
const registry = (await registryResponse.json()) as RegistryDoc;
const publishedAt = (version: string) => Date.parse(registry.time[version] ?? "");
const stableVersions = Object.keys(registry.versions).filter((version) =>
  /^\d+\.\d+\.\d+$/.test(version),
);

const pinned = process.argv[2];
const picked = selectReleaseVersion(
  {
    distTags: registry["dist-tags"],
    versions: registry.versions,
    stableVersions,
    publishedAt,
  },
  { distTag: DIST_TAG, now: Date.now(), minReleaseAgeDays: MIN_RELEASE_AGE_DAYS, pinned },
);
console.log(
  pinned
    ? `pinned to ${PACKAGE_NAME}@${picked} (satisfies the ${MIN_RELEASE_AGE_DAYS}-day release-age guard)`
    : `picked ${PACKAGE_NAME}@${picked} from dist-tags.${DIST_TAG} history ` +
        `(${MIN_RELEASE_AGE_DAYS}d release-age guard)`,
);

const dist = registry.versions[picked]?.dist;
if (!dist?.tarball) {
  throw new Error(`no tarball URL for ${PACKAGE_NAME}@${picked}`);
}

const work = mkdtempSync(join(tmpdir(), "pendle-abis-"));
try {
  const tarballResponse = await fetch(dist.tarball);
  if (!tarballResponse.ok) {
    throw new Error(`tarball download returned ${tarballResponse.status}`);
  }
  const bytes = Buffer.from(await tarballResponse.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const tarballPath = join(work, "package.tgz");
  writeFileSync(tarballPath, bytes);
  execFileSync("tar", ["-xzf", tarballPath, "-C", work]);

  const upstreamPackage = JSON.parse(
    readFileSync(join(work, "package", "package.json"), "utf8"),
  ) as { name?: string; version?: string };
  if (upstreamPackage.name !== PACKAGE_NAME || upstreamPackage.version !== picked) {
    throw new Error(
      `tarball identity mismatch: ${upstreamPackage.name}@${upstreamPackage.version}`,
    );
  }

  mkdirSync(join(packageRoot, "abis-src"), { recursive: true });
  for (const source of SOURCES) {
    const raw = readFileSync(join(work, "package", source.sourcePath), "utf8");
    const artifact = JSON.parse(raw) as {
      contractName?: string;
      abi?: { type: string; name?: string }[];
    };
    if (artifact.contractName !== source.contractName || !Array.isArray(artifact.abi)) {
      throw new Error(`${source.sourcePath}: expected ${source.contractName} artifact`);
    }
    assertRequiredEntries(source, artifact.abi);
    writeFileSync(join(packageRoot, "abis-src", source.file), raw);
  }

  const pickedPublishedAt = registry.time[picked];
  if (!pickedPublishedAt) {
    throw new Error(`npm metadata has no publication time for ${picked}`);
  }
  const skippedReleases = stableVersions
    .filter((version) => publishedAt(version) > publishedAt(picked))
    .filter((version) => publishedAt(version) > releaseCutoff)
    .sort((a, b) => publishedAt(b) - publishedAt(a))
    .map((version) => {
      const skippedPublishedAt = registry.time[version];
      if (!skippedPublishedAt) {
        throw new Error(`npm metadata has no publication time for ${version}`);
      }
      return {
        version,
        publishedAt: skippedPublishedAt,
        reason: `inside ${MIN_RELEASE_AGE_DAYS}-day release-age guard`,
      };
    });
  const artifacts = SOURCES.map(({ requiredEntries: _, ...source }) => source);
  const vendor: VendorInfo = {
    name: PACKAGE_NAME,
    version: picked,
    distTag: DIST_TAG,
    publishedAt: pickedPublishedAt,
    tarball: dist.tarball,
    tarballSha256: sha256,
    vendoredAt: new Date().toISOString().slice(0, 10),
    releaseAgeGuardDays: MIN_RELEASE_AGE_DAYS,
    skippedReleases,
    deploymentSource: {
      repository: "pendle-finance/pendle-core-v2-public",
      commit: DEPLOYMENT_COMMIT,
      path: DEPLOYMENT_PATH,
      url:
        `https://github.com/pendle-finance/pendle-core-v2-public/blob/` +
        `${DEPLOYMENT_COMMIT}/${DEPLOYMENT_PATH}`,
      chainId: 143,
    },
    artifacts,
  };
  writeFileSync(
    join(packageRoot, "abis-src", "VENDOR.json"),
    `${JSON.stringify(vendor, null, 2)}\n`,
  );

  mkdirSync(join(packageRoot, "src", "abis"), { recursive: true });
  writeFileSync(join(packageRoot, "src", "abis", "pendle.ts"), generate(packageRoot));
  console.log(
    `vendored ${SOURCES.length} artifacts (sha256 ${sha256}) and regenerated Pendle ABIs`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
