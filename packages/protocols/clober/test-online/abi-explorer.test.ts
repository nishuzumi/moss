/**
 * Explorer cross-check for the vendored Clober ABIs (ADR 0007).
 *
 * Online and keyed on purpose: requires MONADSCAN_API_KEY plus Monad mainnet
 * RPC and runs only via `pnpm test:abi:online` (its own workflow), never
 * inside the offline `pnpm test` suite. A missing key FAILS this suite
 * instead of skipping, so a misconfigured pipeline cannot stay green.
 *
 * What it enforces:
 * - the fixed addresses in code are the contracts recorded in abis.json;
 * - Controller and BookManager remain non-proxy contracts at those addresses;
 * - BookViewer proxy still points at the recorded implementation;
 * - each vendored ABI is semantically identical to the ABI of the
 *   explorer-verified deployed contract or implementation.
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
import {
  CloberBookManagerAbi,
  CloberBookViewerAbi,
  CloberControllerAbi,
} from "../src/abis/clober.js";
import {
  CLOBER_BOOK_MANAGER_ADDRESS,
  CLOBER_BOOK_VIEWER_ADDRESS,
  CLOBER_CONTROLLER_ADDRESS,
} from "../src/clober.js";

interface AbiManifest {
  controller: { address: Address; allowedExplorerOnly: string[] };
  bookManager: { address: Address; allowedExplorerOnly: string[] };
  bookViewer: { proxy: Address; implementation: Address; allowedExplorerOnly: string[] };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const key = process.env.MONADSCAN_API_KEY;

describe("Clober ABI explorer cross-check", () => {
  it("requires MONADSCAN_API_KEY", () => {
    expect(key, "MONADSCAN_API_KEY must be set for pnpm test:abi:online").toBeTruthy();
  });

  it("pins the contracts the adapter actually uses", () => {
    expect(getAddress(manifest.controller.address)).toBe(getAddress(CLOBER_CONTROLLER_ADDRESS));
    expect(getAddress(manifest.bookManager.address)).toBe(getAddress(CLOBER_BOOK_MANAGER_ADDRESS));
    expect(getAddress(manifest.bookViewer.proxy)).toBe(getAddress(CLOBER_BOOK_VIEWER_ADDRESS));
  });

  it("Controller and BookManager remain non-proxy deployed contracts", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    for (const address of [manifest.controller.address, manifest.bookManager.address]) {
      const slot = await runtime.client.getStorageAt({
        address,
        slot: ERC1967_IMPLEMENTATION_SLOT,
      });
      expect(BigInt(slot ?? "0x0")).toBe(0n);
      await expect(runtime.client.getCode({ address })).resolves.toBeTruthy();
    }
  });

  it("BookViewer proxy still points at the recorded implementation", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.bookViewer.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.bookViewer.implementation),
    );
  });

  it("vendored Controller ABI matches the explorer-verified deployed contract", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.controller.address, key ?? "");
    const issues = compareDeployedAbi(CloberControllerAbi, explorerAbi, {
      allowedActualOnly: manifest.controller.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });

  it("vendored BookManager ABI matches the explorer-verified deployed contract", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.bookManager.address, key ?? "");
    const issues = compareDeployedAbi(CloberBookManagerAbi, explorerAbi, {
      allowedActualOnly: manifest.bookManager.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });

  it("vendored BookViewer ABI matches the explorer-verified implementation", {
    timeout: 120_000,
  }, async () => {
    const explorerAbi = await fetchAbi(manifest.bookViewer.implementation, key ?? "");
    const issues = compareDeployedAbi(CloberBookViewerAbi, explorerAbi, {
      allowedActualOnly: manifest.bookViewer.allowedExplorerOnly,
    });
    expect(issues).toEqual([]);
  });
});
