import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate } from "../scripts/abis.js";
import {
  PendleMarketAbi,
  PendleMarketFactoryAbi,
  PendleRouterAbi,
  PendleRouterStaticAbi,
  PendleStandardizedYieldAbi,
} from "../src/abis/pendle.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("ABI provenance chain", () => {
  it("derives the committed TypeScript byte-for-byte from abis-src", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "pendle.ts"), "utf8");
    expect(committed).toBe(generate(packageRoot));
  });
});

describe("ABI coverage for the next Pendle stage", () => {
  it("validates markets through the V6 factory deployment", () => {
    expect(PendleMarketFactoryAbi).toContainEqual(
      expect.objectContaining({ type: "function", name: "isValidMarket" }),
    );
  });

  it("reads market identity and retains swap evidence", () => {
    expect(PendleMarketAbi).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "function", name: "readTokens" }),
        expect.objectContaining({ type: "function", name: "expiry" }),
        expect.objectContaining({ type: "function", name: "factory" }),
        expect.objectContaining({ type: "event", name: "Swap" }),
      ]),
    );
  });

  it("reads every supported SY input and output token", () => {
    expect(PendleStandardizedYieldAbi).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "function", name: "getTokensIn" }),
        expect.objectContaining({ type: "function", name: "getTokensOut" }),
        expect.objectContaining({ type: "event", name: "Deposit" }),
        expect.objectContaining({ type: "event", name: "Redeem" }),
      ]),
    );
  });

  it("covers underlying-to-PT and PT-to-underlying execution evidence", () => {
    expect(PendleRouterAbi).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "function", name: "swapExactTokenForPt" }),
        expect.objectContaining({ type: "function", name: "swapExactPtForToken" }),
        expect.objectContaining({ type: "event", name: "SwapPtAndToken" }),
      ]),
    );
    expect(
      PendleRouterAbi.find(
        (entry) => entry.type === "function" && entry.name === "swapExactTokenForPt",
      ),
    ).toMatchObject({
      inputs: expect.arrayContaining([
        expect.objectContaining({
          name: "guessPtOut",
          type: "tuple",
          internalType: "struct ApproxParams",
        }),
      ]),
    });
  });

  it("covers both quote directions and canonical ApproxParams", () => {
    expect(PendleRouterStaticAbi).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "function", name: "swapExactTokenForPtStatic" }),
        expect.objectContaining({ type: "function", name: "swapExactPtForTokenStatic" }),
        expect.objectContaining({ type: "function", name: "getDefaultApproxParams" }),
        expect.objectContaining({
          type: "function",
          name: "swapExactTokenForPtStaticAndGenerateApproxParams",
        }),
      ]),
    );
    expect(
      PendleRouterStaticAbi.find(
        (entry) => entry.type === "function" && entry.name === "getDefaultApproxParams",
      ),
    ).toMatchObject({
      outputs: [
        {
          type: "tuple",
          internalType: "struct ApproxParams",
          components: [
            expect.objectContaining({ name: "guessMin", type: "uint256" }),
            expect.objectContaining({ name: "guessMax", type: "uint256" }),
            expect.objectContaining({ name: "guessOffchain", type: "uint256" }),
            expect.objectContaining({ name: "maxIteration", type: "uint256" }),
            expect.objectContaining({ name: "eps", type: "uint256" }),
          ],
        },
      ],
    });
  });
});
