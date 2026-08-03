/**
 * On-chain derivation checks for the vendored Beets ABIs (ADR 0007).
 *
 * The Balancer v3 Router, Vault, VaultExtension, and VaultExplorer on Monad
 * are plain (non-proxy) contracts, so there are no ERC-1967 slots to pin.
 * This suite instead enforces the derivation directly against Monad mainnet:
 *
 * - every address recorded in abis.json matches the adapter's constant;
 * - all four contracts have deployed bytecode;
 * - the VaultExplorer's getVault()/getVaultExtension() still return the
 *   Vault and VaultExtension recorded in abis.json — a Balancer re-deploy
 *   turns this suite red so a human re-verifies the vendored ABIs before
 *   trusting them again (the Router v2 ABI exposes no getVault, so the
 *   explorer is the pinned surface, exactly as the e2e suite uses it);
 * - every function selector and event topic hash the adapter actually uses,
 *   recomputed from the artifact, appears in the deployed bytecode. The
 *   artifacts declare the full shared Balancer interface (Vault and
 *   VaultExtension are one implementation split over delegatecall, and the
 *   VaultExplorer artifact carries the whole view surface), so only the used
 *   items are pinned;
 * - the VaultExplorer can still answer getPoolTokens for the live
 *   WMON/gMON pool the e2e suite quotes against.
 *
 * Requires Monad mainnet RPC; runs only via `pnpm test:abi:online`.
 * If MonadScan verifies the source, replace this with the keyed
 * fetchAbi + compareDeployedAbi cross-check used by protocol-kuru.
 */

