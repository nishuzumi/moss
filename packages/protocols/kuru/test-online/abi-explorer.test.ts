/**
 * Online ABI/deployment verification (ADR 0007), run via pnpm test:abi:online.
 * abis.json explicitly selects explorer or exact-deployment evidence. Explorer
 * mode requires a key and full ABI equality; errors never trigger a fallback.
 * The reviewed unverified deployment uses code hashes + required surfaces;
 * live quote/Receipt behavior is separately covered by the normal test suite.
 * This is not a claim of full ABI equivalence. See ../DEPLOYMENT.md.
 */

import { readFileSync } from "node:fs";
import { ERC1967_IMPLEMENTATION_SLOT, erc1967ImplementationAddress } from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";

import { type Address, getAddress, keccak256 } from "viem";
import { describe, expect, it } from "vitest";
import { type RouterVerification, verifyRouter } from "../scripts/verify-router.js";
import { KuruRouterAbi } from "../src/abis/kuru.js";
import { REVIEWED_ORDERBOOK_CODE_HASH } from "../src/deployment.js";
import { KURU_ROUTER_ADDRESS } from "../src/kuru.js";
import { requiredOrderbookSurface, requiredRouterSurface } from "../test/required-surface.js";

interface AbiManifest {
  router: RouterVerification;
  orderBook: { expectedTemplateImplementation: Address };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const key = process.env.MONADSCAN_API_KEY;

describe("Kuru ABI/deployment cross-check", () => {
  it("pins the Router the adapter actually uses", () => {
    expect(getAddress(manifest.router.proxy)).toBe(getAddress(KURU_ROUTER_ADDRESS));
  });

  it("verifies Router code and market template at the same block", {
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
    const proxyCode = await runtime.client.getCode({
      address: manifest.router.proxy,
      blockNumber,
    });
    await verifyRouter(manifest.router, { proxy: proxyCode, implementation: routerCode }, key);
  });
});
