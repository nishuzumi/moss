import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate, readAndValidateAbi, readVendorInfo } from "../scripts/abis.js";
import { NAD_NAME_SERVICE_ADDRESS } from "../src/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Nad Name Service ABI provenance", () => {
  it("pins the official source, hash, and complete ABI", () => {
    const vendor = readVendorInfo(packageRoot);
    const deployment = JSON.parse(readFileSync(join(packageRoot, "abis.json"), "utf8")) as {
      address: string;
      addressSource: string;
    };

    expect(vendor).toMatchObject({
      sourceKind: "docs",
      source: "https://docs.nad.domains/developers/contracts/contract-abi.md",
      file: "NadNameService.json",
    });
    expect(vendor.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(deployment).toMatchObject({
      address: NAD_NAME_SERVICE_ADDRESS,
      addressSource:
        "https://github.com/monad-crypto/protocols/blob/main/mainnet/nad_name_service.jsonc",
    });
    expect(readAndValidateAbi(packageRoot, vendor)).toHaveLength(13);
  });

  it("derives the committed ABI module byte-for-byte", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "nad-name-service.ts"), "utf8");
    expect(committed).toBe(generate(packageRoot));
  });
});
