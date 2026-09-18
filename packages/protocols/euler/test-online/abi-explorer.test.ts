/**
 * Explorer cross-check for the vendored Euler ABIs (ADR 0007).
 *
 * The npm supply chain is not available here — Euler publishes no ABI package —
 * so the vendored artifacts come from one pinned euler-interfaces commit. That
 * makes an independent anchor especially important, and the explorer provides
 * one: the EVault implementation behind every vault proxy has verified source
 * on Monadscan, so its published ABI is derived from source rather than from
 * the same repository we vendored.
 *
 * Two tripwires are deliberate:
 *   - `GenericFactory.implementation()` must still equal the recorded EVault
 *     implementation. Euler upgrades vaults by repointing the factory, so a
 *     protocol upgrade turns this red and forces human re-verification instead
 *     of being silently accepted.
 *   - The vendored EVault ABI must match that implementation's explorer ABI
 *     semantically. Vault proxies themselves are NOT valid cross-check targets:
 *     Etherscan's getabi on a proxy returns the proxy's own (empty) surface.
 *
 * A missing MONADSCAN_API_KEY fails here rather than skipping; this suite is
 * never part of the offline `pnpm test`.
 */
import { readFileSync } from "node:fs";
import { compareDeployedAbi, fetchAbi } from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";
import { type Address, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  EthereumVaultConnectorAbi,
  EULER_ESCROWED_COLLATERAL_PERSPECTIVE_ADDRESS,
  EULER_EVC_ADDRESS,
  EULER_GOVERNED_PERSPECTIVE_ADDRESS,
  EULER_VAULT_FACTORY_ADDRESS,
  EVaultAbi,
  GenericFactoryAbi,
} from "../src/index.js";

interface AbiManifest {
  evc: { address: Address };
  vaultFactory: { address: Address; expectedImplementation: Address };
  perspectives: { governed: Address; escrowedCollateral: Address };
  allowedExplorerOnly: string[];
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;
const key = process.env.MONADSCAN_API_KEY;

describe("Euler ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the singletons the adapter actually uses", () => {
    expect(getAddress(manifest.evc.address)).toBe(getAddress(EULER_EVC_ADDRESS));
    expect(getAddress(manifest.vaultFactory.address)).toBe(getAddress(EULER_VAULT_FACTORY_ADDRESS));
    expect(getAddress(manifest.perspectives.governed)).toBe(
      getAddress(EULER_GOVERNED_PERSPECTIVE_ADDRESS),
    );
    expect(getAddress(manifest.perspectives.escrowedCollateral)).toBe(
      getAddress(EULER_ESCROWED_COLLATERAL_PERSPECTIVE_ADDRESS),
    );
  });

  it("factory still points at the recorded EVault implementation", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const implementation = await runtime.client.readContract({
      address: manifest.vaultFactory.address,
      abi: GenericFactoryAbi,
      functionName: "implementation",
    });
    expect(getAddress(implementation)).toBe(
      getAddress(manifest.vaultFactory.expectedImplementation),
    );
  });

  it("vendored EVault ABI matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.vaultFactory.expectedImplementation, key ?? "");
    const issues = compareDeployedAbi(EVaultAbi, explorerAbi, {
      allowedActualOnly: manifest.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });

  it("vendored Vault Connector ABI matches the explorer-verified deployment", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.evc.address, key ?? "");
    const issues = compareDeployedAbi(EthereumVaultConnectorAbi, explorerAbi, {
      allowedActualOnly: manifest.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });
});
