/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/*.ts purely
 * from the committed abis-src/ files. No network, no clock — same inputs, same
 * bytes. This is what makes the provenance chain enforceable: test/abis.test.ts
 * asserts each generated file === the committed file, so hand-edits to the
 * generated TS, generator edits without regeneration, and abis-src edits
 * without regeneration all fail the suite.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageRoot = join(__dirname, "..");

interface SourceSpec {
  srcFile: string;
  exportName: string;
  metadataFile: string;
}

/**
 * Full upstream ABIs are exported (ADR 0007) — the adapter's callable surface
 * is reviewed where Capabilities and Receipt parsers live, and simulation is
 * the enforcement layer.
 */
export const SOURCES: SourceSpec[] = [
  {
    srcFile: "PoolManager.json",
    exportName: "PoolManagerAbi",
    metadataFile: "V4CoreVendor.json",
  },
  {
    srcFile: "V4Quoter.json",
    exportName: "V4QuoterAbi",
    metadataFile: "V4PeripheryVendor.json",
  },
  {
    srcFile: "UniversalRouter.json",
    exportName: "UniversalRouterAbi",
    metadataFile: "Vendor.json",
  },
];

interface VendorInfo {
  name: string;
  version: string;
  tarballSha256: string;
  vendoredAt: string;
  releaseAgeGuardDays: number;
}

interface AbiEntry {
  type: string;
  name?: string;
}

/**
 * Read a source file (JSON) and extract the ABI array.
 * Tolerates both bare arrays and { abi: [...] } wrapper objects.
 */
function extractAbi(abiPath: string): AbiEntry[] {
  const raw = readFileSync(abiPath, "utf8");
  const artifact = JSON.parse(raw);
  if (Array.isArray(artifact)) return artifact;
  if (artifact.abi && Array.isArray(artifact.abi)) return artifact.abi;
  throw new Error(`Cannot find ABI array in ${abiPath}`);
}

/** The Swap event signature hash for receipt parsing. */
const SWAP_EVENT_TOPIC = "0x7a107ae252ae577c7e90822f0aa2558a54b37b19a49f1b832616f2c18991635d";

/**
 * Generate the header comment for a generated ABI file.
 * The header is the only variable part — everything after it is
 * deterministic from the source ABI JSON.
 */
function generateHeader(vendor: VendorInfo): string {
  return [
    "// GENERATED FILE — do not edit by hand.",
    `//   compile from npm tarball:  pnpm gen:abis`,
    "// ABI origin: vendored (ADR 0007)",
    `//   source:   ${vendor.name}@${vendor.version} (npm), foundry artifacts`,
    `//   tarball:  sha256 ${vendor.tarballSha256}`,
    `//   verification: contracts verified on Monad mainnet via rpc.monad.xyz;`,
    `//   the adapter's e2e tests pin observable behavior.`,
    `//   caveat:   V4 contracts are immutable once deployed (no upgrade pattern).`,
    "",
  ].join("\n");
}

/**
 * Generate the full TypeScript ABI file content from a source ABI JSON.
 * The output is byte-for-byte deterministic given the same input.
 */
function generateFile(
  exportName: string,
  vendor: VendorInfo,
  abi: AbiEntry[],
  isPoolManager: boolean,
): string {
  let output = `${generateHeader(vendor)}export const ${exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  // Append the Swap event topic constant for PoolManager ABI
  if (isPoolManager) {
    output += `\n/** Swap event signature hash for receipt parsing */\nexport const SWAP_EVENT_TOPIC = "${SWAP_EVENT_TOPIC}" as const;\n`;
  }
  return output;
}

/**
 * Generate all ABI files from their source JSON files.
 * This is called by scripts/gen-abis.ts after editing the generator logic.
 */
export function generateAll(packageRoot: string): void {
  // Mapping from export names to source file names
  const exportToSource: Record<string, { srcFile: string; metadataFile: string }> = {};
  for (const source of SOURCES) {
    exportToSource[source.exportName] = {
      srcFile: source.srcFile,
      metadataFile: source.metadataFile,
    };
  }

  for (const [exportName, { srcFile, metadataFile }] of Object.entries(exportToSource)) {
    const vendorPath = join(packageRoot, "abis-src", metadataFile);
    const vendor = JSON.parse(readFileSync(vendorPath, "utf8")) as VendorInfo;
    const abiPath = join(packageRoot, "abis-src", srcFile);
    const abi = extractAbi(abiPath);

    // Map export names to file names:
    // PoolManagerAbi → uniswap-v4.ts
    // V4QuoterAbi → v4quoter.ts
    // UniversalRouterAbi → universal-router.ts
    let fileName: string;
    const isPoolManager = exportName === "PoolManagerAbi";
    switch (exportName) {
      case "PoolManagerAbi":
        fileName = "uniswap-v4";
        break;
      case "V4QuoterAbi":
        fileName = "v4quoter";
        break;
      case "UniversalRouterAbi":
        fileName = "universal-router";
        break;
      default:
        fileName = exportName.toLowerCase().replace("abi", "");
    }
    const output = generateFile(exportName, vendor, abi, isPoolManager);
    writeFileSync(join(packageRoot, "src", "abis", `${fileName}.ts`), output);
    console.log(`generated src/abis/${fileName}.ts from ${srcFile}`);
  }
}

// Allow running this script directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAll(packageRoot);
}
