/**
 * Explorer cross-check for the vendored Neverland ABIs (ADR 0007).
 *
 * Online and keyed on purpose: requires MONADSCAN_API_KEY plus Monad mainnet
 * RPC and runs only via `pnpm test:abi:online` (its own workflow), never
 * inside the offline `pnpm test` suite. A missing key FAILS this suite
 * instead of skipping, so a misconfigured pipeline cannot stay green.
 *
 * What it enforces:
 * - the Pool transparent proxy still points at the implementation recorded in
 *   abis.json (ERC-1967 slot read) — a Neverland upgrade turns this suite red
 *   so a human re-verifies the ABIs before trusting them again;
 * - the vendored Aave V3 IPool ABI is semantically identical to the ABI of
 *   the explorer-verified Pool implementation: a second supply chain,
 *   independent of the npm tarballs. The Pool contract's own non-interface
 *   surface (POOL_REVISION, initialize) is individually allowlisted;
 * - the vendored IWrappedTokenGatewayV3 ABI likewise matches the
 *   explorer-verified gateway (not a proxy), with the concrete contract's
 *   ownable/emergency/fallback surface individually allowlisted.
 *
 * The PriceObserved ABI is Neverland-only and extracted from the pinned
 * PriceEmitter.sol; its live behavior is pinned by the adapter's e2e tests,
 * which require the event on real nToken/debt-token actions.
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
import { NeverlandPoolAbi, WrappedTokenGatewayAbi } from "../src/abis/neverland.js";
import { NEVERLAND_GATEWAY_ADDRESS, NEVERLAND_POOL_ADDRESS } from "../src/neverland.js";

interface AbiManifest {
  pool: { proxy: Address; implementation: Address; allowedExplorerOnly: string[] };
  gateway: { address: Address; allowedExplorerOnly: string[] };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const key = process.env.MONADSCAN_API_KEY;

describe("Neverland ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the Pool and gateway the adapter actually uses", () => {
    expect(getAddress(manifest.pool.proxy)).toBe(getAddress(NEVERLAND_POOL_ADDRESS));
    expect(getAddress(manifest.gateway.address)).toBe(getAddress(NEVERLAND_GATEWAY_ADDRESS));
  });

  it("Pool proxy still points at the recorded implementation", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.pool.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.pool.implementation),
    );
  });

  it("vendored Pool ABI matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.pool.implementation, key ?? "");
    const issues = compareDeployedAbi(NeverlandPoolAbi, explorerAbi, {
      allowedActualOnly: manifest.pool.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });

  it("vendored gateway ABI matches the explorer-verified gateway", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.gateway.address, key ?? "");
    const issues = compareDeployedAbi(WrappedTokenGatewayAbi, explorerAbi, {
      allowedActualOnly: manifest.gateway.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });
});
