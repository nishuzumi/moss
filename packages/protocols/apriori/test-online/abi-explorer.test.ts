/**
 * On-chain derivation checks for the vendored aPriori ABI (ADR 0007).
 *
 * The aprMON EIP-1967 implementation is UNVERIFIED on MonadScan (no Sourcify
 * match either), so there is no explorer artifact to fetch and compare and no
 * API key involved. The ABI is instead vendored verbatim from aPriori's
 * official integration docs (see src/abis/apriori.ts) and this suite enforces
 * the derivation directly against Monad mainnet:
 *
 * - the proxy address recorded in abis.json matches the adapter's constant;
 * - the proxy's EIP-1967 slot still resolves to the implementation recorded
 *   in abis.json — an aPriori upgrade turns this suite red so a human
 *   re-verifies the vendored ABI before trusting it again;
 * - proxy and implementation both have deployed bytecode;
 * - every vendored function selector and event topic hash, recomputed from
 *   the artifact, appears in the deployed implementation bytecode;
 * - on-chain name/symbol/decimals match the exported APRMON_* constants;
 * - convertToShares/convertToAssets round-trip at a sane LST exchange rate.
 *
 * Requires Monad mainnet RPC; runs only via `pnpm test:abi:online`.
 * If aPriori verifies the implementation, replace this with the keyed
 * fetchAbi + compareDeployedAbi cross-check used by protocol-kuru.
 */

import { readFileSync } from "node:fs";
import { ERC1967_IMPLEMENTATION_SLOT, erc1967ImplementationAddress } from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";
import { type Address, getAddress, toEventSelector, toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { AprMonAbi } from "../src/abis/apriori.js";
import { APRMON_ADDRESS, APRMON_DECIMALS, APRMON_NAME, APRMON_SYMBOL } from "../src/index.js";

interface AbiManifest {
  aprMon: { proxy: Address; implementation: Address };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

describe("aPriori ABI on-chain derivation", () => {
  it("pins the aprMON proxy the adapter actually uses", () => {
    expect(getAddress(manifest.aprMon.proxy)).toBe(getAddress(APRMON_ADDRESS));
  });

  it("has deployed bytecode at the aprMON proxy address", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    expect(
      (await runtime.client.getCode({ address: manifest.aprMon.proxy }))?.length,
    ).toBeGreaterThan(2);
  });

  it("aprMON proxy still points at the recorded implementation", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.aprMon.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.aprMon.implementation),
    );
  });

  it("every vendored selector and topic hash appears in the implementation bytecode", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const code = await runtime.client.getCode({ address: manifest.aprMon.implementation });
    expect(code?.length ?? 0).toBeGreaterThan(2);
    const haystack = (code ?? "0x").toLowerCase();
    for (const item of AprMonAbi) {
      const needle =
        item.type === "function"
          ? toFunctionSelector(item).slice(2)
          : toEventSelector(item).slice(2);
      expect(haystack, `${item.type} ${item.name} (${needle}) missing from bytecode`).toContain(
        needle.toLowerCase(),
      );
    }
  });

  it("matches on-chain token metadata against the exported constants", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const [name, symbol, decimals] = await Promise.all([
      runtime.client.readContract({
        address: manifest.aprMon.proxy,
        abi: AprMonAbi,
        functionName: "name",
      }) as Promise<string>,
      runtime.client.readContract({
        address: manifest.aprMon.proxy,
        abi: AprMonAbi,
        functionName: "symbol",
      }) as Promise<string>,
      runtime.client.readContract({
        address: manifest.aprMon.proxy,
        abi: AprMonAbi,
        functionName: "decimals",
      }) as Promise<number>,
    ]);
    expect(name).toBe(APRMON_NAME);
    expect(symbol).toBe(APRMON_SYMBOL);
    expect(decimals).toBe(APRMON_DECIMALS);
  });

  it("convertToShares/convertToAssets round-trip at a sane exchange rate", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const one = 10n ** 18n;
    const shares = (await runtime.client.readContract({
      address: manifest.aprMon.proxy,
      abi: AprMonAbi,
      functionName: "convertToShares",
      args: [one],
    })) as bigint;
    const roundTrip = (await runtime.client.readContract({
      address: manifest.aprMon.proxy,
      abi: AprMonAbi,
      functionName: "convertToAssets",
      args: [shares],
    })) as bigint;
    expect(shares).toBeGreaterThan(0n);
    // A reward-bearing LST cannot mint more shares than assets deposited.
    expect(shares).toBeLessThanOrEqual(one);
    // Round-tripping through the vault's own views must return ~1 MON
    // (tolerate integer-division dust, not rate errors).
    const drift = roundTrip > one ? roundTrip - one : one - roundTrip;
    expect(drift).toBeLessThan(10n ** 15n);
  });
});
