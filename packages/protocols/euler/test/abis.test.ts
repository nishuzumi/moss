import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate, readVendorInfo, SOURCES, sha256 } from "../scripts/abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// The provenance chain, enforced: the committed generated TS must be exactly
// what the deterministic generator derives from the committed abis-src/.
// Fails on: hand-edits to src/abis/euler.ts, generator edits without
// `pnpm gen:abis`, abis-src/ edits without regeneration.
describe("abi provenance chain", () => {
  it("src/abis/euler.ts derives byte-for-byte from abis-src/", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "euler.ts"), "utf8");
    expect(committed).toBe(generate(packageRoot));
  });

  it("every vendored file matches its recorded sha256", () => {
    const vendor = readVendorInfo(packageRoot);
    for (const source of SOURCES) {
      const raw = readFileSync(join(packageRoot, "abis-src", source.file), "utf8");
      expect(sha256(raw), `${source.file} digest`).toBe(vendor.files[source.file]);
    }
    expect(Object.keys(vendor.files).sort()).toEqual(SOURCES.map(({ file }) => file).sort());
  });

  it("records a pinned upstream commit rather than a moving branch", () => {
    const vendor = readVendorInfo(packageRoot);
    expect(vendor.repository).toBe("https://github.com/euler-xyz/euler-interfaces");
    expect(vendor.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(vendor.commitAgeGuardDays).toBeGreaterThanOrEqual(7);
    // The guard exists so a compromised upstream push cannot be vendored the
    // day it lands; assert the pinned commit actually predates the window.
    const ageDays =
      (Date.parse(vendor.vendoredAt) - Date.parse(vendor.committedAt)) / (24 * 60 * 60 * 1000);
    expect(ageDays).toBeGreaterThanOrEqual(vendor.commitAgeGuardDays);
  });
});
