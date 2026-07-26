import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate, readVendorInfo } from "../scripts/abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Kintsu ABI provenance", () => {
  it("keeps the official artifact at its recorded sha256", () => {
    const raw = readFileSync(join(packageRoot, "abis-src", "StakedMonad.json"));
    expect(createHash("sha256").update(raw).digest("hex")).toBe(
      readVendorInfo(packageRoot).sha256,
    );
  });

  it("derives the committed TypeScript ABI byte-for-byte", () => {
    expect(
      readFileSync(join(packageRoot, "src", "abis", "staked-monad.ts"), "utf8"),
    ).toBe(generate(packageRoot));
  });
});
