/**
 * The NETWORK half of the ABI pipeline: re-vendor upstream files into
 * abis-src/ (verbatim, with provenance metadata in VENDOR.json), then derive
 * src/abis/kuru.ts via the deterministic generator in ./abis.ts.
 *
 * Version policy: follow upstream's **dist-tags.latest** with a release-age
 * guard — never highest-semver, which both picks up abandoned version lines
 * (kuru-sdk ships a stale 1.x from the testnet era) and is the exact shape of
 * a version-squatting attack. If latest is younger than the guard window,
 * walk back BY PUBLISH TIME (same semantics as pnpm's minimumReleaseAge).
 *
 * Usage: pnpm update:abis [exact-version]   (the optional pin reproduces a
 * past state in review and deliberately bypasses the age guard)
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, SOURCES, type VendorInfo } from "./abis.js";

const SDK_NAME = "@kuru-labs/kuru-sdk";
const MIN_RELEASE_AGE_DAYS = 7;

interface RegistryDoc {
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<string, { dist: { tarball: string } }>;
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dayMs = 24 * 60 * 60 * 1000;

const registry = (await (
  await fetch(`https://registry.npmjs.org/${SDK_NAME.replace("/", "%2F")}`)
).json()) as RegistryDoc;

const publishedAt = (v: string) => Date.parse(registry.time[v] ?? "");
const ageDays = (v: string) => Math.floor((Date.now() - publishedAt(v)) / dayMs);

const pinned = process.argv[2];
let picked: string;
if (pinned) {
  if (!registry.versions[pinned]) throw new Error(`${SDK_NAME}@${pinned} does not exist`);
  picked = pinned;
  console.log(`pinned to ${picked} by argument — age guard bypassed deliberately`);
} else {
  const latest = registry["dist-tags"].latest;
  if (!latest) throw new Error(`${SDK_NAME} has no dist-tags.latest`);
  const cutoff = Date.now() - MIN_RELEASE_AGE_DAYS * dayMs;
  if (publishedAt(latest) <= cutoff) {
    picked = latest;
    console.log(`picked ${SDK_NAME}@${picked} (dist-tags.latest, ${ageDays(picked)}d old)`);
  } else {
    const fallback = Object.keys(registry.versions)
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v)) // stable releases only
      .filter((v) => publishedAt(v) <= cutoff && publishedAt(v) < publishedAt(latest))
      .sort((a, b) => publishedAt(b) - publishedAt(a))[0];
    if (!fallback) {
      throw new Error(`no ${SDK_NAME} release is at least ${MIN_RELEASE_AGE_DAYS} days old`);
    }
    picked = fallback;
    console.log(
      `picked ${SDK_NAME}@${picked} (${ageDays(picked)}d old); latest ${latest} is only ` +
        `${ageDays(latest)}d old — inside the ${MIN_RELEASE_AGE_DAYS}d release-age guard`,
    );
  }
}

// --- download, digest, extract ---
const work = mkdtempSync(join(tmpdir(), "kuru-abis-"));
const tarballUrl = registry.versions[picked]?.dist.tarball;
if (!tarballUrl) throw new Error(`no tarball URL for ${SDK_NAME}@${picked}`);
const bytes = Buffer.from(await (await fetch(tarballUrl)).arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");
const tarball = join(work, "sdk.tgz");
writeFileSync(tarball, bytes);
execSync(`tar -xzf "${tarball}" -C "${work}"`);

// --- vendor verbatim + record provenance metadata ---
mkdirSync(join(packageRoot, "abis-src"), { recursive: true });
for (const source of SOURCES) {
  const raw = readFileSync(join(work, "package", "abi", source.file), "utf8");
  writeFileSync(join(packageRoot, "abis-src", source.file), raw); // verbatim
}
const vendor: VendorInfo = {
  name: SDK_NAME,
  version: picked,
  tarballSha256: sha256,
  vendoredAt: new Date().toISOString().slice(0, 10),
  releaseAgeGuardDays: MIN_RELEASE_AGE_DAYS,
};
writeFileSync(join(packageRoot, "abis-src", "VENDOR.json"), `${JSON.stringify(vendor, null, 2)}\n`);

// --- derive the generated TS deterministically from what we just committed ---
writeFileSync(join(packageRoot, "src/abis/kuru.ts"), generate(packageRoot));
console.log(
  `vendored ${SOURCES.length} upstream files (tarball sha256 ${sha256.slice(0, 16)}…) → abis-src/ + VENDOR.json + src/abis/kuru.ts`,
);
