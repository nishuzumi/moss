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
 *   explorer-verified Router implementation: a second supply chain,
 *   independent of the npm tarball;
 * - `router.orderBookImplementation()` still equals the recorded market
 *   template.
 *
 * Why the OrderBook ABI has NO explorer comparison — verification record,
 * 2026-07-20, reproducible with the commands noted per item:
 *
 * Markets are ERC-1967 proxies running (at least) two implementations,
 * discovered via api.kuru.io candidates + `eth_getStorageAt` on slot
 * 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc:
 * - 0xea2Cc8769Fb04Ff1893Ed11cf517b7F040C823CD — source verified
 *   (https://monadscan.com/address/0xea2Cc8769Fb04Ff1893Ed11cf517b7F040C823CD,
 *   Exact Match);
 * - 0x4C0bA1BA8404076E2B09c7a5d014EC999c3a27e2 — the current
 *   `orderBookImplementation()` template, source NOT verified on Monadscan
 *   (`fetchAbi` refuses: "Contract source code not verified").
 *
 * kuru-sdk@0.0.95's OrderBook.json matches NEITHER of the two checked
 * implementations. Vs 0xea2Cc876… (via `fetchAbi` + `compareDeployedAbi`):
 * 18 vendored-only items, 16 explorer-only items, and one stateMutability
 * mismatch (`transferOwnership`: vendored payable, explorer nonpayable).
 *
 * The Moss-required surface was instead verified once by hand:
 * - `Trade`, `placeAndExecuteMarketBuy`, and `placeAndExecuteMarketSell`
 *   are field-for-field identical between the vendored ABI and the
 *   explorer ABI of 0xea2Cc876… (same comparison as above; all three are
 *   absent from every issue bucket), and
 * - present in 0x4C0bA1BA…'s deployed bytecode (`eth_getCode`, then search
 *   the hex for the dispatcher selectors and the event topic):
 *     placeAndExecuteMarketBuy(uint96,uint256,bool,bool)  = 0x7c51d6cf
 *     placeAndExecuteMarketSell(uint96,uint256,bool,bool) = 0x532c46db
 *     Trade(uint40,address,bool,uint256,uint96,address,address,uint96)
 *       topic0 = 0xf16924fba1c18c108912fcacaac7450c98eb3f2d8c0a3cdf3df7066c08f21581
 * The template assertion below is the tripwire that forces this record to
 * be redone whenever Kuru upgrades.
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
import { KuruRouterAbi } from "../src/abis/kuru.js";
import { KURU_ROUTER_ADDRESS } from "../src/kuru.js";

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

  it("Router proxy still points at the recorded implementation", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();
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
    const runtime = await monadRuntime();
    const template = await runtime.client.readContract({
      address: manifest.router.proxy,
      abi: KuruRouterAbi,
      functionName: "orderBookImplementation",
    });
    expect(getAddress(template)).toBe(
      getAddress(manifest.orderBook.expectedTemplateImplementation),
    );
  });

  it("vendored Router ABI matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.router.implementation, key ?? "");
    const issues = compareDeployedAbi(KuruRouterAbi, explorerAbi, {
      allowedActualOnly: manifest.router.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });
});
