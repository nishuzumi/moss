/**
 * Keyed explorer cross-check for the full Merkl Distributor implementation
 * ABI (ADR 0007). The normal package suite independently checks the proxy,
 * implementation, bytecode hashes, required selectors/topics, and live reads.
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
import { distributorAbi } from "../src/abis/distributor.js";
import { MERKL_DISTRIBUTOR_ADDRESS } from "../src/adapter.js";

interface AbiManifest {
  distributor: {
    proxy: Address;
    implementation: Address;
    allowedExplorerOnly: string[];
  };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;
const key = process.env.MONADSCAN_API_KEY;

describe("Merkl ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the proxy and active implementation", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    expect(getAddress(manifest.distributor.proxy)).toBe(getAddress(MERKL_DISTRIBUTOR_ADDRESS));
    const slot = await runtime.client.getStorageAt({
      address: manifest.distributor.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.distributor.implementation),
    );
  });

  it("matches the explorer-verified implementation ABI", { timeout: 120_000 }, async () => {
    const explorerAbi = await fetchAbi(manifest.distributor.implementation, key ?? "");
    expect(
      compareDeployedAbi(distributorAbi, explorerAbi, {
        allowedActualOnly: manifest.distributor.allowedExplorerOnly,
      }),
    ).toEqual([]);
  });
});
