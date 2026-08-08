/**
 * Explorer cross-check for the vendored Aave v3 Pool ABI (ADR 0007).
 *
 * Online and keyed on purpose: requires MONADSCAN_API_KEY plus Monad mainnet
 * RPC and runs only via `pnpm test:abi:online` (its own workflow), never inside
 * the offline `pnpm test` suite. A missing key FAILS this suite instead of
 * skipping, so a misconfigured pipeline cannot stay green.
 *
 * What it enforces:
 * - `abis.json` pins the Pool proxy and implementation the adapter exports;
 * - the proxy's ERC-1967 slot still resolves to that implementation, so an Aave
 *   upgrade turns this suite red and a human re-verifies before trusting the
 *   vendored artifact again;
 * - every function the adapter calls and every event its Receipts decode is
 *   semantically identical in the ABI of the explorer-verified implementation:
 *   a second supply chain, independent of the npm tarball the address book
 *   ships.
 *
 * Why the comparison is scoped to that surface rather than the whole interface,
 * measured on 2026-08-02 against implementation 0x9539531E…85be (MonadScan,
 * Exact Match, solc 0.8.27): a whole-ABI `compareDeployedAbi` reports 27
 * differences outside it. `configureEModeCategory` takes an extra `bool`,
 * `dropReserve`, `resetIsolationModeTotalDebt` and the
 * `IsolationModeTotalDebtUpdated` event are absent, five logic getters differ
 * in `stateMutability` (`view` against `pure`), and the deployment adds
 * `POOL_REVISION`, `UMBRELLA`, `multicall`, `initialize`,
 * `configureEModeCategoryIsolated`, `getIsEModeCategoryIsolated` and eleven
 * custom errors. Those are real differences in parts of `IPool` this package
 * does not touch, and covering them with an allowlist would hide later drift
 * instead of catching it. Restricted to the used surface the comparison is
 * exact and needs no allowlist at all: 15 items on each side, zero issues.
 *
 * The reserve position tokens have no explorer comparison here. Their `Mint`
 * and `Burn` events are proven against the deployment by the live suite, which
 * decodes real Monad traces with `strict: true` on every simulated verb.
 */

import { readFileSync } from "node:fs";
import {
  compareDeployedAbi,
  ERC1967_IMPLEMENTATION_SLOT,
  erc1967ImplementationAddress,
  fetchAbi,
} from "@themoss/abi-tools";
import { createRuntime } from "@themoss/core";
import { type Abi, type Address, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { AavePoolAbi } from "../src/abis/aave.js";
import { AAVE_POOL_ADDRESS, AAVE_POOL_IMPLEMENTATION_ADDRESS } from "../src/index.js";
import { POOL_EVENTS_USED, POOL_FUNCTIONS_USED } from "../test/surface.js";

interface AbiManifest {
  pool: { proxy: Address; implementation: Address };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const key = process.env.MONADSCAN_API_KEY;

const functions: readonly string[] = POOL_FUNCTIONS_USED;
const events: readonly string[] = POOL_EVENTS_USED;

/** The items this adapter encodes or decodes, and nothing else. */
function usedSurface(abi: Abi): Abi {
  return abi.filter(
    (item) =>
      (item.type === "function" && functions.includes(item.name)) ||
      (item.type === "event" && events.includes(item.name)),
  );
}

describe("Aave ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the Pool the adapter actually uses", () => {
    expect(getAddress(manifest.pool.proxy)).toBe(getAddress(AAVE_POOL_ADDRESS));
    expect(getAddress(manifest.pool.implementation)).toBe(
      getAddress(AAVE_POOL_IMPLEMENTATION_ADDRESS),
    );
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

  it("the used Pool surface matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const expected = usedSurface(AavePoolAbi);
    // Guards the comparison against passing by comparing nothing: the vendored
    // artifact must still carry every item the adapter depends on.
    expect(expected).toHaveLength(POOL_FUNCTIONS_USED.length + POOL_EVENTS_USED.length);
    const explorerAbi = await fetchAbi(manifest.pool.implementation, key ?? "");
    expect(compareDeployedAbi(expected, usedSurface(explorerAbi))).toEqual([]);
  });
});
