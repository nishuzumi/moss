/**
 * The NETWORK half of the compiled pipeline: re-fetch Morpho's Solidity from
 * the protocol repository, record the commit and a sha256 per file, then
 * recompile. Every file is written verbatim, so review is a diff against
 * upstream rather than trust in a transcription.
 *
 * Usage: pnpm update:contracts [git-ref]   (default: the commit in SOURCES.json)
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { digest, generate, readSources } from "./contracts.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sources = readSources(packageRoot);
const ref = process.argv[2] ?? sources.commit;

const head = (await (
  await fetch(`https://api.github.com/repos/${sources.repository}/commits/${ref}`, {
    headers: { accept: "application/vnd.github+json" },
  })
).json()) as { sha?: string; message?: string };
if (!head.sha) throw new Error(`cannot resolve ${sources.repository}@${ref}: ${head.message}`);

for (const file of sources.files) {
  const url = `https://raw.githubusercontent.com/${sources.repository}/${head.sha}/${file.path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${file.path}: ${url} returned ${response.status}`);
  const body = await response.text();
  writeFileSync(join(packageRoot, "contracts", file.path), body);
  file.sha256 = digest(body);
  console.log(`${file.path} sha256 ${file.sha256}`);
}

sources.commit = head.sha;
sources.fetchedAt = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(packageRoot, "contracts", "SOURCES.json"),
  `${JSON.stringify(sources, null, 2)}\n`,
);
writeFileSync(join(packageRoot, "src/abis/metamorpho-v1-1.ts"), generate(packageRoot));
console.log(`re-vendored ${sources.files.length} files at ${head.sha} and recompiled`);
