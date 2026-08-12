/**
 * Live deployment evidence for the vendored Clober ABIs (ADR 0007).
 *
 * Monadscan reported "Contract source code not verified" for Controller,
 * BookManager, and the BookViewer implementation when checked with a valid API
 * key on 2026-07-28. This suite therefore makes no explorer-verification or
 * Controller/BookManager deployment-form claim. It records the honest fallback:
 *
 * - source ABI: @clober/v2-sdk@1.0.3, tarball SHA-256
 *   971c3819199cad74f3d5c61d62a632791dafbd2c246d1772268ed84541656de7;
 * - runtime code observed with eth_getCode at Monad block 91024325 and pinned
 *   by keccak256 for Controller, BookManager, BookViewer proxy, and its
 *   ERC-1967 implementation;
 * - Moss-required surface checked against the vendored ABI and runtime code:
 *     spend((uint192,uint256,uint256,uint256,bytes)[],address[],
 *       (address,uint256,(uint256,uint8,bytes32,bytes32))[],uint64) = 0xc0e8e89a
 *     bookManager() = 0x3f322bc9
 *     getBookKey(uint192) = 0x9b22917d
 *     getExpectedOutput((uint192,uint256,uint256,uint256,bytes)) = 0x0202121a
 *     Take(uint192,address,int24,uint64) topic0 =
 *       0xc4c20b9c4a5ada3b01b7a391a08dd81a1be01dd8ef63170dd9da44ecee3db11b
 * - BookViewer's ERC-1967 implementation and both bookManager() relationships
 *   are live tripwires. The normal live quote/simulation tests exercise output
 *   decoding, event indexed layout, settlement behavior, and both directions.
 *
 * Selector/topic presence alone does not prove ABI layout or behavior. Any new
 * Handle method or decoded event must extend this record and its live coverage.
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
  type Hex,
  keccak256,
  toEventSelector,
  toFunctionSelector,
} from "viem";
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

interface DeploymentEvidence {
  address: Address;
  runtimeCodeKeccak256: Hex;
  requiredSelectors: Record<string, Hex>;
}

interface AbiManifest {
  recordedAtBlock: string;
  vendor: { package: string; version: string; tarballSha256: string };
  controller: DeploymentEvidence;
  bookManager: DeploymentEvidence & { requiredTopics: Record<string, Hex> };
  bookViewer: {
    proxy: Address;
    proxyRuntimeCodeKeccak256: Hex;
    implementation: Address;
    implementationRuntimeCodeKeccak256: Hex;
    requiredSelectors: Record<string, Hex>;
  };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

describe("Clober ABI deployment evidence", () => {
  it("pins the vendored source and contracts the adapter actually uses", () => {
    expect(manifest).toMatchObject({
      recordedAtBlock: "91024325",
      vendor: {
        package: "@clober/v2-sdk",
        version: "1.0.3",
        tarballSha256: "971c3819199cad74f3d5c61d62a632791dafbd2c246d1772268ed84541656de7",
      },
    });
    expect(getAddress(manifest.controller.address)).toBe(getAddress(CLOBER_CONTROLLER_ADDRESS));
    expect(getAddress(manifest.bookManager.address)).toBe(getAddress(CLOBER_BOOK_MANAGER_ADDRESS));
    expect(getAddress(manifest.bookViewer.proxy)).toBe(getAddress(CLOBER_BOOK_VIEWER_ADDRESS));
  });

  it("pins non-empty runtime code and the manually verified required surface", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const controllerCode = await requireRuntimeCode(
      runtime,
      manifest.controller.address,
      manifest.controller.runtimeCodeKeccak256,
    );
    const bookManagerCode = await requireRuntimeCode(
      runtime,
      manifest.bookManager.address,
      manifest.bookManager.runtimeCodeKeccak256,
    );
    const viewerProxyCode = await requireRuntimeCode(
      runtime,
      manifest.bookViewer.proxy,
      manifest.bookViewer.proxyRuntimeCodeKeccak256,
    );
    const viewerImplementationCode = await requireRuntimeCode(
      runtime,
      manifest.bookViewer.implementation,
      manifest.bookViewer.implementationRuntimeCodeKeccak256,
    );

    expect(viewerProxyCode.length).toBeGreaterThan(2);
    expectFunctionSurface(
      CloberControllerAbi,
      "spend",
      manifest.controller.requiredSelectors.spend,
      controllerCode,
    );
    expectFunctionSurface(
      CloberControllerAbi,
      "bookManager",
      manifest.controller.requiredSelectors.bookManager,
      controllerCode,
    );
    expectFunctionSurface(
      CloberBookManagerAbi,
      "getBookKey",
      manifest.bookManager.requiredSelectors.getBookKey,
      bookManagerCode,
    );
    expectEventSurface(
      CloberBookManagerAbi,
      "Take",
      manifest.bookManager.requiredTopics.Take,
      bookManagerCode,
    );
    expectFunctionSurface(
      CloberBookViewerAbi,
      "getExpectedOutput",
      manifest.bookViewer.requiredSelectors.getExpectedOutput,
      viewerImplementationCode,
    );
    expectFunctionSurface(
      CloberBookViewerAbi,
      "bookManager",
      manifest.bookViewer.requiredSelectors.bookManager,
      viewerImplementationCode,
    );
  });

  it("BookViewer still uses the recorded deployed implementation", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const slot = await runtime.client.getStorageAt({
      address: manifest.bookViewer.proxy,
      slot: ERC1967_IMPLEMENTATION_SLOT,
    });
    expect(getAddress(erc1967ImplementationAddress(slot))).toBe(
      getAddress(manifest.bookViewer.implementation),
    );
    await requireRuntimeCode(
      runtime,
      manifest.bookViewer.implementation,
      manifest.bookViewer.implementationRuntimeCodeKeccak256,
    );
  });

  it("Controller and BookViewer still point to the recorded BookManager", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const [controllerBookManager, viewerBookManager] = await Promise.all([
      runtime.client.readContract({
        address: manifest.controller.address,
        abi: CloberControllerAbi,
        functionName: "bookManager",
      }),
      runtime.client.readContract({
        address: manifest.bookViewer.proxy,
        abi: CloberBookViewerAbi,
        functionName: "bookManager",
      }),
    ]);
    expect(getAddress(controllerBookManager)).toBe(getAddress(manifest.bookManager.address));
    expect(getAddress(viewerBookManager)).toBe(getAddress(manifest.bookManager.address));
  });
});

async function requireRuntimeCode(
  runtime: Awaited<ReturnType<typeof createRuntime>>,
  address: Address,
  expectedKeccak256: Hex,
): Promise<Hex> {
  const code = await runtime.client.getCode({ address });
  expect(code, `${address} must have deployed runtime code`).toBeDefined();
  expect(code, `${address} must have non-empty runtime code`).not.toBe("0x");
  if (!code || code === "0x") throw new Error(`${address} has no runtime code`);
  expect(keccak256(code)).toBe(expectedKeccak256);
  return code;
}

function expectFunctionSurface(
  abi: Abi,
  name: string,
  expectedSelector: Hex | undefined,
  code: Hex,
): void {
  if (!expectedSelector) throw new Error(`missing recorded selector for ${name}`);
  const item = abi.find(
    (candidate): candidate is AbiFunction =>
      candidate.type === "function" && candidate.name === name,
  );
  if (!item) throw new Error(`vendored ABI is missing function ${name}`);
  expect(toFunctionSelector(item)).toBe(expectedSelector);
  expect(code.toLowerCase()).toContain(expectedSelector.slice(2).toLowerCase());
}

function expectEventSurface(
  abi: Abi,
  name: string,
  expectedTopic: Hex | undefined,
  code: Hex,
): void {
  if (!expectedTopic) throw new Error(`missing recorded topic for ${name}`);
  const item = abi.find(
    (candidate): candidate is AbiEvent => candidate.type === "event" && candidate.name === name,
  );
  if (!item) throw new Error(`vendored ABI is missing event ${name}`);
  expect(toEventSelector(item)).toBe(expectedTopic);
  expect(code.toLowerCase()).toContain(expectedTopic.slice(2).toLowerCase());
}
