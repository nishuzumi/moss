/**
 * Explorer cross-check for the vendored Kuru ABIs (ADR 0007).
 *
 * Online and keyed on purpose: requires MONADSCAN_API_KEY plus Monad mainnet
 * RPC and runs only via `pnpm test:abi:online` (its own workflow), never
 * inside the offline `pnpm test` suite. A missing key FAILS this suite
 * instead of skipping, so a misconfigured pipeline cannot stay green.
 *
 * What it enforces:
 * - the Router proxy still points at the implementation recorded in
 *   abis.json (ERC-1967 slot read) — a Kuru upgrade turns this suite red so
 *   a human re-verifies the ABIs before trusting them again;
 * - the vendored Router ABI is semantically identical to the ABI of the
 *   implementation, if explorer source verification is available: a second supply chain,
 *   independent of the npm tarball;
 * - `router.orderBookImplementation()` still equals the recorded market
 *   template.
 *
 * Current deployment/state re-verification: 2026-10-12, block 112692350.
 * See ../DEPLOYMENT.md for exact addresses, runtime hash, getter/guard bytecode
 * proof, provenance limits, and reproducible RPC checks. The OrderBook remains
 * degraded verification, NOT explorer-source verified. Router semantic ABI
 * comparison below still requires a key and has not been replaced by selectors.
 */

import { readFileSync } from "node:fs";
import {
  compareDeployedAbi,
  ERC1967_IMPLEMENTATION_SLOT,
  erc1967ImplementationAddress,
  fetchAbi,
} from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";

import { type Address, getAddress, keccak256 } from "viem";
import { describe, expect, it } from "vitest";
import { KuruRouterAbi } from "../src/abis/kuru.js";
import { REVIEWED_ORDERBOOK_CODE_HASH } from "../src/deployment.js";
import { KURU_ROUTER_ADDRESS } from "../src/kuru.js";
import { requiredOrderbookSurface, requiredRouterSurface } from "../test/required-surface.js";

interface AbiManifest {
  router: { proxy: Address; implementation: Address; allowedExplorerOnly: string[] };
  orderBook: { expectedTemplateImplementation: Address };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const key = process.env.MONADSCAN_API_KEY;

describe("Kuru ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the Router the adapter actually uses", () => {
    expect(getAddress(manifest.router.proxy)).toBe(getAddress(KURU_ROUTER_ADDRESS));
  });

  it("pins Router implementation and market template at the same block", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const blockNumber = await runtime.client.getBlockNumber({ cacheTime: 0 });
    const slot = await runtime.client.getStorageAt({
      address: manifest.router.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
      blockNumber,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.router.implementation),
    );
    const template = await runtime.client.readContract({
      address: manifest.router.proxy,
      abi: KuruRouterAbi,
      functionName: "orderBookImplementation",
      blockNumber,
    });
    expect(getAddress(template)).toBe(
      getAddress(manifest.orderBook.expectedTemplateImplementation),
    );
    const orderbookCode = await runtime.client.getCode({ address: template, blockNumber });
    expect(orderbookCode).toBeDefined();
    if (!orderbookCode) throw new Error("OrderBook code missing");
    expect(keccak256(orderbookCode)).toBe(REVIEWED_ORDERBOOK_CODE_HASH);
    for (const item of requiredOrderbookSurface)
      expect(orderbookCode, item.name).toContain(item.hex);
    const routerCode = await runtime.client.getCode({
      address: manifest.router.implementation,
      blockNumber,
    });
    for (const item of requiredRouterSurface) expect(routerCode, item.name).toContain(item.hex);
  });

  it("requires a full Router ABI match against explorer-verified source", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.router.implementation, key ?? "");
    const issues = compareDeployedAbi(KuruRouterAbi, explorerAbi, {
      allowedActualOnly: manifest.router.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });
});
