/**
 * Deterministic ABI provenance pipeline for the official Nad Name Service ABI.
 * It reads only committed files and never makes a network request.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface VendorInfo {
  sourceKind: "docs";
  source: string;
  file: string;
  fileSha256: string;
  retrievedAt: string;
}

interface AbiEntry {
  type?: string;
  name?: string;
}

export const REQUIRED_FUNCTIONS = [
  "getNameAttribute",
  "getNameAttributes",
  "getNamesOfAddress",
  "getPrimaryNameForAddress",
  "getPrimaryNameForAddresses",
  "getProfileForAddress",
  "getProfilesForAddresses",
  "getResolvedAddress",
  "getResolvedAddresses",
  "setNameAttribute",
  "setNameAttributes",
] as const;

export const REQUIRED_EVENTS = ["AttributeSet", "AttributesSet"] as const;

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function readVendorInfo(packageRoot: string): VendorInfo {
  const vendor = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;

  if (vendor.sourceKind !== "docs") {
    throw new Error(`Unsupported NNS ABI source kind: ${vendor.sourceKind}`);
  }
  if (!vendor.source.startsWith("https://docs.nad.domains/")) {
    throw new Error("NNS ABI source must be the official NNS documentation site");
  }
  if (!/^[0-9a-f]{64}$/i.test(vendor.fileSha256)) {
    throw new Error("NNS ABI vendor hash must be a SHA-256 digest");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vendor.retrievedAt)) {
    throw new Error("NNS ABI retrieval date must be an ISO calendar date");
  }

  return vendor;
}

export function readAndValidateAbi(packageRoot: string, vendor: VendorInfo): readonly AbiEntry[] {
  const raw = readFileSync(join(packageRoot, "abis-src", vendor.file), "utf8");
  const actualHash = sha256(raw);
  if (actualHash !== vendor.fileSha256) {
    throw new Error(`NNS ABI hash mismatch: expected ${vendor.fileSha256}, received ${actualHash}`);
  }

  const abi = JSON.parse(raw) as readonly AbiEntry[];
  if (!Array.isArray(abi)) throw new Error("NNS ABI must be a JSON array");

  const functions = abi
    .filter((entry) => entry.type === "function")
    .map((entry) => entry.name)
    .sort();
  const expectedFunctions = [...REQUIRED_FUNCTIONS].sort();
  if (JSON.stringify(functions) !== JSON.stringify(expectedFunctions)) {
    throw new Error(`Unexpected NNS function set: ${functions.join(", ")}`);
  }

  const events = abi
    .filter((entry) => entry.type === "event")
    .map((entry) => entry.name)
    .sort();
  const expectedEvents = [...REQUIRED_EVENTS].sort();
  if (JSON.stringify(events) !== JSON.stringify(expectedEvents)) {
    throw new Error(`Unexpected NNS event set: ${events.join(", ")}`);
  }

  return abi;
}

export function generate(packageRoot: string): string {
  const vendor = readVendorInfo(packageRoot);
  const abi = readAndValidateAbi(packageRoot, vendor);

  return `// GENERATED FILE - do not edit by hand.
//   regenerate offline from abis-src/: pnpm gen:abis
// ABI origin: official Nad Name Service documentation (ADR 0007)
//   source:   ${vendor.source}
//   artifact: ${vendor.file} - verbatim in ../abis-src/
//   file:     sha256 ${vendor.fileSha256}
//   retrieved: ${vendor.retrievedAt} (UTC)

export const NadNameServiceAbi = ${JSON.stringify(abi, null, 2)} as const;
`;
}
