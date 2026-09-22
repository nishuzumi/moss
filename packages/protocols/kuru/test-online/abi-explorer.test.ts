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
 * - the Moss-required Router and OrderBook surfaces are present in the recorded
 *   implementations' deployed bytecode, with every selector and event topic
 *   derived from the vendored ABI entry (not from a hand-typed string) and
 *   cross-checked against the documented signature, so a drift between the
 *   vendored artifact and the deployed bytecode cannot pass unnoticed.
 *
 * ABI origin (ADR 0007, honest degraded verification). Neither the current
 * Router implementation nor the OrderBook market template is source-verified on
 * MonadScan, so there is no explorer-verified ABI to cross-check the vendored
 * artifact against. Per ADR 0007 the check degrades honestly: record the
 * deployed bytecode and search it for the function selectors and event topics
 * the adapter encodes with. Bytecode presence is evidence of the deployed
 * surface, not source verification, and this is not an explorer-verified
 * cross-check.
 *
 * The third leg of ADR 0007's degraded path — exercising the adapter's live
 * behaviour on mainnet — is red right now, and this record does not claim it.
 * The MON/USDC native-swap live smoke fails with `MarketStateError()`: one of
 * the four Router-verified MON/USDC markets (0x764b4c2AF968c97b4ae95490d264c14d955129D5)
 * has rejected every `placeAndExecuteMarketSell` probe since 2026-09-08, while
 * three sibling markets on this same template still fill. The template surface
 * below is verified; the behaviour of that one market is tracked in #194 / #205,
 * not asserted here.
 *
 * Reproducible record, re-verified 2026-09-22 at the Monad mainnet block
 * recorded as `verifiedAtBlock` in abis.json (the bytecode reads below pin to
 * that block). Router implementation 0xf1635175914acF4Db170395D524323225e1F1a04,
 * read from the ERC-1967 slot of proxy 0xd651346d7c789536ebf06dc72aE3C8502cd695CC;
 * OrderBook market template 0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0, read from
 * `router.orderBookImplementation()`. Both are ERC-1967 implementations and
 * neither is source-verified, so the degraded record applies to each. The
 * selectors and topics the tests below derive from the vendored ABI and assert
 * against the deployed bytecode:
 *     Router.anyToAnySwap(address[],bool[],bool[],address,address,uint256,uint256) = 0xffa5210a
 *     Router.verifiedMarket(address)                                               = 0x5f71a07c
 *     Router.orderBookImplementation()                                             = 0xa0416499
 *     OrderBook.placeAndExecuteMarketBuy(uint96,uint256,bool,bool)                 = 0x7c51d6cf
 *     OrderBook.placeAndExecuteMarketSell(uint96,uint256,bool,bool)                = 0x532c46db
 *     OrderBook Trade(uint40,address,bool,uint256,uint96,address,address,uint96)
 *       topic0 = 0xf16924fba1c18c108912fcacaac7450c98eb3f2d8c0a3cdf3df7066c08f21581
 *     OrderBook FlipOrderUpdated(uint40,uint96)
 *       topic0 = 0xb74e966bc873b8c144fab39c9981210f50130885e89caf4556c0840cec741dcd
 *     OrderBook FlippedOrderCreated(uint40,uint40,address,uint96,uint32,uint32,bool)
 *       topic0 = 0x49496a41b922bdba3ff7f57bb0992ab1a1a3ee95b5ae5bd7271c67861f018352
 *
 * When a source-verified OrderBook implementation still existed
 * (0xea2Cc8769Fb04Ff1893Ed11cf517b7F040C823CD, Exact Match), those five items
 * were field-for-field identical between the vendored ABI and that explorer ABI
 * and absent from every difference bucket, while kuru-sdk@0.0.95's
 * OrderBook.json otherwise diverged from it (18 vendored-only items, 16
 * explorer-only, and a `transferOwnership` stateMutability mismatch). No
 * source-verified OrderBook implementation is available now, so that historical
 * cross-check is recorded rather than re-run.
 *
 * The two pin assertions below are the tripwires that force this whole record
 * to be redone whenever Kuru upgrades the Router or the market template.
 */

import { readFileSync } from "node:fs";
import { ERC1967_IMPLEMENTATION_SLOT, erc1967ImplementationAddress } from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";

import {
  type Abi,
  type AbiEvent,
  type AbiFunction,
  type Address,
  getAddress,
  toEventSelector,
  toFunctionSelector,
} from "viem";
import { describe, expect, it } from "vitest";
import { KuruOrderbookAbi, KuruRouterAbi } from "../src/abis/kuru.js";
import { KURU_ROUTER_ADDRESS } from "../src/kuru.js";

