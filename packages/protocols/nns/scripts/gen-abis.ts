/** Offline regeneration of src/abis/nad-name-service.ts. */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

writeFileSync(join(packageRoot, "src", "abis", "nad-name-service.ts"), generate(packageRoot));
console.log("regenerated src/abis/nad-name-service.ts from abis-src/ (offline)");
