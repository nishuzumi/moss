import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate } from "../scripts/abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// The provenance chain, enforced: the committed generated TS must be exactly
// what the deterministic generator derives from the committed abis-src/.
// Fails on: hand-edits to src/abis/morpho.ts, generator edits without
// `pnpm gen:abis`, abis-src/ edits without regeneration.
describe("abi provenance chain", () => {
  it("src/abis/morpho.ts derives byte-for-byte from abis-src/", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "morpho.ts"), "utf8");
    expect(committed).toBe(generate(packageRoot));
  });
});
