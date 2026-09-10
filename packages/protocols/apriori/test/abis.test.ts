import { readFileSync } from "node:fs";
import { type RenderAbiModuleOptions, renderAbiModule } from "@themoss/abi-tools";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../scripts/abis.js";

describe("aPriori explorer ABI provenance", () => {
  it("derives the committed ABI from the verified implementation source", () => {
    const [source] = SOURCES;
    expect(source).toEqual({
      address: "0x7D2F8dc5a67CA1911bb1A2429552CDf507d106F2",
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
        exportName: source?.exportName ?? "",
        address: source?.address ?? "0x0000000000000000000000000000000000000000",
        abi,
        retrievedAt: new Date(`${retrieved}T00:00:00Z`),
      }),
    );
  });
});