interface AbiManifest {
  verifiedAtBlock: number;
  router: { proxy: Address; implementation: Address };
  orderBook: { expectedTemplateImplementation: Address };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const verifiedAtBlock = BigInt(manifest.verifiedAtBlock);

// The Router functions the adapter actually calls (src/kuru.ts). The selector
// is derived from the vendored ABI entry below; the signature here is only the
// human-readable form the bytecode search reports and is cross-checked against
// that entry, so a parameter-list drift in the artifact cannot slip past.
const REQUIRED_ROUTER_FUNCTIONS = [
  "anyToAnySwap(address[],bool[],bool[],address,address,uint256,uint256)",
  "verifiedMarket(address)",
  "orderBookImplementation()",
] as const;

// The OrderBook functions the Capability calls and the events its Receipt
// parsers decode. Same rule: selector/topic derived from the vendored ABI entry
// and cross-checked against the documented signature.
const REQUIRED_ORDERBOOK_FUNCTIONS = [
  "placeAndExecuteMarketBuy(uint96,uint256,bool,bool)",
  "placeAndExecuteMarketSell(uint96,uint256,bool,bool)",
] as const;
const REQUIRED_ORDERBOOK_EVENTS = [
  "Trade(uint40,address,bool,uint256,uint96,address,address,uint96)",
  "FlipOrderUpdated(uint40,uint96)",
  "FlippedOrderCreated(uint40,uint40,address,uint96,uint32,uint32,bool)",
] as const;

function nameOf(signature: string): string {
  return signature.slice(0, signature.indexOf("("));
}

// The vendored ABI entry for a name, so the selector/topic is derived from the
// artifact the adapter actually encodes with rather than a hand-typed string.
// The `as const` ABIs satisfy viem's `Abi`, so no cast is needed.
function abiFunction(abi: Abi, name: string): AbiFunction {
  const entry = abi.find(
    (item): item is AbiFunction => item.type === "function" && item.name === name,
  );
  if (!entry) throw new Error(`${name} is not a function in the vendored ABI`);
  return entry;
}
function abiEvent(abi: Abi, name: string): AbiEvent {
  const entry = abi.find((item): item is AbiEvent => item.type === "event" && item.name === name);
  if (!entry) throw new Error(`${name} is not an event in the vendored ABI`);
  return entry;
}

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
    const code = await runtime.client.getCode({
      address: manifest.router.implementation,
      blockNumber: verifiedAtBlock,
    });
    if (!code) throw new Error("no bytecode at the recorded Router implementation");
    for (const signature of REQUIRED_ROUTER_FUNCTIONS) {
      const name = nameOf(signature);
      const selector = toFunctionSelector(abiFunction(KuruRouterAbi, name));
      expect(selector, `${name} in the vendored ABI no longer matches ${signature}`).toBe(
        toFunctionSelector(signature),
      );
      expect(
        code,
        `${signature} (${selector}) is missing from the Router implementation bytecode`,
      ).toContain(selector.slice(2));
    }
  });

  it("the required OrderBook surface is present in the market template bytecode", {
    timeout: 120_000,
  }, async () => {
    const runtime = await createRuntime();
    const code = await runtime.client.getCode({
      address: manifest.orderBook.expectedTemplateImplementation,
      blockNumber: verifiedAtBlock,
    });
    if (!code) throw new Error("no bytecode at the recorded OrderBook template");
    for (const signature of REQUIRED_ORDERBOOK_FUNCTIONS) {
      const name = nameOf(signature);
      const selector = toFunctionSelector(abiFunction(KuruOrderbookAbi, name));
      expect(selector, `${name} in the vendored ABI no longer matches ${signature}`).toBe(
        toFunctionSelector(signature),
      );
      expect(
        code,
        `${signature} (${selector}) is missing from the OrderBook template bytecode`,
      ).toContain(selector.slice(2));
    }
    for (const signature of REQUIRED_ORDERBOOK_EVENTS) {
      const name = nameOf(signature);
      const topic = toEventSelector(abiEvent(KuruOrderbookAbi, name));
      expect(topic, `${name} in the vendored ABI no longer matches ${signature}`).toBe(
        toEventSelector(signature),
      );
      expect(
        code,
        `${signature} (${topic}) is missing from the OrderBook template bytecode`,
      ).toContain(topic.slice(2));
    }
  });
});
