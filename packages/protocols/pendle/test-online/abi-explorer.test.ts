/**
 * Explorer cross-check for the vendored Pendle ABIs (ADR 0007).
 *
 * Online and keyed on purpose: requires MONADSCAN_API_KEY plus Monad mainnet
 * RPC and runs only via `pnpm test:abi:online`, never inside the offline
 * `pnpm test` suite. A missing key FAILS this suite instead of skipping, so a
 * misconfigured pipeline cannot stay green.
 *
 * What it enforces on the MarketFactory (a clean ERC-1967 proxy):
 * - the proxy still points at the implementation recorded in abis.json
 *   (ERC-1967 slot read) — a Pendle upgrade turns this red so a human
 *   re-verifies the ABI before trusting it again;
 * - every item of the vendored `IPMarketFactory` interface is present in the
 *   explorer-verified implementation ABI with identical calling and decoding
 *   semantics — a second supply chain, independent of the npm tarball.
 *
 * Why only missing/mismatch is asserted (not `issues == []`): the vendored ABI
 * is an interface subset, so the deployed implementation legitimately carries
 * extra functions. Those "actual-only" items are ignored; the check verifies
 * that the surface Moss depends on is faithfully deployed, and the ERC-1967
 * pin above is the tripwire for any implementation upgrade. Individually
 * justified benign drifts are recorded in abis.json (`allowedMismatches`) by
 * exact signature + detail, so any other mismatch still fails — currently only
 * `VERSION()` (vendored `pure`, deployed `view`; a read-only getter Moss never
 * calls).
 *
 * Why the Router and RouterStatic have NO explorer comparison: both are
 * Pendle's own selector-proxy (Diamond-style, selector → facet) with a zero
 * ERC-1967 slot, so `getabi` returns only the dispatcher ABI and a semantic
 * comparison of the vendored full interface fails wholesale. Covering them
 * needs facet enumeration + per-selector union comparison in `@themoss/abi-tools`,
 * tracked in nishuzumi/moss#118 and recorded in abis.json (`selectorProxies`);
 * for v1 they stay on the pinned `@pendle/core-v2` vendored derivation
 * (ADR 0007's vendored tier).
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
import { PendleMarketFactoryAbi } from "../src/abis/pendle.js";
import { PENDLE_MARKET_FACTORY_ADDRESS } from "../src/addresses.js";

interface AbiManifest {
  marketFactory: {
    proxy: Address;
    implementation: Address;
    // Documented benign drifts between the vendored interface and the deployed
    // implementation, allowed by exact signature + detail so any other drift stays red.
    allowedMismatches?: { signature: string; detail: string; reason: string }[];
  };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const key = process.env.MONADSCAN_API_KEY;

describe("Pendle ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the MarketFactory the adapter actually uses", () => {
    expect(getAddress(manifest.marketFactory.proxy)).toBe(
      getAddress(PENDLE_MARKET_FACTORY_ADDRESS),
    );
  });

  it("MarketFactory proxy still points at the recorded implementation", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.marketFactory.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.marketFactory.implementation),
    );
  });

  it("vendored MarketFactory interface is faithfully present in the explorer implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.marketFactory.implementation, key ?? "");
    const issues = compareDeployedAbi(PendleMarketFactoryAbi, explorerAbi);
    const allowed = new Set(
      (manifest.marketFactory.allowedMismatches ?? []).map((m) => `${m.signature}|${m.detail}`),
    );
    // Approach A: ignore actual-only ("unexpected") items — the vendored interface is a
    // subset of the full implementation. A missing or semantically different vendored
    // item is a real drift, except for benign differences recorded in abis.json.
    const breaking = issues.filter((issue) => {
      if (issue.kind === "unexpected") return false;
      if (issue.kind === "mismatch" && allowed.has(`${issue.signature}|${issue.detail}`)) {
        return false;
      }
      return true;
    });
    expect(breaking).toEqual([]);
  });
});
