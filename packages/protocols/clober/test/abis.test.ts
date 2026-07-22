import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate } from "../scripts/abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Clober ABI provenance chain", () => {
  it("derives the committed ABI module byte-for-byte from abis-src", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "clober.ts"), "utf8");
    expect(committed).toBe(generate(packageRoot));
  });
});
