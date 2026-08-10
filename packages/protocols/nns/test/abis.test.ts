import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { generate, readAndValidateAbi, readVendorInfo } from "../scripts/abis.js";
import { NAD_NAME_SERVICE_ADDRESS } from "../src/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Nad Name Service ABI provenance", () => {
  it("pins the official source, hash, and complete ABI", () => {
    const vendor = readVendorInfo(packageRoot);
    const deployment = JSON.parse(readFileSync(join(packageRoot, "abis.json"), "utf8")) as {
      proxy: string;
      implementation: string;
      implementationCodeHash: string;
      allowedExplorerOnly: string[];
    };

    expect(vendor).toMatchObject({
      sourceKind: "docs",
      source: "https://docs.nad.domains/developers/contracts/contract-abi.md",
      file: "contract-abi.md",
    });
    expect(vendor.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(deployment).toMatchObject({
      proxy: NAD_NAME_SERVICE_ADDRESS,
      implementation: "0xE1f14F3ffF72E5dacFbA4335BFaF676A1B3F87Cf",
      implementationCodeHash: "0xa4a34e5d3f86d3d8e2b2d847c47af7d439191123f3bb21bfeed3fc23d9309ff4",
      allowedExplorerOnly: [],
    });
    expect(getAddress(deployment.proxy)).toBe(getAddress(NAD_NAME_SERVICE_ADDRESS));
    expect(readAndValidateAbi(packageRoot, vendor)).toHaveLength(13);
  });

  it("derives the committed ABI module byte-for-byte", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "nad-name-service.ts"), "utf8");
    expect(committed).toBe(generate(packageRoot));
  });
});
