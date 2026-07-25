/**
 * The NETWORK half of the ABI pipeline: re-vendor upstream files into
 * abis-src/ (verbatim, with provenance metadata in VENDOR.json), then derive
 * src/abis/neverland.ts via the deterministic generator in ./abis.ts.
 *
 * Sources (all recorded in abis-src/VENDOR.json):
 * - npm packages (@aave/core-v3, @aave/periphery-v3): version policy follows
 *   upstream's **dist-tags.latest** with a release-age guard — never
 *   highest-semver, which is the exact shape of a version-squatting attack.
 *   If latest is younger than the guard window, walk back BY PUBLISH TIME
 *   (same semantics as pnpm's minimumReleaseAge).
 * - the pinned Neverland GitHub source is re-fetched at its recorded commit;
 *   moving the pin is a deliberate human edit of VENDOR.json, then re-run.
 *
 * Usage:
 *   pnpm update:abis                          policy-driven refresh
 *   pnpm update:abis --pin @aave/core-v3@1.19.3   exact pin (bypasses the age
 *                                               guard deliberately, for review)
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type GithubSource, generate, type NpmSource, type VendorManifest } from "./abis.js";

interface RegistryDoc {
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<string, { dist: { tarball: string } }>;
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendorPath = join(packageRoot, "abis-src", "VENDOR.json");
const vendor = JSON.parse(readFileSync(vendorPath, "utf8")) as VendorManifest;
const dayMs = 24 * 60 * 60 * 1000;

const pins = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  if (arg === "--pin") continue;
  const at = arg.lastIndexOf("@");
  if (at <= 0) throw new Error(`unrecognized argument: ${arg} (expected name@version)`);
  pins.set(arg.slice(0, at), arg.slice(at + 1));
}

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

async function updateNpmSource(source: NpmSource): Promise<void> {
  const registry = (await (
    await fetch(`https://registry.npmjs.org/${source.name.replace("/", "%2F")}`)
  ).json()) as RegistryDoc;
  const publishedAt = (v: string) => Date.parse(registry.time[v] ?? "");
  const ageDays = (v: string) => Math.floor((Date.now() - publishedAt(v)) / dayMs);

  const pinned = pins.get(source.name);
  let picked: string;
  if (pinned) {
    if (!registry.versions[pinned]) throw new Error(`${source.name}@${pinned} does not exist`);
    picked = pinned;
    console.log(
      `${source.name}: pinned to ${picked} by argument — age guard bypassed deliberately`,
    );
  } else {
    const latest = registry["dist-tags"].latest;
    if (!latest) throw new Error(`${source.name} has no dist-tags.latest`);
    const cutoff = Date.now() - vendor.releaseAgeGuardDays * dayMs;
    if (publishedAt(latest) <= cutoff) {
      picked = latest;
      console.log(`${source.name}: picked ${picked} (dist-tags.latest, ${ageDays(picked)}d old)`);
    } else {
      const fallback = Object.keys(registry.versions)
        .filter((v) => /^\d+\.\d+\.\d+$/.test(v)) // stable releases only
        .filter((v) => publishedAt(v) <= cutoff && publishedAt(v) < publishedAt(latest))
        .sort((a, b) => publishedAt(b) - publishedAt(a))[0];
      if (!fallback) {
        throw new Error(
          `no ${source.name} release is at least ${vendor.releaseAgeGuardDays} days old`,
        );
      }
      picked = fallback;
      console.log(
        `${source.name}: picked ${picked} (${ageDays(picked)}d old); latest ${latest} is only ` +
          `${ageDays(latest)}d old — inside the ${vendor.releaseAgeGuardDays}d release-age guard`,
      );
    }
  }

  const work = mkdtempSync(join(tmpdir(), "neverland-abis-"));
  const tarballUrl = registry.versions[picked]?.dist.tarball;
  if (!tarballUrl) throw new Error(`no tarball URL for ${source.name}@${picked}`);
  const bytes = Buffer.from(await (await fetch(tarballUrl)).arrayBuffer());
  const digest = sha256(bytes);
  const tarball = join(work, "sdk.tgz");
  writeFileSync(tarball, bytes);
  execSync(`tar -xzf "${tarball}" -C "${work}"`);

  mkdirSync(join(packageRoot, "abis-src"), { recursive: true });
  for (const file of source.files) {
    const raw = readFileSync(join(work, "package", file.packagePath), "utf8");
    writeFileSync(join(packageRoot, "abis-src", file.file), raw); // verbatim
  }
  source.version = picked;
  source.tarballSha256 = digest;
}

async function updateGithubSource(source: GithubSource): Promise<void> {
  const url = `https://raw.githubusercontent.com/${source.repo}/${source.commit}/${source.path}`;
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  const digest = sha256(bytes);
  writeFileSync(join(packageRoot, "abis-src", source.file), bytes); // verbatim
  source.fileSha256 = digest;
  console.log(
    `${source.repo}: re-fetched ${source.path} @${source.commit.slice(0, 10)} (${digest.slice(0, 16)}…)`,
  );
}

for (const source of vendor.sources) {
  if (source.kind === "npm") await updateNpmSource(source);
  else await updateGithubSource(source);
}
vendor.vendoredAt = new Date().toISOString().slice(0, 10);
writeFileSync(vendorPath, `${JSON.stringify(vendor, null, 2)}\n`);

// --- derive the generated TS deterministically from what we just committed ---
writeFileSync(join(packageRoot, "src/abis/neverland.ts"), generate(packageRoot));
console.log("vendored upstream files → abis-src/ + VENDOR.json + src/abis/neverland.ts");
