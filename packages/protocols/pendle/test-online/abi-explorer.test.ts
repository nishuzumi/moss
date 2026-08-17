/**
 * Explorer cross-check for the vendored Pendle ABIs (ADR 0007).
 *
 * Online and keyed on purpose: requires MONADSCAN_API_KEY plus Monad mainnet
 * RPC and runs only via `pnpm test:abi:online`, never inside the offline
 * `pnpm test` suite. A missing key FAILS this suite instead of skipping, so a
 * misconfigured pipeline cannot stay green.
 *
 * What it enforces:
 * - MarketFactory still points at the implementation recorded in abis.json,
 *   and its vendored interface remains present in that implementation's
 *   explorer-verified ABI;
 * - Router and RouterStatic remain the selector proxies recorded in abis.json,
 *   every vendored function selector still routes to the expected semantics in
 *   an explorer-verified facet ABI, and the fetched facet union still covers
 *   the vendored events and errors that can be established from a point-lookup
 *   registry.
 *
 * The vendored interfaces are intentionally smaller than some concrete
 * implementation/facet ABIs. Individually reviewed deployed-only items and
 * benign semantic drifts are recorded in abis.json by exact canonical
 * signature (and exact mismatch detail where applicable), so every new ABI
 * difference still fails closed.
 */

import { readFileSync } from "node:fs";
import {
  compareDeployedAbi,
  createViemEthCall,
  crossCheckSelectorProxyAbi,
  ERC1967_IMPLEMENTATION_SLOT,
  erc1967ImplementationAddress,
  fetchAbi,
} from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";
import { type Address, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { PendleMarketFactoryAbi, PendleRouterStaticAbi } from "../src/abis/pendle.js";
import { PendleRouterContractAbi } from "../src/abis/router.js";
import {
  PENDLE_MARKET_FACTORY_ADDRESS,
  PENDLE_ROUTER_ADDRESS,
  PENDLE_ROUTER_STATIC_ADDRESS,
} from "../src/addresses.js";

interface DocumentedAbiDifference {
  signature: string;
  reason: string;
}

interface SelectorProxyManifestEntry {
  address: Address;
  expectedFacets: Address[];
  allowedActualOnly?: DocumentedAbiDifference[];
  allowedMissing?: DocumentedAbiDifference[];
}

interface AbiManifest {
  marketFactory: {
    proxy: Address;
    implementation: Address;
    // Documented benign drifts between the vendored interface and the deployed
    // implementation, allowed by exact signature + detail so any other drift stays red.
    allowedMismatches?: { signature: string; detail: string; reason: string }[];
  };
  selectorProxies: {
    router: SelectorProxyManifestEntry;
    routerStatic: SelectorProxyManifestEntry;
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

  it("pins the selector proxies the adapter actually uses", () => {
    expect(getAddress(manifest.selectorProxies.router.address)).toBe(
      getAddress(PENDLE_ROUTER_ADDRESS),
    );
    expect(getAddress(manifest.selectorProxies.routerStatic.address)).toBe(
      getAddress(PENDLE_ROUTER_STATIC_ADDRESS),
    );
  });

  it("MarketFactory proxy still points at the recorded implementation", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
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

  it.each([
    ["Router", manifest.selectorProxies.router, PendleRouterContractAbi, "selectorToFacet"],
    ["RouterStatic", manifest.selectorProxies.routerStatic, PendleRouterStaticAbi, "facetAddress"],
  ] as const)(
    "%s vendored interface matches its explorer-verified selector facets",
    { timeout: 180_000 },
    async (_name, entry, vendored, source) => {
      const runtime = await createRuntime();
      const allowedActualOnly = new Set(
        (entry.allowedActualOnly ?? []).map(({ signature }) => signature),
      );
      const allowedMissing = new Set(
        (entry.allowedMissing ?? []).map(({ signature }) => signature),
      );
      const result = await crossCheckSelectorProxyAbi({
        vendored,
        proxy: entry.address,
        call: createViemEthCall(runtime.client),
        getCode: async (address) => (await runtime.client.getCode({ address })) ?? "0x",
        fetchFacetAbi: (address) => fetchAbi(address, key ?? ""),
        allowedActualOnly: [...allowedActualOnly],
      });

      const breakingRows = result.rows.filter(
        (row) =>
          row.status !== "matched" &&
          !(row.status === "unmapped" && allowedMissing.has(row.signature)),
      );
      const breakingIssues = result.issues.filter(
        (issue) => !(issue.kind === "missing" && allowedMissing.has(issue.signature)),
      );
      const observedAllowedMissing = result.rows
        .filter((row) => row.status === "unmapped" && allowedMissing.has(row.signature))
        .map(({ signature }) => signature);

      expect(result).toMatchObject({
        proxy: entry.address.toLowerCase(),
        source,
        complete: false,
        status: allowedMissing.size === 0 ? "matched" : "mismatch",
      });
      expect(new Set(result.facets.map(({ facet }) => facet))).toEqual(
        new Set(entry.expectedFacets.map((facet) => facet.toLowerCase())),
      );
      expect(result.facets.every(({ status }) => status === "verified")).toBe(true);
      expect(breakingRows).toEqual([]);
      expect(breakingIssues).toEqual([]);
      expect(new Set(observedAllowedMissing)).toEqual(allowedMissing);
    },
  );
});
