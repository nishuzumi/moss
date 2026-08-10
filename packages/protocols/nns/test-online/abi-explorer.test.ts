/**
 * Online ABI verification for the NNS ERC-1967 proxy (ADR 0007).
 *
 * This keyed suite pins the proxy implementation and independently checks the
 * generated NNS ABI against the explorer ABI of that implementation.
 */
import { readFileSync } from "node:fs";
import {
  compareDeployedAbi,
  ERC1967_IMPLEMENTATION_SLOT,
  erc1967ImplementationAddress,
  fetchAbi,
} from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";
import { type Address, getAddress, keccak256 } from "viem";
import { describe, expect, it } from "vitest";
import { NadNameServiceAbi } from "../src/abis/nad-name-service.js";
import { NAD_NAME_SERVICE_ADDRESS } from "../src/index.js";

interface AbiManifest {
  proxy: Address;
  implementation: Address;
  implementationCodeHash: `0x${string}`;
  allowedExplorerOnly: string[];
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const key = process.env.MONADSCAN_API_KEY;

describe("NNS proxy ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the proxy used by the adapter", () => {
    expect(getAddress(manifest.proxy)).toBe(getAddress(NAD_NAME_SERVICE_ADDRESS));
  });

  it("proxy still points at the recorded implementation with the recorded bytecode", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.implementation),
    );

    const code = await runtime.client.getCode({ address: manifest.implementation });
    expect(code).toBeDefined();
    expect(code).not.toBe("0x");
    if (!code) throw new Error("NNS implementation has no deployed bytecode");
    expect(keccak256(code)).toBe(manifest.implementationCodeHash);
  });

  it("generated NNS ABI semantically matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.implementation, key ?? "");
    expect(
      compareDeployedAbi(NadNameServiceAbi, explorerAbi, {
        allowedActualOnly: manifest.allowedExplorerOnly,
      }),
    ).toEqual([]);
  });
});
