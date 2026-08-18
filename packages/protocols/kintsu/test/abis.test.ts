import { readFileSync } from "node:fs";
import { type RenderAbiModuleOptions, renderAbiModule } from "@themoss/abi-tools";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../scripts/abis.js";

describe("Kintsu explorer ABI provenance", () => {
  it("derives the committed V2 ABI from the verified implementation source", () => {
    const [source] = SOURCES;
    expect(source).toEqual({
      address: "0x6A4593baBDF617d5D8D6fbC04b53435d08Baf21f",
      exportName: "StakedMonad",
      file: "staked-monad.ts",
    });
    const committed = readFileSync(new URL("../src/abis/staked-monad.ts", import.meta.url), "utf8");
    const retrieved = /^\/\/ {3}Retrieved: (\d{4}-\d{2}-\d{2}) \(UTC\)$/m.exec(committed)?.[1];
    const literal = /^export const \w+Abi = (\[[\s\S]*\]) as const;$/m.exec(committed)?.[1];
    expect(retrieved).toBeDefined();
    expect(literal).toBeDefined();
    const abi = JSON.parse(literal as string) as RenderAbiModuleOptions["abi"];
    expect(abi).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "event", name: "Deposit" }),
        expect.objectContaining({ type: "event", name: "VirtualSharesSnapshot" }),
      ]),
    );
    expect(committed).toBe(
      renderAbiModule({
        exportName: source?.exportName ?? "",
        address: source?.address ?? "0x0000000000000000000000000000000000000000",
        abi,
        retrievedAt: new Date(`${retrieved}T00:00:00Z`),
      }),
    );
  });
});
