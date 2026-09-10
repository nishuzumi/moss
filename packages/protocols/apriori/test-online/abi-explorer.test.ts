/**
 * Keyed online cross-check for the explorer-tier aPriori aprMON ABI (ADR 0007).
 *
 * Online and keyed on purpose: requires MONADSCAN_API_KEY plus Monad mainnet
 * RPC and runs only via `pnpm test:abi:online`, never inside the offline
 * `pnpm test` suite. A missing key FAILS this suite instead of skipping, so a
 * misconfigured pipeline cannot stay green.
 *
 * What it enforces:
 * - the aprMON proxy recorded in abis.json is the one the adapter uses;
 * - the proxy still points at the implementation recorded in abis.json
 *   (ERC-1967 slot read); an aPriori upgrade turns this suite red so a human
 *   re-verifies the ABI before trusting it again;
 * - on-chain name/symbol/decimals match the exported APRMON_* constants;
 * - convertToShares/convertToAssets round-trip at a sane LST exchange rate;
 * - the committed ABI is semantically identical to the ABI of the
 *   explorer-verified implementation: a second supply chain, independent of
 *   the committed artifact, that catches any drift.
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
import { AprMonAbi } from "../src/abis/apriori.js";
import { APRMON_ADDRESS, APRMON_DECIMALS, APRMON_NAME, APRMON_SYMBOL } from "../src/index.js";

interface AbiManifest {
  aprMon: { proxy: Address; implementation: Address; allowedExplorerOnly: string[] };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;
const key = process.env.MONADSCAN_API_KEY;

describe("aPriori ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

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

  it("committed aprMON ABI matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.aprMon.implementation, key ?? "");
    const issues = compareDeployedAbi(AprMonAbi, explorerAbi, {
      allowedActualOnly: manifest.aprMon.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });
});
