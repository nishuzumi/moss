import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ParseError, parse, printParseErrorCode } from "jsonc-parser";

interface SourceInfo {
  file: string;
  url: string;
  fileSha256: string;
}

interface AbiSource extends SourceInfo {
  sourceKind: "npm";
  package: string;
  version: string;
  packageIntegrity: string;
  tarballSha256: string;
  upstreamPath: string;
}

interface DeploymentSource extends SourceInfo {
  sourceKind: "git";
  repository: string;
  commit: string;
  blob: string;
  upstreamPath: string;
}

export interface VendorManifest {
  abi: AbiSource;
  deployment: DeploymentSource;
  vendoredAt: string;
}

interface AbiEntry {
  type?: string;
  name?: string;
}

interface PythRegistry {
  name?: string;
  addresses?: {
    PriceFeed?: string;
  };
  info?: {
    feedIds?: Record<string, string>;
  };
}

export const REQUIRED_PYTH_FUNCTIONS = [
  "getEmaPriceNoOlderThan",
  "getEmaPriceUnsafe",
  "getPriceNoOlderThan",
  "getPriceUnsafe",
  "getTwapUpdateFee",
  "getUpdateFee",
  "parsePriceFeedUpdates",
  "parsePriceFeedUpdatesUnique",
  "parsePriceFeedUpdatesWithConfig",
  "parseTwapPriceFeedUpdates",
  "updatePriceFeeds",
  "updatePriceFeedsIfNecessary",
] as const;

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function readManifest(packageRoot: string): VendorManifest {
  const manifest = JSON.parse(
    readFileSync(join(packageRoot, "sources", "VENDOR.json"), "utf8"),
  ) as VendorManifest;

  if (manifest.abi.sourceKind !== "npm") {
    throw new Error(`Unsupported Pyth ABI source kind: ${manifest.abi.sourceKind}`);
  }
  if (manifest.deployment.sourceKind !== "git") {
    throw new Error(`Unsupported Pyth deployment source kind: ${manifest.deployment.sourceKind}`);
  }
  if (!/^[0-9a-f]{40}$/i.test(manifest.deployment.commit)) {
    throw new Error("Pyth deployment source must pin a full 40-character Git commit");
  }
  if (!/^[0-9a-f]{40}$/i.test(manifest.deployment.blob)) {
    throw new Error("Pyth deployment source must pin a full 40-character Git blob");
  }
  for (const source of [manifest.abi, manifest.deployment]) {
    if (!/^[0-9a-f]{64}$/i.test(source.fileSha256)) {
      throw new Error(`Pyth source hash must be SHA-256: ${source.file}`);
    }
  }

  return manifest;
}

function readVerifiedSource(packageRoot: string, source: SourceInfo): string {
  const raw = readFileSync(join(packageRoot, source.file), "utf8");
  const actualHash = sha256(raw);
  if (actualHash !== source.fileSha256) {
    throw new Error(
      `Pyth source hash mismatch for ${source.file}: expected ${source.fileSha256}, received ${actualHash}`,
    );
  }
  return raw;
}

function readAbi(packageRoot: string, manifest: VendorManifest): readonly AbiEntry[] {
  const raw = readVerifiedSource(packageRoot, manifest.abi);
  const abi = JSON.parse(raw) as readonly AbiEntry[];
  if (!Array.isArray(abi)) {
    throw new Error("Pyth IPyth ABI must be a JSON array");
  }

  const functions = abi
    .filter((entry) => entry.type === "function")
    .map((entry) => entry.name)
    .sort();
  const expected = [...REQUIRED_PYTH_FUNCTIONS].sort();
  if (JSON.stringify(functions) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected IPyth function set: ${functions.join(", ")}`);
  }

  return abi;
}

function readRegistry(packageRoot: string, manifest: VendorManifest) {
  const raw = readVerifiedSource(packageRoot, manifest.deployment);
  const errors: ParseError[] = [];
  const registry = parse(raw, errors, {
    allowTrailingComma: false,
    disallowComments: false,
  }) as PythRegistry;
  if (errors.length > 0) {
    throw new Error(
      `Invalid Monad Pyth registry JSONC: ${errors
        .map((error) => printParseErrorCode(error.error))
        .join(", ")}`,
    );
  }
  if (registry.name !== "Pyth") {
    throw new Error(`Unexpected Monad registry entry: ${registry.name ?? "missing name"}`);
  }

  const address = registry.addresses?.PriceFeed;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("Monad Pyth registry is missing a valid PriceFeed address");
  }

  const feeds = registry.info?.feedIds;
  if (!feeds || Object.keys(feeds).length !== 60) {
    throw new Error(`Expected 60 Monad Pyth feeds, received ${Object.keys(feeds ?? {}).length}`);
  }
  for (const [name, id] of Object.entries(feeds)) {
    if (!/^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(name)) {
      throw new Error(`Invalid Pyth feed name: ${name}`);
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(id)) {
      throw new Error(`Invalid Pyth feed id for ${name}: ${id}`);
    }
  }

  return { address, feeds };
}

function generatedHeader(manifest: VendorManifest): string {
  return `// GENERATED FILE - do not edit by hand.
//   regenerate offline from sources/:  pnpm gen:sources
//   re-vendor pinned upstream files:    pnpm update:sources
// ABI origin: vendored (ADR 0007)
//   ABI: @pythnetwork/pyth-sdk-solidity@${manifest.abi.version}/${manifest.abi.upstreamPath}
//   deployment: ${manifest.deployment.repository}@${manifest.deployment.commit}/${manifest.deployment.upstreamPath}
//   vendored: ${manifest.vendoredAt}
`;
}

export function generateAbi(packageRoot: string): string {
  const manifest = readManifest(packageRoot);
  const abi = readAbi(packageRoot, manifest);
  return `${generatedHeader(manifest)}
export const PythAbi = ${JSON.stringify(abi, null, 2)} as const;
`;
}

export function generateFeeds(packageRoot: string): string {
  const manifest = readManifest(packageRoot);
  const { address, feeds } = readRegistry(packageRoot, manifest);
  const names = Object.keys(feeds);
  const feedEntries = Object.entries(feeds)
    .map(([name, id]) => `  ${name}: ${JSON.stringify(id)},`)
    .join("\n");
  const feedNames = names.map((name) => `  ${JSON.stringify(name)},`).join("\n");

  return `${generatedHeader(manifest)}
export const PYTH_PRICE_FEED_ADDRESS = ${JSON.stringify(address)} as const;

export const PYTH_FEEDS = {
${feedEntries}
} as const;

export const PYTH_FEED_NAMES = [
${feedNames}
] as const;

export type PythFeedName = keyof typeof PYTH_FEEDS;
export type PythFeedId = (typeof PYTH_FEEDS)[PythFeedName];
`;
}
