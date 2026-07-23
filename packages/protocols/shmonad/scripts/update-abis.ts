/**
 * The NETWORK half of the ABI pipeline (ADR 0007 "explorer" tier): fetch each
 * verified ABI in SOURCES from the official Etherscan V2 endpoint for Monad
 * mainnet (chainid=143) and rewrite src/abis/ deterministically via
 * @themoss/abi-tools. test/abis.test.ts pins the committed modules to this
 * renderer's exact output.
 *
 * shMONAD is a proxy: SOURCES records the verified implementation address, so
 * this fetches the ERC-4626 staking ABI rather than the proxy's own surface.
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
