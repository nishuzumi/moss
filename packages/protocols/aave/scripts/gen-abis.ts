/**
 * Offline regeneration: derive src/abis/ from the COMMITTED abis-src/ files.
 * Use after changing the deterministic generator in ./abis.ts — no network
 * involved. test/abis.test.ts enforces that the committed output matches this
 * exactly.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const [file, contents] of Object.entries(await generate(packageRoot))) {
  writeFileSync(join(packageRoot, file), contents);
  console.log(`regenerated ${file} from abis-src/ (offline)`);
}
