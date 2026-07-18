/**
 * The NETWORK half of the ABI pipeline: re-vendor upstream files into
 * abis-src/ (verbatim, with provenance metadata in VENDOR.json), then derive
 * src/abis/morpho.ts via the deterministic generator in ./abis.ts.
 *
 * Version policy: follow upstream's **dist-tags.latest** with a release-age
 * guard — never highest-semver, which is the exact shape of a
 * version-squatting attack. If latest is younger than the guard window, walk
 * back BY PUBLISH TIME (same semantics as pnpm's minimumReleaseAge).
 *
 * Usage: pnpm update:abis [exact-version]   (the optional pin reproduces a
 * past state in review; pinned releases must still satisfy the age guard)
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, SOURCES, type VendorInfo } from "./abis.js";

const SDK_NAME = "@morpho-org/morpho-ts";
const MIN_RELEASE_AGE_DAYS = 7;

interface RegistryDoc {
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<string, { dist: { tarball: string } }>;
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dayMs = 24 * 60 * 60 * 1_000;
const registryResponse = await fetch(`https://registry.npmjs.org/${SDK_NAME.replace("/", "%2F")}`);
if (!registryResponse.ok) {
  throw new Error(`failed to read npm metadata: HTTP ${registryResponse.status}`);
}
const registry = (await registryResponse.json()) as RegistryDoc;
const publishedAt = (version: string) => Date.parse(registry.time[version] ?? "");
const ageDays = (version: string) => Math.floor((Date.now() - publishedAt(version)) / dayMs);
const cutoff = Date.now() - MIN_RELEASE_AGE_DAYS * dayMs;

const pinned = process.argv[2];
let picked: string;
if (pinned) {
  if (!registry.versions[pinned]) throw new Error(`${SDK_NAME}@${pinned} does not exist`);
  if (!Number.isFinite(publishedAt(pinned))) {
    throw new Error(`${SDK_NAME}@${pinned} has no valid publication timestamp`);
  }
  if (publishedAt(pinned) > cutoff) {
    throw new Error(
      `${SDK_NAME}@${pinned} is only ${ageDays(pinned)}d old; pinned releases must satisfy the ${MIN_RELEASE_AGE_DAYS}d age guard`,
    );
  }
  picked = pinned;
  console.log(`pinned to ${picked} by argument (${ageDays(picked)}d old; age guard satisfied)`);
} else {
  const latest = registry["dist-tags"].latest;
  if (!latest) throw new Error(`${SDK_NAME} has no dist-tags.latest`);
  if (publishedAt(latest) <= cutoff) {
    picked = latest;
    console.log(`picked ${SDK_NAME}@${picked} (dist-tags.latest, ${ageDays(picked)}d old)`);
  } else {
    const fallback = Object.keys(registry.versions)
      .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
      .filter((version) => publishedAt(version) <= cutoff)
      .sort((left, right) => publishedAt(right) - publishedAt(left))[0];
    if (!fallback) throw new Error(`no ${SDK_NAME} release is at least 7 days old`);
    picked = fallback;
    console.log(
      `picked ${SDK_NAME}@${picked} (${ageDays(picked)}d old); latest ${latest} is only ${ageDays(latest)}d old`,
    );
  }
}

const tarballUrl = registry.versions[picked]?.dist.tarball;
if (!tarballUrl) throw new Error(`no tarball URL for ${SDK_NAME}@${picked}`);
const tarballResponse = await fetch(tarballUrl);
if (!tarballResponse.ok) throw new Error(`failed to download SDK: HTTP ${tarballResponse.status}`);
const bytes = Buffer.from(await tarballResponse.arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");
const work = mkdtempSync(join(tmpdir(), "morpho-abis-"));
const tarball = join(work, "sdk.tgz");
writeFileSync(tarball, bytes);
execFileSync("tar", ["-xzf", tarball, "-C", work]);

mkdirSync(join(packageRoot, "abis-src"), { recursive: true });
const vendoredFiles = new Map(SOURCES.map((source) => [source.localFile, source.upstreamPath]));
for (const [localFile, upstreamPath] of vendoredFiles) {
  const raw = readFileSync(join(work, "package", upstreamPath), "utf8");
  writeFileSync(join(packageRoot, "abis-src", localFile), raw);
}
const vendor: VendorInfo = {
  name: SDK_NAME,
  version: picked,
  tarballSha256: sha256,
  vendoredAt: new Date().toISOString().slice(0, 10),
  releaseAgeGuardDays: MIN_RELEASE_AGE_DAYS,
};
writeFileSync(join(packageRoot, "abis-src", "VENDOR.json"), `${JSON.stringify(vendor, null, 2)}\n`);

mkdirSync(join(packageRoot, "src", "abis"), { recursive: true });
writeFileSync(join(packageRoot, "src", "abis", "morpho.ts"), generate(packageRoot));
console.log(
  `vendored ${vendoredFiles.size} upstream file(s) from ${SDK_NAME}@${picked} (tarball sha256 ${sha256.slice(0, 16)}…)`,
);