import { readFileSync } from "node:fs";
import { createRuntime } from "@themoss/core";
import { type Address, getAddress, toEventSelector, toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import {
  BeetsRouterAbi,
  BeetsVaultAbi,
  BeetsVaultExplorerAbi,
  BeetsVaultExtensionAbi,
} from "../src/abis/beets.js";
import {
  BEETS_ROUTER_ADDRESS,
  BEETS_VAULT_ADDRESS,
  BEETS_VAULT_EXPLORER_ADDRESS,
  BEETS_VAULT_EXTENSION_ADDRESS,
} from "../src/index.js";

interface AbiManifest {
  router: { address: Address };
  vault: { address: Address };
  vaultExtension: { address: Address };
  vaultExplorer: { address: Address };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const CONTRACTS = [
  { name: "router", address: manifest.router.address, abi: BeetsRouterAbi },
  { name: "vault", address: manifest.vault.address, abi: BeetsVaultAbi },
  { name: "vaultExtension", address: manifest.vaultExtension.address, abi: BeetsVaultExtensionAbi },
  { name: "vaultExplorer", address: manifest.vaultExplorer.address, abi: BeetsVaultExplorerAbi },
] as const;

describe("Beets ABI on-chain derivation", () => {
  it("pins the contracts the adapter actually uses", () => {
    expect(getAddress(manifest.router.address)).toBe(getAddress(BEETS_ROUTER_ADDRESS));
    expect(getAddress(manifest.vault.address)).toBe(getAddress(BEETS_VAULT_ADDRESS));
    expect(getAddress(manifest.vaultExtension.address)).toBe(
      getAddress(BEETS_VAULT_EXTENSION_ADDRESS),
    );
    expect(getAddress(manifest.vaultExplorer.address)).toBe(
      getAddress(BEETS_VAULT_EXPLORER_ADDRESS),
    );
  });

  it("has deployed bytecode at all four addresses", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    for (const contract of CONTRACTS) {
      expect(
        (await runtime.client.getCode({ address: contract.address }))?.length,
        contract.name,
      ).toBeGreaterThan(2);
    }
  });

  it("Router still points at the Vault recorded in abis.json", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    // The Router v2 ABI has no getVault; the VaultExplorer is the pinned
    // surface for the Vault, exactly as the e2e suite uses it.
    const vault = (await runtime.client.readContract({
      address: manifest.vaultExplorer.address,
      abi: BeetsVaultExplorerAbi,
      functionName: "getVault",
    })) as Address;
    const vaultExtension = (await runtime.client.readContract({
      address: manifest.vaultExplorer.address,
      abi: BeetsVaultExplorerAbi,
      functionName: "getVaultExtension",
    })) as Address;
    expect(getAddress(vault)).toBe(getAddress(manifest.vault.address));
    expect(getAddress(vaultExtension)).toBe(getAddress(manifest.vaultExtension.address));
  });

  it("every selector and topic hash the adapter uses appears in the deployed bytecode", {
    timeout: 120_000,
  }, async () => {
    const runtime = await createRuntime();
    // The artifacts declare the full shared Balancer interface (Vault and
    // VaultExtension are one implementation split over delegatecall, and the
    // VaultExplorer artifact carries the whole view surface), so only the
    // items the adapter actually calls or decodes are pinned here — that is
    // the surface a re-deploy must not break.
    const used: Record<string, { functions: readonly string[]; events: readonly string[] }> = {
      router: {
        functions: [
          "swapSingleTokenExactIn",
          "swapSingleTokenExactOut",
          "addLiquidityUnbalanced",
          "removeLiquiditySingleTokenExactIn",
          "querySwapSingleTokenExactIn",
          "querySwapSingleTokenExactOut",
          "queryAddLiquidityUnbalanced",
          "queryRemoveLiquiditySingleTokenExactIn",
        ],
        events: [],
      },
      vault: { functions: [], events: ["Swap", "LiquidityAdded", "LiquidityRemoved"] },
      vaultExtension: { functions: [], events: [] },
      vaultExplorer: {
        functions: [
          "getPoolTokenInfo",
          "getStaticSwapFeePercentage",
          "getPoolTokens",
          "getVault",
          "getVaultExtension",
        ],
        events: [],
      },
    };
    for (const contract of CONTRACTS) {
      const code = await runtime.client.getCode({ address: contract.address });
      expect(code?.length ?? 0, contract.name).toBeGreaterThan(2);
      const haystack = (code ?? "0x").toLowerCase();
      const want = used[contract.name];
      if (!want) throw new Error(`no adapter-used ABI items declared for ${contract.name}`);
      for (const name of want.functions) {
        const item = contract.abi.find(
          (entry): entry is Extract<(typeof contract.abi)[number], { type: "function" }> =>
            entry.type === "function" && entry.name === name,
        );
        if (!item) throw new Error(`${contract.name} ABI lacks function ${name}`);
        const needle = toFunctionSelector(item).slice(2);
        expect(
          haystack,
          `${contract.name} function ${name} (${needle}) missing from bytecode`,
        ).toContain(needle.toLowerCase());
      }
      for (const name of want.events) {
        const item = contract.abi.find(
          (entry): entry is Extract<(typeof contract.abi)[number], { type: "event" }> =>
            entry.type === "event" && entry.name === name,
        );
        if (!item) throw new Error(`${contract.name} ABI lacks event ${name}`);
        const needle = toEventSelector(item).slice(2);
        expect(
          haystack,
          `${contract.name} event ${name} (${needle}) missing from bytecode`,
        ).toContain(needle.toLowerCase());
      }
    }
  });

  it("VaultExplorer answers getPoolTokens for the live WMON/gMON pool", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const tokens = (await runtime.client.readContract({
      address: manifest.vaultExplorer.address,
      abi: BeetsVaultExplorerAbi,
      functionName: "getPoolTokens",
      args: [getAddress("0x66b7b2389ccedF5f0F5217b7811741344b34b4fA")],
    })) as Address[];
    // Note: `.map(getAddress)` would pass the array index as viem's chainId
    // argument (EIP-1191 checksumming); wrap in a lambda instead.
    const normalized = tokens.map((token) => getAddress(token));
    expect(normalized).toContain(getAddress("0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A"));
    expect(normalized).toContain(getAddress("0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081"));
  });
});
