import { readFileSync } from "node:fs";
import { type RenderAbiModuleOptions, renderAbiModule } from "@themoss/abi-tools";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../scripts/abis.js";
import {
  PANCAKESWAP_V3_FACTORY_ADDRESS,
  PANCAKESWAP_V3_ROUTER_ADDRESS,
} from "../src/pancakeswap.js";
import {
  PANCAKESWAP_V2_PAIR_ABI_SOURCE_ADDRESS,
  PANCAKESWAP_V2_ROUTER_ADDRESS,
} from "../src/pancakeswap-v2.js";

// The provenance chain, enforced: every committed src/abis module must be
// byte-exact renderAbiModule output for its SOURCES entry — same address,
// same recorded retrieval date, same embedded ABI. Any hand edit to a
// generated module breaks this equality; regenerate with `pnpm update:abis`.
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

  it("SOURCES addresses match the protocol's verified constants", () => {
    expect(SOURCES.map((s) => s.address)).toEqual([
      PANCAKESWAP_V3_ROUTER_ADDRESS,
      PANCAKESWAP_V3_FACTORY_ADDRESS,
      PANCAKESWAP_V2_ROUTER_ADDRESS,
      PANCAKESWAP_V2_PAIR_ABI_SOURCE_ADDRESS,
    ]);
  });
});
