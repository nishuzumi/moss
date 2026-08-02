/**
 * Fetch the verified complete Monad Cards ABI from the official Etherscan V2
 * endpoint for Monad mainnet and render it deterministically (ADR 0007).
 *
 * Usage: MONADSCAN_API_KEY=... pnpm update:abis
 */
import { writeFileSync } from "node:fs";
import { fetchAbi, renderAbiModule } from "@themoss/abi-tools";
import { SOURCES } from "./abis.js";

const key = process.env.MONADSCAN_API_KEY;
if (!key) {
  throw new Error(
    "MONADSCAN_API_KEY is not set; create one at https://info.monadscan.com/myapikey/ and export it.",
  );
}

const abisDir = new URL("../src/abis/", import.meta.url);
const retrievedAt = new Date();
for (const { exportName, file, address } of SOURCES) {
  const abi = await fetchAbi(address, key);
  writeFileSync(new URL(file, abisDir), renderAbiModule({ exportName, address, abi, retrievedAt }));
  console.log(`src/abis/${file}: ${abi.length} ABI entries from ${address}`);
}
