/**
 * The DETERMINISTIC half of the ABI pipeline: derive src/abis/aave.ts and
 * src/abis/address-book.ts purely from the committed abis-src/ files +
 * VENDOR.json metadata. No network, no clock — same inputs, same bytes. This
 * is what makes the provenance chain enforceable: test/abis.test.ts asserts
 * generate() === the committed files, so hand-edits to the generated TS,
 * generator edits without regeneration, and abis-src edits without
 * regeneration all fail the suite.
 *
 * Upstream ships ESM modules rather than JSON artifacts, so the committed
 * copies keep their `dist/` layout and the generator imports them. They are
 * const data with one side-effect-only import of a shared chunk. Everything
 * those files reference is vendored beside them, chunk and source maps alike,
 * so abis-src/ is the published tree byte for byte and nothing dangles.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface VendorInfo {
  name: string;
  version: string;
  tarballSha256: string;
  vendoredAt: string;
  releaseAgeGuardDays: number;
  /**
   * sha256 of every vendored file, keyed by its path under abis-src/. The
   * tarball digest alone is only checkable by re-running `update:abis` with
   * network access; these make the upstream bytes verifiable offline, so
   * `pnpm test` catches an edited copy on its own.
   */
  files: Record<string, string>;
}

/** Reads the committed provenance record. */
export function readVendor(packageRoot: string): VendorInfo {
  return JSON.parse(
    readFileSync(join(packageRoot, "abis-src", "VENDOR.json"), "utf8"),
  ) as VendorInfo;
}

/**
 * Upstream files copied verbatim into abis-src/, keeping their published
 * layout. `chunk-2MM5EJJX.mjs` carries no ABI: the three modules below import
 * it, so it has to sit where their relative specifiers point.
 */
export const VENDORED_FILES = [
  "dist/abis/IPool.mjs",
  "dist/abis/IAToken.mjs",
  "dist/AaveV3Monad.mjs",
] as const;

/**
 * Full upstream ABIs are exported (ADR 0007). `IAToken` also carries the
 * `IScaledBalanceToken` Mint and Burn events that variable debt tokens emit,
 * and the address book publishes no separate debt-token module, so one
 * scaled-token ABI covers both sides of a position.
 */
export const ABI_SOURCES = [
  { file: "dist/abis/IPool.mjs", upstreamName: "IPool_ABI", exportName: "AavePoolAbi" },
  { file: "dist/abis/IAToken.mjs", upstreamName: "IAToken_ABI", exportName: "AaveScaledTokenAbi" },
] as const;

/** Aave's own chain id for this market. Moss v1 accepts no other value. */
const MONAD_CHAIN_ID = 143;

interface UpstreamAsset {
  decimals: number;
  UNDERLYING: string;
  A_TOKEN: string;
  V_TOKEN: string;
}

async function importVendored(packageRoot: string, file: string): Promise<Record<string, unknown>> {
  const url = pathToFileURL(join(packageRoot, "abis-src", file)).href;
  return (await import(url)) as Record<string, unknown>;
}

function vendorHeader(vendor: VendorInfo, what: string): string {
  return `// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ${what} origin: vendored (ADR 0007)
//   source:   ${vendor.name}@${vendor.version} (npm), dist/**.mjs — verbatim copies in ../../abis-src/
//   tarball:  sha256 ${vendor.tarballSha256}
//   vendored: ${vendor.vendoredAt} (release-age guard: ${vendor.releaseAgeGuardDays}d)
`;
}

export async function generate(packageRoot: string): Promise<Record<string, string>> {
  const vendor = readVendor(packageRoot);

  let abis = `${vendorHeader(vendor, "ABI")}\
//   verification: every selector and event topic the adapter uses was found in
//   the deployed Pool implementation and in the Supply/Borrow logic libraries it
//   delegates to; the live Monad suite re-checks that on every run and decodes
//   all four Pool events out of real simulated traces.
`;
  for (const source of ABI_SOURCES) {
    const module = await importVendored(packageRoot, source.file);
    const abi = module[source.upstreamName];
    if (!Array.isArray(abi)) {
      throw new Error(`${source.file}: ${source.upstreamName} is not an ABI array`);
    }
    abis += `\nexport const ${source.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  }

  const book = await importVendored(packageRoot, "dist/AaveV3Monad.mjs");
  if (book.CHAIN_ID !== MONAD_CHAIN_ID) {
    throw new Error(
      `AaveV3Monad reports chain ${String(book.CHAIN_ID)}; Moss v1 targets ${MONAD_CHAIN_ID} only`,
    );
  }
  const assets = book.ASSETS as Record<string, UpstreamAsset>;
  const record = {
    POOL: book.POOL,
    POOL_ADDRESSES_PROVIDER: book.POOL_ADDRESSES_PROVIDER,
    POOL_IMPL: book.POOL_IMPL,
    ORACLE: book.ORACLE,
    AAVE_PROTOCOL_DATA_PROVIDER: book.AAVE_PROTOCOL_DATA_PROVIDER,
    ASSETS: Object.fromEntries(
      Object.entries(assets).map(([symbol, asset]) => [
        symbol,
        {
          decimals: asset.decimals,
          UNDERLYING: asset.UNDERLYING,
          A_TOKEN: asset.A_TOKEN,
          V_TOKEN: asset.V_TOKEN,
        },
      ]),
    ),
  };

  const addressBook = `${vendorHeader(vendor, "Deployment record")}\
//   upstream: dist/AaveV3Monad.ts, the Aave DAO's own registry of the Monad
//   market. The generator refuses to emit unless it reports CHAIN_ID ${MONAD_CHAIN_ID}, and the
//   live Monad suite verifies every address on chain: deployed bytecode, the
//   provider/Pool round trip, the ERC-1967 implementation slot, and each
//   reserve's aToken, debt token, symbol and decimals.

export const AAVE_V3_MONAD = ${JSON.stringify(record, null, 2)} as const;
`;

  return { "src/abis/aave.ts": abis, "src/abis/address-book.ts": addressBook };
}
