/**
 * On-chain provenance check for the vendored Kuru ABIs (ADR 0007).
 *
 * Online on purpose: it reads Monad mainnet directly and runs only via
 * `pnpm test:abi:online` (its own workflow), never inside the offline
 * `pnpm test` suite. It needs no explorer key.
 *
 * What it enforces:
 * - the Router proxy still points at the implementation recorded in
 *   abis.json (ERC-1967 slot read) — a Kuru upgrade turns this suite red so a
 *   human re-verifies before the pins are trusted again;
 * - `router.orderBookImplementation()` still equals the recorded market
 *   template;
 * - the Moss-required Router surface (the functions the adapter calls, derived
 *   from the vendored ABI) is present in the recorded implementation's deployed
 *   bytecode.
 *
 * ABI origin (ADR 0007, honest degraded verification). Neither the current
 * Router implementation nor the OrderBook market template is source-verified
 * on MonadScan, so there is no explorer-verified ABI to cross-check the
 * vendored artifact against. Per ADR 0007 the check degrades honestly: record
 * the deployed bytecode, search it for the required function selectors and
 * event topics, and exercise the adapter's live behavior on mainnet. Bytecode
 * presence is evidence of the deployed surface, not source verification, and
 * this is not an explorer-verified cross-check.
 *
 * Reproducible record, re-verified 2026-09-12 at Monad mainnet block
 * 104120573:
 *
 * Router implementation 0xf1635175914acF4Db170395D524323225e1F1a04, read from
 * the ERC-1967 slot of proxy 0xd651346d7c789536ebf06dc72aE3C8502cd695CC. The
 * Moss-required Router selectors, derived from the vendored ABI and asserted
 * against the deployed bytecode by the test below, are:
 *     anyToAnySwap             = 0xffa5210a
 *     verifiedMarket           = 0x5f71a07c
 *     orderBookImplementation  = 0xa0416499
 *
 * OrderBook market template 0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0, read
 * from `router.orderBookImplementation()`. Markets are ERC-1967 proxies and
 * this template is not source-verified either, so the same degraded record
 * applies. The Moss-required OrderBook surface, confirmed present in the
 * template's deployed bytecode (`eth_getCode`, then search the hex for the
 * dispatcher selectors and event topics):
 *     placeAndExecuteMarketBuy(uint96,uint256,bool,bool)  = 0x7c51d6cf
 *     placeAndExecuteMarketSell(uint96,uint256,bool,bool) = 0x532c46db
 *     Trade(uint40,address,bool,uint256,uint96,address,address,uint96)
 *       topic0 = 0xf16924fba1c18c108912fcacaac7450c98eb3f2d8c0a3cdf3df7066c08f21581
 *     FlipOrderUpdated(uint40,uint96)
 *       topic0 = 0xb74e966bc873b8c144fab39c9981210f50130885e89caf4556c0840cec741dcd
 *     FlippedOrderCreated(uint40,uint40,address,uint96,uint32,uint32,bool)
 *       topic0 = 0x49496a41b922bdba3ff7f57bb0992ab1a1a3ee95b5ae5bd7271c67861f018352
 *
 * When a source-verified OrderBook implementation still existed
 * (0xea2Cc8769Fb04Ff1893Ed11cf517b7F040C823CD, Exact Match), those five items
 * were field-for-field identical between the vendored ABI and that explorer
 * ABI and absent from every difference bucket, while kuru-sdk@0.0.95's
 * OrderBook.json otherwise diverged from it (18 vendored-only items, 16
 * explorer-only, and a `transferOwnership` stateMutability mismatch). No
 * source-verified OrderBook implementation is available now, so that
 * historical cross-check is recorded rather than re-run.
 *
 * The two pin assertions below are the tripwires that force this whole record
 * to be redone whenever Kuru upgrades the Router or the market template.
 */

import { readFileSync } from "node:fs";
import { ERC1967_IMPLEMENTATION_SLOT, erc1967ImplementationAddress } from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";

import { type Address, getAddress, toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { KuruRouterAbi } from "../src/abis/kuru.js";
import { KURU_ROUTER_ADDRESS } from "../src/kuru.js";

interface AbiManifest {
  router: { proxy: Address; implementation: Address };
  orderBook: { expectedTemplateImplementation: Address };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

// The Router functions the adapter actually calls (src/kuru.ts): the surface
// the deployed bytecode must expose, since the implementation is not
// source-verified and there is no explorer ABI to compare against. Full
// signatures so the selector is derived here and cross-checked against the
// vendored ABI, rather than trusting a bare hardcoded selector.
const REQUIRED_ROUTER_FUNCTIONS = [
  "anyToAnySwap(address[],bool[],bool[],address,address,uint256,uint256)",
  "verifiedMarket(address)",
  "orderBookImplementation()",
] as const;

describe("Kuru ABI on-chain provenance check", () => {
  it("pins the Router the adapter actually uses", () => {
    expect(getAddress(manifest.router.proxy)).toBe(getAddress(KURU_ROUTER_ADDRESS));
  });

  it("Router proxy still points at the recorded implementation", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.router.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.router.implementation),
    );
  });

  it("orderBookImplementation() still equals the recorded market template", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const template = await runtime.client.readContract({
      address: manifest.router.proxy,
      abi: KuruRouterAbi,
      functionName: "orderBookImplementation",
    });
    expect(getAddress(template)).toBe(
      getAddress(manifest.orderBook.expectedTemplateImplementation),
    );
  });

  it("the required Router surface is present in the implementation bytecode", {
    timeout: 120_000,
  }, async () => {
    const runtime = await createRuntime();
    const code = await runtime.client.getCode({ address: manifest.router.implementation });
    if (!code) throw new Error("no bytecode at the recorded Router implementation");
    for (const signature of REQUIRED_ROUTER_FUNCTIONS) {
      const name = signature.slice(0, signature.indexOf("("));
      expect(
        KuruRouterAbi.some((entry) => entry.type === "function" && entry.name === name),
        `${name} is missing from the vendored Router ABI`,
      ).toBe(true);
      const selector = toFunctionSelector(signature).slice(2);
      expect(
        code,
        `${signature} (0x${selector}) is missing from the Router implementation bytecode`,
      ).toContain(selector);
    }
  });
});
