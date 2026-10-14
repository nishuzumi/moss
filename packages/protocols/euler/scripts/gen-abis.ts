import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(packageRoot, "src/abis/euler.ts"), generate(packageRoot));
console.log("regenerated src/abis/euler.ts from abis-src/ (offline)");
