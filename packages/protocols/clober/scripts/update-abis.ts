import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, SOURCES, type VendorInfo } from "./abis.js";

const SDK_NAME = "@clober/v2-sdk";
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

const pinned = process.argv[2];
let picked: string;
if (pinned) {
  if (!registry.versions[pinned]) throw new Error(`${SDK_NAME}@${pinned} does not exist`);
  picked = pinned;
  console.log(`pinned to ${picked} by argument - age guard bypassed deliberately`);
} else {
  const latest = registry["dist-tags"].latest;
  if (!latest) throw new Error(`${SDK_NAME} has no dist-tags.latest`);
  const cutoff = Date.now() - MIN_RELEASE_AGE_DAYS * dayMs;
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
const work = mkdtempSync(join(tmpdir(), "clober-abis-"));
const tarball = join(work, "sdk.tgz");
writeFileSync(tarball, bytes);
execFileSync("tar", ["-xzf", tarball, "-C", work]);

mkdirSync(join(packageRoot, "abis-src"), { recursive: true });
for (const source of SOURCES) {
  const raw = readFileSync(join(work, "package", source.upstreamPath), "utf8");
  writeFileSync(join(packageRoot, "abis-src", source.localFile), raw);
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
writeFileSync(join(packageRoot, "src", "abis", "clober.ts"), generate(packageRoot));
console.log(`vendored ${SOURCES.length} ABI sources from ${SDK_NAME}@${picked}`);
