import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate, readVendorInfo, verifyVendored } from "../scripts/abis.js";
import { readSources, verifySources } from "../scripts/contracts.js";
import { MetaMorphoEventsAbi, MetaMorphoV1_1Abi } from "../src/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// The vendored half of the provenance chain, enforced: the committed generated
// TS must be exactly what the deterministic generator derives from the
// committed abis-src/. Fails on hand-edits to src/abis/morpho.ts, generator
// edits without `pnpm gen:abis`, and abis-src edits without regeneration.
describe("vendored abi provenance chain", () => {
  it("src/abis/morpho.ts derives byte-for-byte from abis-src/", async () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "morpho.ts"), "utf8");
    expect(committed).toBe(await generate(packageRoot));
  });

  // ADR 0007 asks for the published file verbatim. A tarball digest cannot show
  // that on its own, because it authenticates the archive rather than the one
  // file taken out of it, so each copy carries its own digest as well.
  it("every vendored upstream file still matches its recorded sha256", () => {
    expect(verifyVendored(packageRoot)).toEqual([]);
  });

  it("records both digests for every vendored source", () => {
    const { sources } = readVendorInfo(packageRoot);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.fileSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(source.tarballSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("reports a vendored file whose bytes drifted from the record", () => {
    const root = mkdtempSync(join(tmpdir(), "moss-morpho-vendor-"));
    try {
      mkdirSync(join(root, "abis-src", "blue-sdk-viem"), { recursive: true });
      writeFileSync(join(root, "abis-src", "blue-sdk-viem", "abis.js"), "export const a = [];\n");
      writeFileSync(
        join(root, "abis-src", "VENDOR.json"),
        JSON.stringify({
          sources: [
            {
              name: "@morpho-org/blue-sdk-viem",
              version: "0.0.0",
              tarballSha256: "0".repeat(64),
              fileSha256: "0".repeat(64),
              path: "lib/esm/abis.js",
              dir: "blue-sdk-viem",
            },
          ],
          vendoredAt: "2026-08-18",
          releaseAgeGuardDays: 7,
        }),
      );
      expect(verifyVendored(root)).toEqual([
        expect.stringContaining("abis-src/blue-sdk-viem/abis.js:"),
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// The compiled half. Recompiling needs foundry, so what runs everywhere is the
// integrity check: the Solidity this package compiled is still byte-for-byte
// the Solidity it recorded from Morpho's repository.
describe("compiled abi provenance chain", () => {
  it("every vendored Solidity file still matches its recorded sha256", () => {
    expect(verifySources(packageRoot)).toEqual([]);
  });

  it("records the upstream commit the sources came from", () => {
    const sources = readSources(packageRoot);
    expect(sources.repository).toBe("morpho-org/metamorpho-v1.1");
    expect(sources.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(sources.files.length).toBeGreaterThan(0);
  });

  it("carries the V1.1 event Morpho's published SDK artifact is missing", () => {
    const events = MetaMorphoEventsAbi.filter((entry) => entry.type === "event").map(
      (entry) => entry.name,
    );
    expect(events).toContain("UpdateLostAssets");
  });

  it("carries the whole vault surface, not a hand-picked subset", () => {
    const functions = MetaMorphoV1_1Abi.filter((entry) => entry.type === "function").map(
      (entry) => entry.name,
    );
    for (const name of ["deposit", "withdraw", "mint", "redeem", "reallocate", "submitCap"]) {
      expect(functions).toContain(name);
    }
  });
});
