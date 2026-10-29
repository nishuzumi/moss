import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAbi, generateFeeds, readManifest, sha256 } from "./sources.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = readManifest(packageRoot);

async function fetchPinnedSource(source: { file: string; url: string; fileSha256: string }) {
  const response = await fetch(source.url, {
    headers: { "user-agent": "moss-pyth-source-updater" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.url}: HTTP ${response.status}`);
  }

  const raw = await response.text();
  const actualHash = sha256(raw);
  if (actualHash !== source.fileSha256) {
    throw new Error(
      `Pinned Pyth source changed at ${source.url}: expected ${source.fileSha256}, received ${actualHash}`,
    );
  }

  const path = join(packageRoot, source.file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, raw);
  console.log(`${source.file}: sha256 ${actualHash}`);
}

await Promise.all([fetchPinnedSource(manifest.abi), fetchPinnedSource(manifest.deployment)]);

mkdirSync(join(packageRoot, "src", "abis"), { recursive: true });
writeFileSync(join(packageRoot, "src", "abis", "pyth.ts"), generateAbi(packageRoot));
writeFileSync(join(packageRoot, "src", "feeds.ts"), generateFeeds(packageRoot));

console.log("updated pinned Pyth sources and regenerated TypeScript modules");
