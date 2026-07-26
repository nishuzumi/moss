/**
 * Keyed online tripwire for the upgradeable Kintsu StakedMonad deployment.
 * It is intentionally excluded from the default offline test suite.
 */
import { readFileSync } from "node:fs";
import {
  compareDeployedAbi,
  ERC1967_IMPLEMENTATION_SLOT,
  erc1967ImplementationAddress,
  fetchAbi,
} from "@themoss/abi-tools";
import { monadRuntime } from "@themoss/system";
import { type Address, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { StakedMonadAbi } from "../src/abis/staked-monad.js";
import { KINTSU_STAKED_MONAD_ADDRESS } from "../src/kintsu.js";

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
    const runtime = await monadRuntime();
    const bytecode = await runtime.client.getBytecode({
      address: manifest.stakedMonad.proxy,
    });
    expect(bytecode).toBeDefined();
    expect(bytecode).not.toBe("0x");
  });

  it("StakedMonad proxy still points at the recorded implementation", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.stakedMonad.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.stakedMonad.implementation),
    );
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
