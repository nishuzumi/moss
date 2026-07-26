import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface VendorInfo {
  name: string;
  source: string;
  documentation: string;
  sha256: string;
  vendoredAt: string;
}

interface AbiArtifact {
  abi?: unknown;
}

export function readVendorInfo(packageRoot: string): VendorInfo {
  const parsed = JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as Partial<VendorInfo>;
  if (
    typeof parsed.name !== "string" ||
    typeof parsed.source !== "string" ||
    typeof parsed.documentation !== "string" ||
    !/^[a-f0-9]{64}$/.test(parsed.sha256 ?? "") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(parsed.vendoredAt ?? "")
  ) {
    throw new Error("abis-src/VENDOR.json is invalid");
  }
  return parsed as VendorInfo;
}

export function generate(packageRoot: string): string {
  const vendor = readVendorInfo(packageRoot);
  const raw = readFileSync(join(packageRoot, "abis-src", "StakedMonad.json"));
  const sha256 = createHash("sha256").update(raw).digest("hex");
  if (sha256 !== vendor.sha256) {
    throw new Error(
      `StakedMonad.json sha256 mismatch: expected ${vendor.sha256}, received ${sha256}`,
    );
  }

  const artifact = JSON.parse(raw.toString("utf8")) as unknown[] | AbiArtifact;
  const abi = Array.isArray(artifact) ? artifact : artifact.abi;
  if (!Array.isArray(abi)) {
    throw new Error("StakedMonad.json does not contain an ABI array");
  }

  return `// GENERATED FILE - do not edit by hand.
//   regenerate offline: pnpm gen:abis
//   refresh upstream:   pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source: ${vendor.name}
//   artifact: ${vendor.source}
//   documentation: ${vendor.documentation}
//   sha256: ${vendor.sha256}
//   vendored: ${vendor.vendoredAt}

export const StakedMonadAbi = ${JSON.stringify(abi, null, 2)} as const;
`;
}
