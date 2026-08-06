/**
 * Network half of the Nad.fun ABI provenance pipeline.
 *
 * Resolves an upstream Git ref, downloads ILens.json verbatim from the
 * official repository, records the exact commit and SHA-256, then invokes
 * the deterministic generator.
 *
 * Usage:
 *
 *   pnpm update:abis
 *   pnpm update:abis <git-ref-or-full-commit>
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, REQUIRED_LENS_FUNCTIONS, type VendorInfo } from "./abis.js";

const REPOSITORY = "https://github.com/Naddotfun/contract-v3-abi.git";

const RAW_REPOSITORY = "https://raw.githubusercontent.com/Naddotfun/contract-v3-abi";

const ABI_FILE = "ILens.json";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveCommit(requestedRef: string): string {
  if (/^[0-9a-f]{40}$/i.test(requestedRef)) {
    return requestedRef.toLowerCase();
  }

  const output = execFileSync("git", ["ls-remote", REPOSITORY, requestedRef], {
    encoding: "utf8",
  }).trim();

  const commits = output
    .split("\n")
    .map((line) => line.trim().split(/\s+/)[0])
    .filter((value): value is string => Boolean(value));

  if (commits.length !== 1) {
    throw new Error(`Expected one Git commit for ${requestedRef}, received ${commits.length}`);
  }

  const commit = commits[0];

  if (!commit || !/^[0-9a-f]{40}$/i.test(commit)) {
    throw new Error(`Could not resolve a full Git commit for ${requestedRef}`);
  }

  return commit.toLowerCase();
}

function validateAbi(raw: string): void {
  const abi = JSON.parse(raw) as Array<{
    type?: string;
    name?: string;
  }>;

  if (!Array.isArray(abi)) {
    throw new Error("Downloaded ILens.json is not an ABI array");
  }

  const actual = abi
    .filter((entry) => entry.type === "function")
    .map((entry) => entry.name)
    .sort();

  const expected = [...REQUIRED_LENS_FUNCTIONS].sort();

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Downloaded ILens.json has an unexpected function set: ${actual.join(", ")}`);
  }
}

const requestedRef = process.argv[2] ?? "HEAD";

const commit = resolveCommit(requestedRef);
const rawUrl = `${RAW_REPOSITORY}/${commit}/${ABI_FILE}`;

console.log(`Fetching ${ABI_FILE} from ${commit}`);

const response = await fetch(rawUrl);

if (!response.ok) {
  throw new Error(`Failed to fetch ${rawUrl}: HTTP ${response.status}`);
}

const bytes = Buffer.from(await response.arrayBuffer());

const raw = bytes.toString("utf8");

validateAbi(raw);

const fileSha256 = createHash("sha256").update(bytes).digest("hex");

const sourceDirectory = join(packageRoot, "abis-src");

mkdirSync(sourceDirectory, {
  recursive: true,
});

writeFileSync(join(sourceDirectory, ABI_FILE), bytes);

const vendor: VendorInfo = {
  sourceKind: "git",
  repository: REPOSITORY,
  commit,
  file: ABI_FILE,
  fileSha256,
  vendoredAt: new Date().toISOString().slice(0, 10),
};

writeFileSync(join(sourceDirectory, "VENDOR.json"), `${JSON.stringify(vendor, null, 2)}\n`);

writeFileSync(join(packageRoot, "src", "abis", "lens.ts"), generate(packageRoot));

console.log(`vendored ${ABI_FILE} at ${commit} ` + `(sha256 ${fileSha256.slice(0, 16)}…)`);
