import { readFileSync } from "node:fs";
import { type RenderAbiModuleOptions, renderAbiModule } from "@themoss/abi-tools";
import { describe, expect, it } from "vitest";
import { SOURCES } from "../scripts/abis.js";
import { monadCardsAbi } from "../src/abis/monad-cards.js";
import { MONAD_CARDS_ADDRESS } from "../src/monad-cards.js";

describe("Monad Cards explorer ABI derivation (ADR 0007)", () => {
  it("is exactly the shared renderer output for the verified address", () => {
    const [source] = SOURCES;
    expect(source).toBeDefined();
    const committed = readFileSync(new URL(`../src/abis/${source?.file}`, import.meta.url), "utf8");
    const retrieved = /^\/\/ {3}Retrieved: (\d{4}-\d{2}-\d{2}) \(UTC\)$/m.exec(committed)?.[1];
    expect(retrieved).toBeDefined();
    const literal = /^export const \w+Abi = (\[[\s\S]*\]) as const;$/m.exec(committed)?.[1];
    expect(literal).toBeDefined();
    const abi = JSON.parse(literal as string) as RenderAbiModuleOptions["abi"];

    expect(committed).toBe(
      renderAbiModule({
        exportName: source?.exportName as string,
        address: source?.address as string,
        abi,
        retrievedAt: new Date(`${retrieved}T00:00:00Z`),
      }),
    );
  });

  it("records the official address and complete totalMinted function", () => {
    expect(SOURCES.map(({ address }) => address)).toEqual([MONAD_CARDS_ADDRESS]);
    // MonadScan's verified full ABI currently has 54 entries; pinning the count detects drift.
    expect(monadCardsAbi).toHaveLength(54);
    expect(
      monadCardsAbi.find((item) => item.type === "function" && item.name === "totalMinted"),
    ).toEqual({
      inputs: [],
      name: "totalMinted",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    });
  });
});
