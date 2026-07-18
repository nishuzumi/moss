import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate } from "../scripts/abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Kintsu ABI provenance", () => {
  it("derives the committed typed ABI from the full vendored artifact", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "staked-monad.ts"), "utf8");
    expect(committed).toBe(generate(packageRoot));
  });
});
