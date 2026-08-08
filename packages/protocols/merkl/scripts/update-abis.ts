import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fetchAbi, renderAbiModule } from "@themoss/abi-tools";
import { DISTRIBUTOR_ABI_SOURCE } from "./abis.js";

const key = process.env.MONADSCAN_API_KEY;
if (!key) {
  throw new Error(
    "MONADSCAN_API_KEY is not set; create one at https://info.monadscan.com/myapikey/ and export it.",
  );
}

const abi = await fetchAbi(DISTRIBUTOR_ABI_SOURCE.address, key);
const digest = createHash("sha256").update(JSON.stringify(abi)).digest("hex");
if (digest !== DISTRIBUTOR_ABI_SOURCE.abiSha256) {
  throw new Error(
    `Explorer ABI changed: expected sha256 ${DISTRIBUTOR_ABI_SOURCE.abiSha256}, received ${digest}; review the full deployed implementation ABI and update the recorded digest intentionally`,
  );
}
writeFileSync(
  new URL(`../src/abis/${DISTRIBUTOR_ABI_SOURCE.file}`, import.meta.url),
  renderAbiModule({
    exportName: DISTRIBUTOR_ABI_SOURCE.exportName,
    address: DISTRIBUTOR_ABI_SOURCE.address,
    abi,
    retrievedAt: new Date(),
  }),
);
console.log(`src/abis/${DISTRIBUTOR_ABI_SOURCE.file}: ${abi.length} ABI entries`);
