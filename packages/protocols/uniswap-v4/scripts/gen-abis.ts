/**
 * Offline regeneration: derive src/abis/*.ts from the COMMITTED abis-src/
 * files. Use after changing the deterministic generator in ./abis.ts — no
 * network involved. test/abis.test.ts enforces that the committed output
 * matches this exactly.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAll } from "./abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
generateAll(packageRoot);
console.log("regenerated all src/abis/*.ts from abis-src/ (offline)");
