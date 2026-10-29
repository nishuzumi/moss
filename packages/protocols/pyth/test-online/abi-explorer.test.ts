/**
 * Keyed explorer cross-check for the full Pyth PriceFeed implementation
 * ABI (ADR 0007). The PriceFeed contract is an ERC-1967 proxy: the normal
 * package suite checks the proxy's deployed bytecode and live reads, while
 * this keyed test resolves the active implementation, independently fetches
 * its explorer-verified ABI, and compares it semantically against the
 * vendored IPyth artifact. A proxy upgrade changes the implementation
 * address and turns this check red instead of being silently accepted.
 */
import { readFileSync } from "node:fs";
import {
  compareDeployedAbi,
  ERC1967_IMPLEMENTATION_SLOT,
  erc1967ImplementationAddress,
  fetchAbi,
} from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";
import { type Address, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { PythAbi } from "../src/abis/pyth.js";
import { PYTH_PRICE_FEED_ADDRESS } from "../src/feeds.js";

interface AbiManifest {
  priceFeed: {
    proxy: Address;
    implementation: Address;
    allowedExplorerOnly: string[];
  };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;
const key = process.env.MONADSCAN_API_KEY;

describe("Pyth ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the proxy and active implementation", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    expect(getAddress(manifest.priceFeed.proxy)).toBe(getAddress(PYTH_PRICE_FEED_ADDRESS));
    const slot = await runtime.client.getStorageAt({
      address: manifest.priceFeed.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.priceFeed.implementation),
    );
  });

  it("matches the explorer-verified implementation ABI", { timeout: 120_000 }, async () => {
    const explorerAbi = await fetchAbi(manifest.priceFeed.implementation, key ?? "");
    expect(
      compareDeployedAbi(PythAbi, explorerAbi, {
        allowedActualOnly: manifest.priceFeed.allowedExplorerOnly,
      }),
    ).toEqual([]);
  });
});
