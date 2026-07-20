/**
 * Explorer cross-check for the vendored FastLane staking ABI (ADR 0007).
 *
 * Online and keyed on purpose: requires MONADSCAN_API_KEY plus Monad mainnet
 * RPC and runs only via `pnpm test:abi:online` (its own workflow), never
 * inside the offline `pnpm test` suite. A missing key FAILS this suite
 * instead of skipping, so a misconfigured pipeline cannot stay green.
 *
 * What it enforces:
 * - the proxy address recorded in abis.json matches the adapter's constant;
 * - the staking proxy still points at the implementation recorded in
 *   abis.json (ERC-1967 slot read) — a FastLane upgrade turns this suite red
 *   so a human re-verifies the ABI before trusting it again;
 * - the vendored FastLaneStakingAbi is semantically identical to the ABI of
 *   the explorer-verified staking implementation: a second supply chain,
 *   independent of the npm tarball.
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
import { FastLaneStakingAbi } from "../src/abis/fastlane.js";
import { FASTLANE_STAKING_ADDRESS } from "../src/fastlane.js";

interface AbiManifest {
  staking: { proxy: Address; implementation: Address; allowedExplorerOnly: string[] };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const key = process.env.MONADSCAN_API_KEY;

describe("FastLane ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the staking proxy the adapter actually uses", () => {
    expect(getAddress(manifest.staking.proxy)).toBe(getAddress(FASTLANE_STAKING_ADDRESS));
  });

  it("has deployed bytecode at the staking proxy address", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();
    expect(
      (await runtime.client.getCode({ address: manifest.staking.proxy }))?.length,
    ).toBeGreaterThan(2);
  });

  it("staking proxy still points at the recorded implementation", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.staking.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.staking.implementation),
    );
  });

  it("vendored staking ABI matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.staking.implementation, key ?? "");
    const issues = compareDeployedAbi(FastLaneStakingAbi, explorerAbi, {
      allowedActualOnly: manifest.staking.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });
});
