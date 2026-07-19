/**
 * Deterministically regenerates the committed TypeScript ABI from abis-src.
 * This path is offline and has no clock dependency.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(packageRoot, "src", "abis"), { recursive: true });
writeFileSync(join(packageRoot, "src", "abis", "pendle.ts"), generate(packageRoot));
console.log("regenerated src/abis/pendle.ts from abis-src/ (offline)");
