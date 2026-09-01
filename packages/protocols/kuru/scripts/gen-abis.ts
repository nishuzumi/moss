/**
 * Offline regeneration: derive src/abis/kuru.ts from the COMMITTED abis-src/
 * files. Use after changing the deterministic generator in ./abis.ts — no network involved.
 * test/abis.test.ts enforces that the committed output matches this exactly.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(packageRoot, "src/abis/kuru.ts"), generate(packageRoot));
console.log("regenerated src/abis/kuru.ts from abis-src/ (offline)");
