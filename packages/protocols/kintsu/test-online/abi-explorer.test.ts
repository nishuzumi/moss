/**
 * Keyed online tripwire for the upgradeable Kintsu StakedMonad deployment.
 * It checks proxy bytecode and implementation linkage, token metadata, and
 * semantic equality with the explorer-verified implementation ABI.
 * It is intentionally excluded from the default offline test suite.
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
import { StakedMonadAbi } from "../src/abis/staked-monad.js";
import {
  KINTSU_STAKED_MONAD_ADDRESS,
  KINTSU_STAKED_MONAD_DECIMALS,
  KINTSU_STAKED_MONAD_NAME,
  KINTSU_STAKED_MONAD_SYMBOL,
} from "../src/index.js";

interface AbiManifest {
  stakedMonad: {
    proxy: Address;
    implementation: Address;
    allowedExplorerOnly: string[];
  };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;
const key = process.env.MONADSCAN_API_KEY;

describe("Kintsu ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the StakedMonad proxy used by the adapter", () => {
    expect(getAddress(manifest.stakedMonad.proxy)).toBe(getAddress(KINTSU_STAKED_MONAD_ADDRESS));
  });

  it("finds deployed bytecode at the StakedMonad proxy", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    const bytecode = await runtime.client.getBytecode({
      address: manifest.stakedMonad.proxy,
    });
    expect(bytecode).toBeDefined();
    expect(bytecode).not.toBe("0x");
  });

  it("StakedMonad proxy still points at the recorded implementation", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.stakedMonad.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.stakedMonad.implementation),
    );
  });

  it("matches on-chain token metadata against the exported constants", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const [name, symbol, decimals] = await Promise.all([
      runtime.client.readContract({
        address: manifest.stakedMonad.proxy,
        abi: StakedMonadAbi,
        functionName: "name",
      }) as Promise<string>,
      runtime.client.readContract({
        address: manifest.stakedMonad.proxy,
        abi: StakedMonadAbi,
        functionName: "symbol",
      }) as Promise<string>,
      runtime.client.readContract({
        address: manifest.stakedMonad.proxy,
        abi: StakedMonadAbi,
        functionName: "decimals",
      }) as Promise<number>,
    ]);
    expect(name).toBe(KINTSU_STAKED_MONAD_NAME);
    expect(symbol).toBe(KINTSU_STAKED_MONAD_SYMBOL);
    expect(decimals).toBe(KINTSU_STAKED_MONAD_DECIMALS);
  });

  it("committed StakedMonad ABI matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.stakedMonad.implementation, key ?? "");
    const issues = compareDeployedAbi(StakedMonadAbi, explorerAbi, {
      allowedActualOnly: manifest.stakedMonad.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });
});
