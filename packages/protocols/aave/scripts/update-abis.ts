/**
 * The NETWORK half of the ABI pipeline: re-vendor upstream files into
 * abis-src/ (verbatim, with provenance metadata in VENDOR.json), then derive
 * src/abis/ via the deterministic generator in ./abis.ts.
 *
 * Version policy: follow upstream's **dist-tags.latest** with a release-age
 * guard — never highest-semver, which both picks up abandoned version lines
 * and is the exact shape of a version-squatting attack. If latest is younger
 * than the guard window, walk back BY PUBLISH TIME (same semantics as pnpm's
 * minimumReleaseAge).
 *
 * The published modules import a shared chunk whose filename carries a content
 * hash, so the specifiers are read out of the vendored files rather than
 * guessed, and the chunk is copied to the path they point at.
 *
 * Usage: pnpm update:abis [exact-version]   (the optional pin reproduces a
 * past state in review and deliberately bypasses the age guard)
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, VENDORED_FILES, type VendorInfo } from "./abis.js";

const PACKAGE_NAME = "@aave-dao/aave-address-book";
const MIN_RELEASE_AGE_DAYS = 7;

interface RegistryDoc {
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<string, { dist: { tarball: string } }>;
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dayMs = 24 * 60 * 60 * 1000;

const registry = (await (
  await fetch(`https://registry.npmjs.org/${PACKAGE_NAME.replace("/", "%2F")}`)
).json()) as RegistryDoc;

const publishedAt = (v: string) => Date.parse(registry.time[v] ?? "");
const ageDays = (v: string) => Math.floor((Date.now() - publishedAt(v)) / dayMs);

const pinned = process.argv[2];
let picked: string;
if (pinned) {
  if (!registry.versions[pinned]) throw new Error(`${PACKAGE_NAME}@${pinned} does not exist`);
  picked = pinned;
  console.log(`pinned to ${picked} by argument — age guard bypassed deliberately`);
} else {
  const latest = registry["dist-tags"].latest;
  if (!latest) throw new Error(`${PACKAGE_NAME} has no dist-tags.latest`);
  const cutoff = Date.now() - MIN_RELEASE_AGE_DAYS * dayMs;
  if (publishedAt(latest) <= cutoff) {
    picked = latest;
    console.log(`picked ${PACKAGE_NAME}@${picked} (dist-tags.latest, ${ageDays(picked)}d old)`);
  } else {
    const fallback = Object.keys(registry.versions)
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v)) // stable releases only
      .filter((v) => publishedAt(v) <= cutoff && publishedAt(v) < publishedAt(latest))
      .sort((a, b) => publishedAt(b) - publishedAt(a))[0];
    if (!fallback) {
      throw new Error(`no ${PACKAGE_NAME} release is at least ${MIN_RELEASE_AGE_DAYS} days old`);
    }
    picked = fallback;
    console.log(
      `picked ${PACKAGE_NAME}@${picked} (${ageDays(picked)}d old); latest ${latest} is only ` +
        `${ageDays(latest)}d old — inside the ${MIN_RELEASE_AGE_DAYS}d release-age guard`,
    );
  }
}

// --- download, digest, extract ---
const work = mkdtempSync(join(tmpdir(), "aave-abis-"));
const tarballUrl = registry.versions[picked]?.dist.tarball;
if (!tarballUrl) throw new Error(`no tarball URL for ${PACKAGE_NAME}@${picked}`);
const bytes = Buffer.from(await (await fetch(tarballUrl)).arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");
const tarball = join(work, "address-book.tgz");
writeFileSync(tarball, bytes);
execSync(`tar -xzf "${tarball}" -C "${work}"`);

// --- vendor verbatim, following every reference the copied files make ---
// The published modules point at a shared chunk whose filename carries a
// content hash, and at their own source maps. Both specifiers are read out of
// the bytes rather than guessed, so what lands in abis-src/ is exactly the
// published tree and nothing dangles.
const REFERENCE = /^\s*(?:import\s+["'](\.[^"']+)["'];?|\/\/# sourceMappingURL=(\S+))\s*$/gm;

/**
 * Upstream publishes everything under `dist/`, which this repository ignores at
 * any depth, so a vendored copy keeping that segment could never be committed.
 * The walk therefore runs in upstream space and the tree is re-rooted one level
 * up on the way out. Re-rooting the whole tree uniformly leaves every relative
 * specifier resolving exactly as published.
 */
const UPSTREAM_ROOT = "dist";
const stored = (upstream: string): string => relative(UPSTREAM_ROOT, upstream);

const pending: string[] = VENDORED_FILES.map((file) => join(UPSTREAM_ROOT, file));
const copied = new Set<string>();
while (pending.length > 0) {
  const file = pending.shift();
  if (!file || copied.has(file)) continue;
  copied.add(file);
  const raw = readFileSync(join(work, "package", file), "utf8");
  const target = join(packageRoot, "abis-src", stored(file));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, raw); // verbatim
  for (const match of raw.matchAll(REFERENCE)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) continue;
    const resolved = normalize(join(dirname(file), specifier));
    if (relative(UPSTREAM_ROOT, resolved).startsWith("..")) {
      throw new Error(`${file} references outside the published tree: ${specifier}`);
    }
    pending.push(resolved);
  }
}

const vendor: VendorInfo = {
  name: PACKAGE_NAME,
  version: picked,
  tarballSha256: sha256,
  vendoredAt: new Date().toISOString().slice(0, 10),
  releaseAgeGuardDays: MIN_RELEASE_AGE_DAYS,
  // Per-file digests so the upstream bytes stay verifiable offline, not only
  // by whoever can re-download the tarball.
  files: Object.fromEntries(
    [...copied]
      .map(stored)
      .sort()
      .map((file) => [
        file,
        createHash("sha256")
          .update(readFileSync(join(packageRoot, "abis-src", file)))
          .digest("hex"),
      ]),
  ),
};
writeFileSync(join(packageRoot, "abis-src", "VENDOR.json"), `${JSON.stringify(vendor, null, 2)}\n`);

// --- derive the generated TS deterministically from what we just committed ---
for (const [file, contents] of Object.entries(await generate(packageRoot))) {
  writeFileSync(join(packageRoot, file), contents);
}
console.log(
  `vendored ${copied.size} upstream files (tarball sha256 ${sha256.slice(0, 16)}…) → abis-src/ + VENDOR.json + src/abis/`,
);
