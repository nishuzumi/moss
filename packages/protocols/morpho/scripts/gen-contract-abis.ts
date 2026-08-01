/**
 * Compile the vendored Morpho Solidity into src/abis/metamorpho-v1-1.ts.
 * Needs foundry, and only has to run when contracts/ changes: the generated
 * TypeScript is committed, so CI and ordinary contributors never compile.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./contracts.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(packageRoot, "src/abis/metamorpho-v1-1.ts"), generate(packageRoot));
console.log("regenerated src/abis/metamorpho-v1-1.ts from contracts/");
