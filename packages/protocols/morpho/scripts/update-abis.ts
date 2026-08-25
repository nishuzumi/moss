/**
 * The NETWORK half of the ABI pipeline: re-vendor Morpho's published ABI
 * modules into abis-src/ (verbatim, with provenance metadata in VENDOR.json),
 * then derive src/abis/morpho.ts through the deterministic generator.
 *
 * Version policy matches the rest of the repo: follow upstream's
 * dist-tags.latest with a release-age guard, never highest-semver, which both
 * picks up abandoned version lines and is the shape of a version-squatting
 * attack. If latest is younger than the guard window, walk back by publish
 * time (the same semantics as pnpm's minimumReleaseAge).
 *
 * Usage: pnpm update:abis [entry-version]   (the optional pin reproduces a
 * past state in review and deliberately bypasses the age guard)
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { digest, ENTRY_DIR, generate, type VendorInfo, type VendorSource } from "./abis.js";

const ENTRY_PACKAGE = "@morpho-org/blue-sdk-viem";
/** The sibling package the entry module re-exports the vault ABIs from. */
const VAULT_PACKAGE = "@morpho-org/morpho-ts";
const VENDORED_PATH = "lib/esm/abis.js";
const MIN_RELEASE_AGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

interface RegistryDoc {
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<
    string,
    {
      dist: { tarball: string };
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    }
  >;
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "morpho-abis-"));

async function registryDoc(name: string): Promise<RegistryDoc> {
  const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2F")}`);
  if (!response.ok) throw new Error(`${name}: registry returned ${response.status}`);
  return (await response.json()) as RegistryDoc;
}

function pickVersion(name: string, doc: RegistryDoc, pinned?: string): string {
  const publishedAt = (version: string) => Date.parse(doc.time[version] ?? "");
  const ageDays = (version: string) => Math.floor((Date.now() - publishedAt(version)) / DAY_MS);
  if (pinned) {
    if (!doc.versions[pinned]) throw new Error(`${name}@${pinned} does not exist`);
    console.log(
      `${name}: pinned to ${pinned} by argument, so the age guard is bypassed deliberately`,
    );
    return pinned;
  }
  const latest = doc["dist-tags"].latest;
  if (!latest) throw new Error(`${name} has no dist-tags.latest`);
  const cutoff = Date.now() - MIN_RELEASE_AGE_DAYS * DAY_MS;
  if (publishedAt(latest) <= cutoff) {
    console.log(`${name}: picked ${latest} (dist-tags.latest, ${ageDays(latest)}d old)`);
    return latest;
  }
  const fallback = Object.keys(doc.versions)
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
    .filter(
      (version) => publishedAt(version) <= cutoff && publishedAt(version) < publishedAt(latest),
    )
    .sort((a, b) => publishedAt(b) - publishedAt(a))[0];
  if (!fallback) throw new Error(`no ${name} release is at least ${MIN_RELEASE_AGE_DAYS} days old`);
  console.log(
    `${name}: picked ${fallback} (${ageDays(fallback)}d old); latest ${latest} is only ` +
      `${ageDays(latest)}d old, inside the ${MIN_RELEASE_AGE_DAYS}d release-age guard`,
  );
  return fallback;
}

/**
 * Resolve a caret or tilde range the way an install would: the newest
 * published version inside the range that also clears the release-age guard.
 */
function resolveCaret(name: string, doc: RegistryDoc, range: string): string {
  const floor = range.replace(/^[\^~]/, "");
  const parts = floor.split(".").map(Number);
  const [major, minor, patch] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  const cutoff = Date.now() - MIN_RELEASE_AGE_DAYS * DAY_MS;
  const publishedAt = (version: string) => Date.parse(doc.time[version] ?? "");
  const inRange = (version: string) => {
    const candidate = version.split(".").map(Number);
    const [cMajor, cMinor, cPatch] = [candidate[0] ?? 0, candidate[1] ?? 0, candidate[2] ?? 0];
    if (cMajor !== major) return false;
    if (range.startsWith("~") && cMinor !== minor) return false;
    if (cMinor !== minor) return cMinor > minor;
    return cPatch >= patch;
  };
  const picked = Object.keys(doc.versions)
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
    .filter(inRange)
    .filter((version) => publishedAt(version) <= cutoff)
    .sort((a, b) => publishedAt(b) - publishedAt(a))[0];
  if (!picked) {
    throw new Error(`no ${name} release satisfies ${range} and the ${MIN_RELEASE_AGE_DAYS}d guard`);
  }
  return picked;
}

async function vendor(
  name: string,
  doc: RegistryDoc,
  version: string,
  dir: string,
): Promise<VendorSource> {
  const tarballUrl = doc.versions[version]?.dist.tarball;
  if (!tarballUrl) throw new Error(`no tarball URL for ${name}@${version}`);
  const bytes = Buffer.from(await (await fetch(tarballUrl)).arrayBuffer());
  const tarballSha256 = createHash("sha256").update(bytes).digest("hex");
  const extracted = join(work, dir);
  mkdirSync(extracted, { recursive: true });
  const tarball = join(work, `${dir}.tgz`);
  writeFileSync(tarball, bytes);
  execSync(`tar -xzf "${tarball}" -C "${extracted}"`);
  const target = join(packageRoot, "abis-src", dir);
  mkdirSync(target, { recursive: true });
  // Copied as bytes, never as decoded text: ADR 0007 asks for the published
  // file verbatim, so a reviewer can digest the committed copy against the
  // tarball. Decoding to a string and writing it back would let an encoding or
  // newline round trip change the bytes while the copy still looked verbatim.
  const published = readFileSync(join(extracted, "package", VENDORED_PATH));
  writeFileSync(join(target, "abis.js"), published);
  return { name, version, tarballSha256, fileSha256: digest(published), path: VENDORED_PATH, dir };
}

try {
  const entryDoc = await registryDoc(ENTRY_PACKAGE);
  const entryVersion = pickVersion(ENTRY_PACKAGE, entryDoc, process.argv[2]);

  // The vault ABIs are re-exported, so the sibling version is chosen by the
  // range this release of the entry package declares, not by its own latest.
  const manifest = entryDoc.versions[entryVersion];
  const declared =
    manifest?.dependencies?.[VAULT_PACKAGE] ?? manifest?.peerDependencies?.[VAULT_PACKAGE];
  if (!declared) {
    throw new Error(`${ENTRY_PACKAGE}@${entryVersion} does not declare ${VAULT_PACKAGE}`);
  }
  const vaultDoc = await registryDoc(VAULT_PACKAGE);
  const vaultVersion = resolveCaret(VAULT_PACKAGE, vaultDoc, declared);
  console.log(
    `${VAULT_PACKAGE}: resolved ${declared} to ${vaultVersion} for ${ENTRY_PACKAGE}@${entryVersion}`,
  );

  const sources: VendorSource[] = [
    await vendor(ENTRY_PACKAGE, entryDoc, entryVersion, ENTRY_DIR),
    await vendor(VAULT_PACKAGE, vaultDoc, vaultVersion, "morpho-ts"),
  ];
  const info: VendorInfo = {
    sources,
    vendoredAt: new Date().toISOString().slice(0, 10),
    releaseAgeGuardDays: MIN_RELEASE_AGE_DAYS,
  };
  writeFileSync(join(packageRoot, "abis-src", "VENDOR.json"), `${JSON.stringify(info, null, 2)}\n`);
  writeFileSync(join(packageRoot, "src/abis/morpho.ts"), await generate(packageRoot));
  console.log(
    `vendored ${sources.length} upstream modules → abis-src/ + VENDOR.json + src/abis/morpho.ts`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
