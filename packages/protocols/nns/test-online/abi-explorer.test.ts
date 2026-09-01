/**
 * Honest degraded verification for the Nad Name Service proxy (ADR 0007).
 *
 * MonadScan currently reports the pinned implementation as unverified, so this
 * suite deliberately does not claim an explorer ABI semantic comparison. It
 * keeps the upgrade/code-hash tripwires and checks that every function selector
 * used by Moss is represented in the deployed implementation bytecode.
 */
import { readFileSync } from "node:fs";
import {
  ERC1967_IMPLEMENTATION_SLOT,
  erc1967ImplementationAddress,
  fetchAbi,
} from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";
import { type Abi, type Address, getAddress, keccak256, toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { REQUIRED_FUNCTIONS } from "../scripts/abis.js";
import { NadNameServiceAbi } from "../src/abis/nad-name-service.js";
import { NAD_NAME_SERVICE_ADDRESS } from "../src/index.js";

interface AbiManifest {
  proxy: Address;
  implementation: Address;
  implementationCodeHash: `0x${string}`;
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

describe("NNS ABI degraded verification", () => {
  it("pins the proxy used by the adapter", () => {
    expect(getAddress(manifest.proxy)).toBe(getAddress(NAD_NAME_SERVICE_ADDRESS));
  });

  it("proxy still points at the recorded implementation and bytecode", {
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

  it("deployed bytecode exposes every Moss-required function selector", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const code = await runtime.client.getCode({ address: manifest.implementation });
    expect(code).toBeDefined();
    expect(code).not.toBe("0x");
    const haystack = (code ?? "0x").toLowerCase();
    const abi = NadNameServiceAbi as Abi;

    for (const name of REQUIRED_FUNCTIONS) {
      const item = abi.find(
        (entry) => entry.type === "function" && "name" in entry && entry.name === name,
      );
      if (item?.type !== "function")
        throw new Error(`required NNS function ${name} is missing from ABI`);
      expect(haystack, `selector for ${name} missing from implementation`).toContain(
        toFunctionSelector(item).slice(2).toLowerCase(),
      );
    }
  });

  it("records MonadScan's current unverified status instead of claiming semantic comparison", {
    timeout: 120_000,
  }, async () => {
    const key = process.env.MONADSCAN_API_KEY;
    if (!key) return;
    await expect(fetchAbi(manifest.implementation, key)).rejects.toThrow(
      /Contract source code not verified/i,
    );
  });
});
