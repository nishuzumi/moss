/**
 * The NETWORK half of the ABI pipeline: re-vendor upstream artifacts into
 * abis-src/ (verbatim, with provenance metadata in VENDOR.json), then derive
 * src/abis/uniswap.ts via the deterministic generator in ./abis.ts.
 *
 * Version policy: DEPLOYMENT-PINNED, not dist-tags.latest. The Monad
 * Universal Router at 0x0D97Dc33264bfC1c226207428A79b26757fb9dc3 is the
 * deployment Uniswap's record lists as "Universal Router" (a separate
 * "Universal Router 2.1.1" deployment exists at another address). Its
 * deployed bytecode carries the 2.0.0 ABI surface and none of the 2.1-only
 * additions (executeSigned, eip712Domain, V4TooLittleReceivedPerHop,
 * InvalidHopSlippageLength), so the ABI is vendored from
 * @uniswap/universal-router@2.0.0, whose tarball also carries the hardhat
 * artifacts for the v4-core PoolManager and Permit2 interfaces it was built
 * against. V4Quoter comes from @uniswap/v4-periphery (single-package quoter
 * artifact; its 4-field QuoteExactSingleParams selector is verified present
 * in the deployed quoter bytecode by the live test).
 *
 * Bump the pins only when the recorded Monad deployment itself changes, and
 * re-run the live bytecode/selector test to prove the new artifacts still
 * match the chain.
 *
 * Usage: pnpm update:abis
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, type VendoredPackage, type VendorInfo } from "./abis.js";

const MIN_RELEASE_AGE_DAYS = 7;

/** Deployment-pinned upstream packages and the artifacts vendored verbatim. */
const PACKAGES: readonly { name: string; version: string; files: Record<string, string> }[] = [
  {
    name: "@uniswap/universal-router",
    version: "2.0.0",
    files: {
      "UniversalRouter.json": "artifacts/contracts/UniversalRouter.sol/UniversalRouter.json",
      "PoolManager.json": "artifacts/@uniswap/v4-core/src/PoolManager.sol/PoolManager.json",
      "IAllowanceTransfer.json":
        "artifacts/permit2/src/interfaces/IAllowanceTransfer.sol/IAllowanceTransfer.json",
    },
  },
  {
    name: "@uniswap/v4-periphery",
    version: "1.0.3",
    files: {
      "V4Quoter.json": "foundry-out/V4Quoter.sol/V4Quoter.json",
    },
  },
];

interface RegistryDoc {
  time: Record<string, string>;
  versions: Record<string, { dist: { tarball: string } }>;
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dayMs = 24 * 60 * 60 * 1000;

const vendored: VendoredPackage[] = [];
for (const spec of PACKAGES) {
  const registry = (await (
    await fetch(`https://registry.npmjs.org/${spec.name.replace("/", "%2F")}`)
  ).json()) as RegistryDoc;
  const publishedAt = Date.parse(registry.time[spec.version] ?? "");
  if (!Number.isFinite(publishedAt)) {
    throw new Error(`${spec.name}@${spec.version} does not exist on the registry`);
  }
  const ageDays = Math.floor((Date.now() - publishedAt) / dayMs);
  if (ageDays < MIN_RELEASE_AGE_DAYS) {
    throw new Error(
      `${spec.name}@${spec.version} is only ${ageDays}d old; the ${MIN_RELEASE_AGE_DAYS}d ` +
        "release-age guard refuses fresh releases even for explicit pins",
    );
  }
  const tarballUrl = registry.versions[spec.version]?.dist.tarball;
  if (!tarballUrl) throw new Error(`no tarball URL for ${spec.name}@${spec.version}`);

  const work = mkdtempSync(join(tmpdir(), "uniswap-abis-"));
  const bytes = Buffer.from(await (await fetch(tarballUrl)).arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const tarball = join(work, "pkg.tgz");
  writeFileSync(tarball, bytes);
  execSync(`tar -xzf "${tarball}" -C "${work}"`);

  mkdirSync(join(packageRoot, "abis-src"), { recursive: true });
  for (const [target, upstream] of Object.entries(spec.files)) {
    const raw = readFileSync(join(work, "package", upstream), "utf8");
    writeFileSync(join(packageRoot, "abis-src", target), raw); // verbatim
  }
  vendored.push({
    name: spec.name,
    version: spec.version,
    tarballSha256: sha256,
    files: spec.files,
  });
  console.log(
    `vendored ${spec.name}@${spec.version} (${ageDays}d old, sha256 ${sha256.slice(0, 16)}…)`,
  );
}

const vendor: VendorInfo = {
  vendoredAt: new Date().toISOString().slice(0, 10),
  releaseAgeGuardDays: MIN_RELEASE_AGE_DAYS,
  packages: vendored,
};
writeFileSync(join(packageRoot, "abis-src", "VENDOR.json"), `${JSON.stringify(vendor, null, 2)}\n`);

writeFileSync(join(packageRoot, "src/abis/uniswap.ts"), generate(packageRoot));
console.log("regenerated src/abis/uniswap.ts from abis-src/");
