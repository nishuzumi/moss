import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate, readAndValidateLensAbi, readVendorInfo } from "../scripts/abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Nad.fun ABI provenance chain", () => {
  it("records a full Git commit and validates the verbatim source hash", () => {
    const vendor = readVendorInfo(packageRoot);

    expect(vendor).toMatchObject({
      sourceKind: "git",
      repository: "https://github.com/Naddotfun/contract-v3-abi.git",
      file: "ILens.json",
    });

    expect(vendor.commit).toMatch(/^[0-9a-f]{40}$/);

    expect(vendor.fileSha256).toMatch(/^[0-9a-f]{64}$/);

    expect(readAndValidateLensAbi(packageRoot, vendor)).toHaveLength(7);
  });

  it("derives src/abis/lens.ts byte-for-byte from committed inputs", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "lens.ts"), "utf8");

    expect(committed).toBe(generate(packageRoot));
  });
});
