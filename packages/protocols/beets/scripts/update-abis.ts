/**
 * The NETWORK half of the ABI pipeline: re-vendor upstream files into
 * abis-src/ (verbatim, with SHA-256 provenance in VENDOR.json), then derive
 * src/abis/beets.ts via the deterministic generator in ./abis.ts.
 *
 * Upstream is the balancer/balancer-deployments repository — the canonical
 * source of deployment artifacts for Balancer v3 — pinned to an exact commit,
 * never a moving branch. Default runs re-vendor at the currently pinned commit
 * (byte-identical output); reviewers move the pin deliberately and review the
 * abis-src diff.
 *
 * Usage: pnpm update:abis [commit|latest]
 *   (no arg)   re-vendor at the currently pinned commit (VENDOR.json)
 *   <commit>   re-vendor at an explicit 40-hex commit
 *   latest     resolve the upstream default branch HEAD and vendor at it
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, SOURCES, type VendorInfo } from "./abis.js";

const REPO = "balancer/balancer-deployments";
const BRANCH = "master";
const TASK_BY_FILE: Record<string, string> = {
  "Router.json": "20250307-v3-router-v2",
  "Vault.json": "20241204-v3-vault",
  "VaultExtension.json": "20241204-v3-vault",
  "VaultExplorer.json": "20250407-v3-vault-explorer-v2",
};
const FETCH_RETRIES = 3;

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function fetchText(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRIES)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error(`${url}: failed after ${FETCH_RETRIES} attempts — ${String(lastError)}`);
}

async function commitSha(requested: string): Promise<string> {
  if (/^[0-9a-f]{40}$/.test(requested)) return requested;
  if (requested === "latest") {
    const payload = JSON.parse(
      await fetchText(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`),
    ) as { sha: string };
    const sha = String(payload.sha);
    console.log(`resolved upstream ${REPO}@${BRANCH} → ${sha}`);
    return sha;
  }
  throw new Error(`invalid commit argument (expected 40-hex SHA or "latest"): ${requested}`);
}

async function main(): Promise<void> {
  const current = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;
  const prevCommit = current.commit;
  const commit = await commitSha(process.argv[2] ?? prevCommit);

  const fileSha256: Record<string, string> = {};
  mkdirSync(join(packageRoot, "abis-src"), { recursive: true });
  for (const source of SOURCES) {
    const task = TASK_BY_FILE[source.file];
    if (!task) throw new Error(`no deploy task known for ${source.file}`);
    const url = `https://raw.githubusercontent.com/${REPO}/${commit}/v3/tasks/${task}/artifact/${source.file}`;
    const raw = await fetchText(url);

    // Refuse anything that does not parse as a hardhat artifact with an ABI:
    // this keeps an accidental 404/HTML fetch from ever reaching abis-src/.
    const artifact = JSON.parse(raw) as { abi?: unknown };
    if (!Array.isArray(artifact.abi)) {
      throw new Error(`${source.file}@${commit}: fetched content has no top-level ABI array`);
    }
    fileSha256[source.file] = createHash("sha256").update(raw).digest("hex");
    writeFileSync(join(packageRoot, "abis-src", source.file), raw);
  }

  const vendor: VendorInfo = {
    name: REPO,
    branch: BRANCH,
    commit,
    fileSha256,
    vendoredAt: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(
    join(packageRoot, "abis-src", "VENDOR.json"),
    `${JSON.stringify(vendor, null, 2)}\n`,
  );
  writeFileSync(join(packageRoot, "src/abis/beets.ts"), generate(packageRoot));

  const digests = SOURCES.map((s) => `${s.file}=${fileSha256[s.file]?.slice(0, 16)}…`).join(" ");
  console.log(
    `vendored ${SOURCES.length} files at ${commit} (${digests}) → abis-src/ + VENDOR.json + src/abis/beets.ts`,
  );
  if (commit !== prevCommit) {
    console.log(
      `pin moved ${prevCommit.slice(0, 8)} → ${commit.slice(0, 8)} — review the abis-src/ diff`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
