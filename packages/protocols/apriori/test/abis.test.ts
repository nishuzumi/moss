import { readFileSync } from "node:fs";
import { type RenderAbiModuleOptions, renderAbiModule } from "@themoss/abi-tools";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../scripts/abis.js";

interface AbiManifest {
  aprMon: { proxy: string; implementation: string; allowedExplorerOnly: string[] };
}

describe("aPriori explorer ABI provenance", () => {
  it("derives the committed ABI from the verified implementation source", () => {
    const [source] = SOURCES;
    // The fetch address is the implementation the online suite pins on chain, so
    // the offline and keyed checks can never point at different contracts.
    const manifest = JSON.parse(
      readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
    ) as AbiManifest;
    expect(source).toEqual({
      address: manifest.aprMon.implementation,
      exportName: "AprMon",
      file: "apriori.ts",
    });
    const committed = readFileSync(new URL("../src/abis/apriori.ts", import.meta.url), "utf8");
    const retrieved = /^\/\/ {3}Retrieved: (\d{4}-\d{2}-\d{2}) \(UTC\)$/m.exec(committed)?.[1];
    const literal = /^export const \w+Abi = (\[[\s\S]*\]) as const;$/m.exec(committed)?.[1];
    expect(retrieved).toBeDefined();
    expect(literal).toBeDefined();
    const abi = JSON.parse(literal as string) as RenderAbiModuleOptions["abi"];
    // The three events the Receipt parsers decode plus the two view helpers the
    // explorer tier brings in that the vendored artifact never carried.
    expect(abi).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "event", name: "Deposit" }),
        expect.objectContaining({ type: "event", name: "RedeemRequest" }),
        expect.objectContaining({ type: "event", name: "Redeem" }),
        expect.objectContaining({ type: "function", name: "viewRedeemRequest" }),
        expect.objectContaining({ type: "function", name: "getUserRequestData" }),
      ]),
    );
    expect(committed).toBe(
      renderAbiModule({
        exportName: source.exportName,
        address: source.address,
        abi,
        retrievedAt: new Date(`${retrieved}T00:00:00Z`),
      }),
    );
  });
});
