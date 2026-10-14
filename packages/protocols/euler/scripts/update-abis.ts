/**
 * The NETWORK half of the ABI pipeline: re-vendor upstream files into
 * abis-src/ (verbatim, with provenance metadata in VENDOR.json), then derive
 * src/abis/euler.ts via the deterministic generator in ./abis.ts.
 *
 * Source policy: Euler publishes no ABI package on npm, so the upstream is the
 * canonical euler-interfaces repository — the same artifact ../addresses.ts
 * reads its Monad deployment record from. Follow the default branch's head
 * commit with a **commit-age guard** (the git analogue of pnpm's
 * minimumReleaseAge): if head is younger than the guard window, walk back BY
 * COMMIT TIME to the newest commit outside it, so a compromised push cannot be
 * vendored the day it lands.
 *
 * Usage: pnpm update:abis [commit-sha]   (the optional pin reproduces a past
 * state in review and deliberately bypasses the age guard)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, SOURCES, sha256, type VendoredFile, type VendorInfo } from "./abis.js";

const REPOSITORY = "https://github.com/euler-xyz/euler-interfaces";
const REPO_SLUG = "euler-xyz/euler-interfaces";
const MIN_COMMIT_AGE_DAYS = 7;

interface CommitEntry {
  sha: string;
  commit: { committer: { date: string } };
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dayMs = 24 * 60 * 60 * 1000;

const githubJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return (await response.json()) as T;
};

const pinned = process.argv[2];
let commit: string;
let committedAt: string;

if (pinned) {
  const entry = await githubJson<CommitEntry>(
    `https://api.github.com/repos/${REPO_SLUG}/commits/${pinned}`,
  );
  commit = entry.sha;
  committedAt = entry.commit.committer.date.slice(0, 10);
  console.log(`pinned to ${commit} by argument — age guard bypassed deliberately`);
} else {
  const cutoff = new Date(Date.now() - MIN_COMMIT_AGE_DAYS * dayMs).toISOString();
  const [entry] = await githubJson<CommitEntry[]>(
    `https://api.github.com/repos/${REPO_SLUG}/commits?until=${cutoff}&per_page=1`,
  );
  if (!entry) throw new Error(`no ${REPO_SLUG} commit is at least ${MIN_COMMIT_AGE_DAYS} days old`);
  commit = entry.sha;
  committedAt = entry.commit.committer.date.slice(0, 10);
  console.log(
    `picked ${commit} (${committedAt}) — newest commit outside the ${MIN_COMMIT_AGE_DAYS}d age guard`,
  );
}

// --- vendor verbatim + record per-file digests ---
mkdirSync(join(packageRoot, "abis-src", "abis"), { recursive: true });
const files: VendoredFile[] = [];
for (const source of SOURCES) {
  const url = `https://raw.githubusercontent.com/${REPO_SLUG}/${commit}/${source.file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  const raw = await response.text();
  // verbatim, under the upstream's own abis-src/ relative path
  writeFileSync(join(packageRoot, "abis-src", source.file), raw);
  files.push({ file: source.file, fileSha256: sha256(raw) });
}

const vendor: VendorInfo = {
  sourceKind: "git",
  repository: REPOSITORY,
  commit,
  committedAt,
  vendoredAt: new Date().toISOString().slice(0, 10),
  commitAgeGuardDays: MIN_COMMIT_AGE_DAYS,
  files,
};
writeFileSync(join(packageRoot, "abis-src", "VENDOR.json"), `${JSON.stringify(vendor, null, 2)}\n`);

// --- derive the generated TS deterministically from what we just committed ---
writeFileSync(join(packageRoot, "src/abis/euler.ts"), generate(packageRoot));

console.log(
  `vendored ${SOURCES.length} upstream files at ${commit.slice(0, 12)} → abis-src/ + VENDOR.json + src/abis/euler.ts`,
);
console.log(
  `cross-check the Monad deployment record at https://github.com/${REPO_SLUG}/blob/${commit}/addresses/143/`,
);
