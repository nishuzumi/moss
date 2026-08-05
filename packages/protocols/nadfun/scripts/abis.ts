/**
 * Deterministic half of the Nad.fun ABI provenance pipeline.
 *
 * This module performs no network requests and reads no clock. The committed
 * generated TypeScript must always be reproducible byte-for-byte from:
 *
 * - abis-src/ILens.json
 * - abis-src/VENDOR.json
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface VendorInfo {
  sourceKind: "git";
  repository: string;
  commit: string;
  file: string;
  fileSha256: string;
  vendoredAt: string;
}

interface AbiEntry {
  type?: string;
  name?: string;
}

export const REQUIRED_LENS_FUNCTIONS = [
  "availableBuyTokens",
  "getAmountIn",
  "getAmountOut",
  "getInitialBuyAmountOut",
  "getProgress",
  "isGraduated",
  "isLocked",
] as const;

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function readVendorInfo(packageRoot: string): VendorInfo {
  const path = join(packageRoot, "abis-src", "VENDOR.json");

  const vendor = JSON.parse(readFileSync(path, "utf8")) as VendorInfo;

  if (vendor.sourceKind !== "git") {
    throw new Error(`Unsupported Nad.fun ABI source kind: ${vendor.sourceKind}`);
  }

  if (!/^[0-9a-f]{40}$/i.test(vendor.commit)) {
    throw new Error("Nad.fun ABI vendor commit must be a full 40-character Git commit");
  }

  if (!/^[0-9a-f]{64}$/i.test(vendor.fileSha256)) {
    throw new Error("Nad.fun ABI vendor hash must be a SHA-256 digest");
  }

  return vendor;
}

export function readAndValidateLensAbi(
  packageRoot: string,
  vendor: VendorInfo,
): readonly AbiEntry[] {
  const path = join(packageRoot, "abis-src", vendor.file);

  const raw = readFileSync(path, "utf8");
  const actualHash = sha256(raw);

  if (actualHash !== vendor.fileSha256) {
    throw new Error(
      `Nad.fun Lens ABI hash mismatch: expected ${vendor.fileSha256}, received ${actualHash}`,
    );
  }

  const abi = JSON.parse(raw) as readonly AbiEntry[];

  if (!Array.isArray(abi)) {
    throw new Error("Nad.fun Lens ABI must be a JSON array");
  }

  const functions = abi
    .filter((entry) => entry.type === "function")
    .map((entry) => entry.name)
    .sort();

  const expected = [...REQUIRED_LENS_FUNCTIONS].sort();

  if (JSON.stringify(functions) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected Nad.fun Lens function set: ${functions.join(", ")}`);
  }

  return abi;
}

export function generate(packageRoot: string): string {
  const vendor = readVendorInfo(packageRoot);
  const abi = readAndValidateLensAbi(packageRoot, vendor);

  const sourceUrl =
    vendor.repository.replace(/\.git$/, "").replace("https://github.com/", "https://github.com/") +
    `/blob/${vendor.commit}/${vendor.file}`;

  return `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source:   ${vendor.repository}@${vendor.commit}, ${vendor.file} — verbatim in ../../abis-src/
//   URL:      ${sourceUrl}
//   file:     sha256 ${vendor.fileSha256}
//   vendored: ${vendor.vendoredAt}
//   verification: all Query methods are exercised live on Monad mainnet;
//   the Lens deployment is checked for deployed bytecode; every required
//   function selector is searched in that bytecode. Monadscan does not
//   currently report a verified source for this contract, so the keyed
//   \`pnpm test:abi:online\` suite performs an honest degraded verification
//   and expects explorer fetch to fail with "Contract source code not
//   verified" rather than inventing an independent anchor.

export const NadFunLensAbi = ${JSON.stringify(abi, null, 2)} as const;
`;
}
