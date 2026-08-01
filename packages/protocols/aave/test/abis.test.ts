import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { generate } from "../scripts/abis.js";
import { AAVE_V3_MONAD } from "../src/abis/address-book.js";
import {
  AAVE_POOL_ADDRESS,
  AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS,
  AAVE_POOL_IMPLEMENTATION_ADDRESS,
  AAVE_RESERVES,
} from "../src/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

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

  it("exported addresses are the address book's, not a second transcription", () => {
    expect(AAVE_POOL_ADDRESS).toBe(getAddress(AAVE_V3_MONAD.POOL));
    expect(AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS).toBe(
      getAddress(AAVE_V3_MONAD.POOL_ADDRESSES_PROVIDER),
    );
    expect(AAVE_POOL_IMPLEMENTATION_ADDRESS).toBe(getAddress(AAVE_V3_MONAD.POOL_IMPL));
  });

  it("every listed reserve comes from the address book", () => {
    expect(AAVE_RESERVES).toHaveLength(Object.keys(AAVE_V3_MONAD.ASSETS).length);
    for (const reserve of AAVE_RESERVES) {
      const asset = (AAVE_V3_MONAD.ASSETS as Record<string, { decimals: number } | undefined>)[
        reserve.symbol
      ];
      expect(asset, reserve.symbol).toBeDefined();
      expect(reserve.decimals).toBe(asset?.decimals);
    }
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
