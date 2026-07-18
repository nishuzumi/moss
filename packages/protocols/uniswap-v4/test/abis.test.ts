import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");

// The provenance chain, enforced: the committed generated TS must be exactly
// what the deterministic generator derives from the committed abis-src/.
// Fails on: hand-edits to src/abis/*.ts, generator edits without
// `pnpm gen:abis`, abis-src/ edits without regeneration.
describe("abi provenance chain", () => {
  it("PoolManagerAbi derives byte-for-byte from abis-src/PoolManager.json", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "uniswap-v4.ts"), "utf8");
    const poolManagerJson = readFileSync(join(packageRoot, "abis-src", "PoolManager.json"), "utf8");
    const poolManagerAbi = JSON.parse(poolManagerJson);
    const expectedExport = JSON.stringify(poolManagerAbi, null, 2);
    expect(committed).toContain(expectedExport);
  });

  it("V4QuoterAbi derives byte-for-byte from abis-src/V4Quoter.json", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "v4quoter.ts"), "utf8");
    const v4quoterJson = readFileSync(join(packageRoot, "abis-src", "V4Quoter.json"), "utf8");
    const abi = JSON.parse(v4quoterJson);
    const expectedExport = JSON.stringify(abi, null, 2);
    expect(committed).toContain(expectedExport);
  });

  it("UniversalRouterAbi derives byte-for-byte from abis-src/UniversalRouter.json", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "universal-router.ts"), "utf8");
    const urJson = readFileSync(join(packageRoot, "abis-src", "UniversalRouter.json"), "utf8");
    const abi = JSON.parse(urJson);
    const expectedExport = JSON.stringify(abi, null, 2);
    expect(committed).toContain(expectedExport);
  });
});
