import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(packageRoot, "src", "abis", "staked-monad.ts"), generate(packageRoot));
console.log("regenerated src/abis/staked-monad.ts from abis-src/ (offline)");
