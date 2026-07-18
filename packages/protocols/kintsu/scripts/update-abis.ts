/** Re-vendor the stable official Kintsu artifact, then regenerate the typed ABI. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ARTIFACT_PATH, generate, VENDORED_FILE, type VendorInfo } from "./abis.js";

const PACKAGE_NAME = "@water-cooler-studios/monad-contracts-core";
const MIN_RELEASE_AGE_DAYS = 7;
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dayMs = 24 * 60 * 60 * 1000;

interface RegistryDoc {
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<string, { dist: { tarball: string } }>;
}

const registry = (await (
  await fetch(`https://registry.npmjs.org/${PACKAGE_NAME.replace("/", "%2F")}`)
).json()) as RegistryDoc;
const publishedAt = (version: string) => Date.parse(registry.time[version] ?? "");
const cutoff = Date.now() - MIN_RELEASE_AGE_DAYS * dayMs;
const pinned = process.argv[2];
const picked =
  pinned ??
  Object.keys(registry.versions)
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
    .filter((version) => publishedAt(version) <= cutoff)
    .sort((a, b) => publishedAt(b) - publishedAt(a))[0];
if (!picked || !registry.versions[picked]) {
  throw new Error(`no stable ${PACKAGE_NAME} release satisfies the age guard`);
}

const tarballUrl = registry.versions[picked]?.dist.tarball;
if (!tarballUrl) throw new Error(`no tarball URL for ${PACKAGE_NAME}@${picked}`);
const bytes = Buffer.from(await (await fetch(tarballUrl)).arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");
const work = mkdtempSync(join(tmpdir(), "kintsu-abis-"));
const tarball = join(work, "package.tgz");
writeFileSync(tarball, bytes);
execFileSync("tar", ["-xzf", tarball, "-C", work]);

mkdirSync(join(packageRoot, "abis-src"), { recursive: true });
copyFileSync(join(work, "package", ARTIFACT_PATH), join(packageRoot, "abis-src", VENDORED_FILE));
const vendor: VendorInfo = {
  name: PACKAGE_NAME,
  version: picked,
  tarballSha256: sha256,
  vendoredAt: new Date().toISOString().slice(0, 10),
  releaseAgeGuardDays: MIN_RELEASE_AGE_DAYS,
};
writeFileSync(join(packageRoot, "abis-src", "VENDOR.json"), `${JSON.stringify(vendor, null, 2)}\n`);
writeFileSync(join(packageRoot, "src", "abis", "staked-monad.ts"), generate(packageRoot));
console.log(`vendored ${PACKAGE_NAME}@${picked} (${sha256.slice(0, 16)}…)`);
