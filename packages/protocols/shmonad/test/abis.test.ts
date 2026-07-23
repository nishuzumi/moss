import { readFileSync } from "node:fs";
import { type RenderAbiModuleOptions, renderAbiModule } from "@themoss/abi-tools";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../scripts/abis.js";
import { SHMONAD_IMPLEMENTATION_ADDRESS } from "../src/shmonad.js";

// The provenance chain, enforced: the committed src/abis module must be
// byte-exact renderAbiModule output for its SOURCES entry — same address, same
// recorded retrieval date, same embedded ABI. Any hand edit to the generated
// module breaks this equality; regenerate with `pnpm update:abis`.
describe("explorer ABI derivation (ADR 0007)", () => {
  for (const source of SOURCES) {
    it(`src/abis/${source.file} is exactly renderAbiModule output`, () => {
      const committed = readFileSync(
        new URL(`../src/abis/${source.file}`, import.meta.url),
        "utf8",
      );

      const retrieved = /^\/\/ {3}Retrieved: (\d{4}-\d{2}-\d{2}) \(UTC\)$/m.exec(committed)?.[1];
      expect(retrieved).toBeDefined();

      const literal = /^export const \w+Abi = (\[[\s\S]*\]) as const;$/m.exec(committed)?.[1];
      expect(literal).toBeDefined();
      const abi = JSON.parse(literal as string) as RenderAbiModuleOptions["abi"];

      expect(committed).toBe(
        renderAbiModule({
          exportName: source.exportName,
          address: source.address,
          abi,
          retrievedAt: new Date(`${retrieved}T00:00:00Z`),
        }),
      );
    });
  }

  // The ABI is fetched from the implementation behind the proxy; that address is
  // an exported, reviewable constant. The live e2e pins it to the proxy's
  // ERC-1967 slot so an upgrade is caught rather than silently accepted.
  it("SOURCES address matches the protocol's verified implementation constant", () => {
    expect(SOURCES.map((s) => s.address)).toEqual([SHMONAD_IMPLEMENTATION_ADDRESS]);
  });
});
