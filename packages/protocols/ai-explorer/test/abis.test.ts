import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AnalysisRegistryAbi } from "../src/abis/analysis-registry.js";
import { ANALYSIS_REGISTRY_ADDRESS } from "../src/adapter.js";

// Pinned Foundry artifact (github.com/Chichuzxy/ai-monad-explorer@8757c1a6):
// full compiled ABI of AnalysisRegistry.sol (solc 0.8.20).
const FIXTURE = new URL("./fixtures/analysis-registry.abi.json", import.meta.url);

describe("AI Explorer ABI derivation (ADR 0007)", () => {
  it("is the exact deterministic render of the pinned Foundry artifact", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
    const committed = readFileSync(
      new URL("../src/abis/analysis-registry.ts", import.meta.url),
      "utf8",
    );
    const literal = /^export const AnalysisRegistryAbi = (\[[\s\S]*\]) as const;$/m.exec(
      committed,
    )?.[1];
    expect(literal).toBeDefined();
    // Byte-for-byte: the committed literal is exactly JSON.stringify(abi, null, 2).
    expect(literal).toBe(JSON.stringify(fixture, null, 2));
  });

  it("records the fixed address and the complete public surface", () => {
    // The address constant is the one the ABI module's provenance header names.
    expect(ANALYSIS_REGISTRY_ADDRESS).toMatch(/^0x[0-9a-fA-F]{40}$/);
    // Full compiled ABI: 7 functions + 1 event.
    expect(AnalysisRegistryAbi).toHaveLength(8);
    const functions = AnalysisRegistryAbi.filter((item) => item.type === "function");
    expect(functions.map((item) => item.name).sort()).toEqual([
      "analyses",
      "getAnalysis",
      "getLatestAnalyses",
      "getUserAnalyses",
      "submitAnalysis",
      "totalAnalyses",
      "userAnalyses",
    ]);
  });

  it("covers the public getters the old hand-written subset omitted", () => {
    const analyses = AnalysisRegistryAbi.find(
      (item) => item.type === "function" && item.name === "analyses",
    );
    const userAnalyses = AnalysisRegistryAbi.find(
      (item) => item.type === "function" && item.name === "userAnalyses",
    );
    expect(analyses?.inputs).toEqual([{ internalType: "uint256", name: "", type: "uint256" }]);
    // mapping(address => uint256[]) getter takes (key, index).
    expect(userAnalyses?.inputs).toEqual([
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ]);
  });
});
