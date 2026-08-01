import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate } from "../scripts/abis.js";
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
