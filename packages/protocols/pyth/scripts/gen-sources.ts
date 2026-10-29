import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAbi, generateFeeds } from "./sources.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(packageRoot, "src", "abis"), { recursive: true });

writeFileSync(join(packageRoot, "src", "abis", "pyth.ts"), generateAbi(packageRoot));
writeFileSync(join(packageRoot, "src", "feeds.ts"), generateFeeds(packageRoot));

console.log("regenerated Pyth ABI and feed catalog from committed sources (offline)");
