import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  generateAbi,
  generateFeeds,
  REQUIRED_PYTH_FUNCTIONS,
  readManifest,
} from "../scripts/sources.js";
import { PYTH_FEED_NAMES, PYTH_FEEDS, PYTH_PRICE_FEED_ADDRESS, PythAbi } from "../src/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Pyth vendored source derivation (ADR 0007)", () => {
  it("regenerates the committed ABI and feed catalog byte-for-byte", () => {
    expect(readFileSync(join(packageRoot, "src", "abis", "pyth.ts"), "utf8")).toBe(
      generateAbi(packageRoot),
    );
    expect(readFileSync(join(packageRoot, "src", "feeds.ts"), "utf8")).toBe(
      generateFeeds(packageRoot),
    );
  });

  it("pins immutable upstream sources with hashes", () => {
    const manifest = readManifest(packageRoot);
    expect(manifest.abi).toMatchObject({
      sourceKind: "npm",
      package: "@pythnetwork/pyth-sdk-solidity",
      version: "4.3.1",
    });
    expect(manifest.deployment).toMatchObject({
      sourceKind: "git",
      repository: "https://github.com/monad-crypto/protocols.git",
      commit: expect.stringMatching(/^[0-9a-f]{40}$/),
      blob: expect.stringMatching(/^[0-9a-f]{40}$/),
    });
  });

  it("keeps the complete official IPyth ABI and required read method", () => {
    expect(PythAbi).toHaveLength(14);
    const functions = PythAbi.filter((entry) => entry.type === "function").map(
      (entry) => entry.name,
    );
    expect(functions.sort()).toEqual([...REQUIRED_PYTH_FUNCTIONS].sort());
    expect(
      PythAbi.find((entry) => entry.type === "function" && entry.name === "getPriceNoOlderThan"),
    ).toMatchObject({
      stateMutability: "view",
      inputs: [
        { type: "bytes32", name: "id" },
        { type: "uint256", name: "age" },
      ],
    });
  });

  it("keeps the official Monad PriceFeed and exact 60-feed allowlist", () => {
    expect(PYTH_PRICE_FEED_ADDRESS).toBe("0x2880aB155794e7179c9eE2e38200202908C17B43");
    expect(PYTH_FEED_NAMES).toHaveLength(60);
    expect(Object.keys(PYTH_FEEDS)).toEqual([...PYTH_FEED_NAMES]);
    expect(PYTH_FEEDS.MON_USD).toBe(
      "0x31491744e2dbf6df7fcf4ac0820d18a609b49076d45066d3568424e62f686cd1",
    );
  });
});
