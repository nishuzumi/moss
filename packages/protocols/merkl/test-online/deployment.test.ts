import { readFileSync } from "node:fs";
import { ERC1967_IMPLEMENTATION_SLOT, erc1967ImplementationAddress } from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";
import {
  type Address,
  getAddress,
  type Hex,
  keccak256,
  toEventSelector,
  toFunctionSelector,
} from "viem";
import { describe, expect, it } from "vitest";
import { distributorAbi } from "../src/abis/distributor.js";
import { MERKL_DISTRIBUTOR_ADDRESS, MERKL_DISTRIBUTOR_IMPLEMENTATION } from "../src/adapter.js";

interface AbiManifest {
  distributor: {
    proxy: Address;
    implementation: Address;
    proxyRuntimeCodeHash: Hex;
    implementationRuntimeCodeHash: Hex;
  };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Merkl Distributor deployment", () => {
  it("pins the fixed proxy, implementation relationship, and runtime bytecode", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    expect(await runtime.client.getChainId()).toBe(143);
    expect(getAddress(manifest.distributor.proxy)).toBe(getAddress(MERKL_DISTRIBUTOR_ADDRESS));
    expect(getAddress(manifest.distributor.implementation)).toBe(
      getAddress(MERKL_DISTRIBUTOR_IMPLEMENTATION),
    );

    const [slot, proxyCode, implementationCode] = await Promise.all([
      runtime.client.getStorageAt({
        address: manifest.distributor.proxy,
        slot: ERC1967_IMPLEMENTATION_SLOT,
      }),
      runtime.client.getCode({ address: manifest.distributor.proxy }),
      runtime.client.getCode({ address: manifest.distributor.implementation }),
    ]);
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.distributor.implementation),
    );
    expect(proxyCode).toBeDefined();
    expect(implementationCode).toBeDefined();
    expect(keccak256(proxyCode as Hex)).toBe(manifest.distributor.proxyRuntimeCodeHash);
    expect(keccak256(implementationCode as Hex)).toBe(
      manifest.distributor.implementationRuntimeCodeHash,
    );
  });

  it("keeps the required read, claim, and event surface deployed", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const code = await runtime.client.getCode({ address: manifest.distributor.implementation });
    expect(code).toBeDefined();

    const signatures = [
      "claim(address[],address[],uint256[],bytes32[][])",
      "getMerkleRoot()",
      "claimed(address,address)",
      "claimRecipient(address,address)",
    ] as const;
    for (const signature of signatures) {
      expect(code?.toLowerCase()).toContain(toFunctionSelector(signature).slice(2).toLowerCase());
    }
    expect(code?.toLowerCase()).toContain(
      toEventSelector("Claimed(address,address,uint256)").slice(2).toLowerCase(),
    );

    const root = await runtime.client.readContract({
      address: manifest.distributor.proxy,
      abi: distributorAbi,
      functionName: "getMerkleRoot",
    });
    expect(root).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(BigInt(root)).toBeGreaterThan(0n);
  });
});
