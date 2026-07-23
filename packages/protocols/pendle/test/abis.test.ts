import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate, selectReleaseVersion } from "../scripts/abis.js";
import {
  PendleMarketAbi,
  PendleMarketFactoryAbi,
  PendleRouterAbi,
  PendleRouterStaticAbi,
  PendleStandardizedYieldAbi,
  PendleYieldTokenAbi,
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

  it("retains the YT NewInterestIndex event a PT swap trace emits", () => {
    expect(PendleYieldTokenAbi).toContainEqual(
      expect.objectContaining({ type: "event", name: "NewInterestIndex" }),
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

describe("vendor release-age guard", () => {
  const NOW = Date.parse("2026-07-20T00:00:00Z");
  const TIMES: Record<string, string> = {
    "1.0.0": "2026-01-01T00:00:00Z", // long stable
    "1.1.0": "2026-07-01T00:00:00Z", // 19d old, satisfies the 7-day guard
    "1.2.0": "2026-07-18T00:00:00Z", // 2d old, inside the guard
  };
  const source = {
    distTags: { latest: "1.2.0" },
    versions: { "1.0.0": {}, "1.1.0": {}, "1.2.0": {} },
    stableVersions: ["1.0.0", "1.1.0", "1.2.0"],
    publishedAt: (version: string) => Date.parse(TIMES[version] ?? ""),
  };
  const options = { distTag: "latest", now: NOW, minReleaseAgeDays: 7 };

  it("auto-selects the newest stable release older than the guard when latest is too fresh", () => {
    expect(selectReleaseVersion(source, options)).toBe("1.1.0");
  });

  it("auto-selects latest when it already satisfies the guard", () => {
    expect(
      selectReleaseVersion(source, { ...options, now: Date.parse("2026-08-01T00:00:00Z") }),
    ).toBe("1.2.0");
  });

  it("accepts a pinned version that satisfies the release-age guard", () => {
    expect(selectReleaseVersion(source, { ...options, pinned: "1.1.0" })).toBe("1.1.0");
  });

  it("rejects a pinned version inside the release-age guard", () => {
    expect(() => selectReleaseVersion(source, { ...options, pinned: "1.2.0" })).toThrow(
      /release-age guard/,
    );
  });

  it("rejects a pinned version that does not exist", () => {
    expect(() => selectReleaseVersion(source, { ...options, pinned: "9.9.9" })).toThrow(
      /does not exist/,
    );
  });

  it("rejects a pinned prerelease even when it exists and is old enough", () => {
    const times: Record<string, string> = { ...TIMES, "1.1.0-beta.1": "2026-06-20T00:00:00Z" };
    const withPrerelease = {
      ...source,
      versions: { ...source.versions, "1.1.0-beta.1": {} },
      publishedAt: (version: string) => Date.parse(times[version] ?? ""),
    };
    expect(() =>
      selectReleaseVersion(withPrerelease, { ...options, pinned: "1.1.0-beta.1" }),
    ).toThrow(/stable/);
  });

  it("throws when no stable release is old enough to satisfy the guard", () => {
    const young = {
      ...source,
      distTags: { latest: "1.2.0" },
      stableVersions: ["1.2.0"],
      versions: { "1.2.0": {} },
    };
    expect(() => selectReleaseVersion(young, options)).toThrow(/release-age guard/);
  });
});
