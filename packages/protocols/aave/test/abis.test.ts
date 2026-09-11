import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { generate, readVendor, VENDORED_FILES } from "../scripts/abis.js";
import { AAVE_V3_MONAD } from "../src/abis/address-book.js";
import {
  AAVE_POOL_ADDRESS,
  AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS,
  AAVE_POOL_IMPLEMENTATION_ADDRESS,
  AAVE_RESERVES,
} from "../src/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

interface TokenList {
  tokens: { chainId: number; address: string; symbol: string; decimals: number }[];
}

async function generateWithTokenList(edit: (list: TokenList) => void) {
  const root = mkdtempSync(join(tmpdir(), "aave-tokenlist-test-"));
  try {
    cpSync(join(packageRoot, "abis-src"), join(root, "abis-src"), { recursive: true });
    const path = join(root, "abis-src", "tokenlist.json");
    const list = JSON.parse(readFileSync(path, "utf8")) as TokenList;
    edit(list);
    writeFileSync(path, JSON.stringify(list));
    return await generate(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// The provenance chain, enforced: the committed generated TS must be exactly
// what the deterministic generator derives from the committed abis-src/.
// Fails on: hand-edits to src/abis/*.ts, generator edits without
// `pnpm gen:abis`, abis-src/ edits without regeneration.
describe("abi and deployment provenance chain", () => {
  it("src/abis/ derives byte-for-byte from abis-src/", async () => {
    const generated = await generate(packageRoot);
    expect(Object.keys(generated).sort()).toEqual(["src/abis/aave.ts", "src/abis/address-book.ts"]);
    for (const [file, contents] of Object.entries(generated)) {
      expect(readFileSync(join(packageRoot, file), "utf8"), file).toBe(contents);
    }
  });

  // The upstream half of the chain, checkable without the network: every
  // vendored byte has to hash to what VENDOR.json recorded when it was
  // downloaded. Without this, only `pnpm update:abis` could catch an edited
  // copy of a third-party file.
  it("every vendored file matches its recorded sha256", () => {
    const vendor = readVendor(packageRoot);
    const recorded = Object.keys(vendor.files);
    expect(recorded.length).toBeGreaterThanOrEqual(VENDORED_FILES.length);
    for (const file of VENDORED_FILES) expect(recorded).toContain(file);
    for (const [file, digest] of Object.entries(vendor.files)) {
      const bytes = readFileSync(join(packageRoot, "abis-src", file));
      expect(createHash("sha256").update(bytes).digest("hex"), file).toBe(digest);
    }
  });

  it("exported addresses are the address book's, not a second transcription", () => {
    expect(AAVE_POOL_ADDRESS).toBe(getAddress(AAVE_V3_MONAD.POOL));
    expect(AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS).toBe(
      getAddress(AAVE_V3_MONAD.POOL_ADDRESSES_PROVIDER),
    );
    expect(AAVE_POOL_IMPLEMENTATION_ADDRESS).toBe(getAddress(AAVE_V3_MONAD.POOL_IMPL));
  });

  it("every listed reserve comes from the address book", () => {
    const assets = Object.entries(AAVE_V3_MONAD.ASSETS);
    expect(AAVE_RESERVES).toHaveLength(assets.length);
    for (const [sourceId, asset] of assets) {
      const reserve = AAVE_RESERVES.find(
        ({ underlying }) => underlying.toLowerCase() === getAddress(asset.UNDERLYING).toLowerCase(),
      );
      expect(reserve, sourceId).toEqual({
        symbol: asset.symbol,
        decimals: asset.decimals,
        underlying: getAddress(asset.UNDERLYING),
        aToken: getAddress(asset.A_TOKEN),
        variableDebtToken: getAddress(asset.V_TOKEN),
      });
    }

    const newReserve = AAVE_RESERVES.find(
      ({ underlying }) =>
        underlying.toLowerCase() ===
        getAddress(AAVE_V3_MONAD.ASSETS.PT_AUSD_8OCT2026.UNDERLYING).toLowerCase(),
    );
    expect(newReserve).toEqual({
      symbol: "PT-AUSD-8OCT2026",
      decimals: 6,
      underlying: getAddress("0x9FC74f8Ed616B5BaF52a170caa97d6d3898602d1"),
      aToken: getAddress("0xb93Ce4EB85eBA317f954Dadcbe112Ce6c3af9ae4"),
      variableDebtToken: getAddress("0x4d2D334Ff7b0A82394bc95668d99369e9EE06748"),
    });
  });

  it.each([
    ["missing", "expected exactly one Monad underlying"],
    ["wrong chain", "expected exactly one Monad underlying"],
    ["duplicate", "expected exactly one Monad underlying"],
    ["decimals", "decimals disagree"],
    ["empty symbol", "empty or invalid symbol"],
  ] as const)("rejects %s token-list metadata", async (mutation, message) => {
    await expect(
      generateWithTokenList((list) => {
        const address = AAVE_V3_MONAD.ASSETS.PT_AUSD_8OCT2026.UNDERLYING.toLowerCase();
        const index = list.tokens.findIndex(
          (token) => token.chainId === 143 && token.address.toLowerCase() === address,
        );
        const token = list.tokens[index];
        if (!token) throw new Error("test fixture has no PT underlying");
        switch (mutation) {
          case "missing":
            list.tokens.splice(index, 1);
            break;
          case "wrong chain":
            token.chainId = 1;
            break;
          case "duplicate":
            list.tokens.push({ ...token, address: address.toUpperCase() });
            break;
          case "decimals":
            token.decimals = 18;
            break;
          case "empty symbol":
            token.symbol = " ";
            break;
        }
      }),
    ).rejects.toThrow(message);
  });

  it("matches token-list addresses case-insensitively without accepting another chain", async () => {
    const generated = await generateWithTokenList((list) => {
      for (const token of list.tokens) token.address = token.address.toLowerCase();
      const token = list.tokens.find(
        (entry) =>
          entry.chainId === 143 &&
          entry.address === AAVE_V3_MONAD.ASSETS.PT_AUSD_8OCT2026.UNDERLYING.toLowerCase(),
      );
      if (!token) throw new Error("test fixture has no PT underlying");
      list.tokens.push({ ...token, chainId: 1, symbol: "WRONG_CHAIN", decimals: 18 });
    });
    expect(generated).toEqual(await generate(packageRoot));
  });

  it("assigns every reserve a distinct position token", () => {
    const addresses = AAVE_RESERVES.flatMap((reserve) => [
      reserve.underlying.toLowerCase(),
      reserve.aToken.toLowerCase(),
      reserve.variableDebtToken.toLowerCase(),
    ]);
    expect(new Set(addresses).size).toBe(addresses.length);
  });
});
