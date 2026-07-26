import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, readVendorInfo } from "./abis.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = readVendorInfo(packageRoot);
const response = await fetch(vendor.source);
if (!response.ok) {
  throw new Error(`failed to fetch Kintsu ABI: HTTP ${response.status}`);
}

const raw = Buffer.from(await response.arrayBuffer());
JSON.parse(raw.toString("utf8"));
const updated = {
  ...vendor,
  sha256: createHash("sha256").update(raw).digest("hex"),
  vendoredAt: new Date().toISOString().slice(0, 10),
};

writeFileSync(join(packageRoot, "abis-src", "StakedMonad.json"), raw);
writeFileSync(
  join(packageRoot, "abis-src", "VENDOR.json"),
  `${JSON.stringify(updated, null, 2)}\n`,
);
writeFileSync(join(packageRoot, "src", "abis", "staked-monad.ts"), generate(packageRoot));

const artifact = JSON.parse(
  readFileSync(join(packageRoot, "abis-src", "StakedMonad.json"), "utf8"),
) as { abi?: unknown[] };
console.log(`vendored ${artifact.abi?.length ?? 0} StakedMonad ABI entries`);
