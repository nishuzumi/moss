/**
 * Online invariants for the vendored aPriori adapter.
 *
 * Requires network access to Monad mainnet and runs only via
 * `pnpm test:abi:online`. A missing MONADSCAN_API_KEY skips the optional
 * explorer probe while still enforcing the local address/bytecode checks.
 *
 * Why not full explorer ABI equality:
 * the aprMON proxy forwards to a Gnosis Safe-style implementation on
 * mainnet, so the explorer-verified ABI is the proxy wrapper rather than
 * the pure aPriori lpStaking contract. The adapter therefore vendors the
 * lpStaking ABI directly and validates it offline via
 * `encodeEventTopics`/`decodeEventLog` in `adapter.test.ts`.
 */
import { readFileSync } from "node:fs";
import {
  getAddress,
} from "viem";
import { monadRuntime } from "@themoss/system";
import { describe, expect, it } from "vitest";
import { APRMON_ADDRESS } from "../src/abis/apriori.js";

interface AbiManifest {
  aprMon: {
    proxy: `0x${string}`;
    implementation: `0x${string}`;
  };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const online = Boolean(process.env.MONADSCAN_API_KEY);

describe("aPriori mainnet invariants", () => {
  it("pins the aprMON proxy the adapter actually uses", () => {
    expect(getAddress(manifest.aprMon.proxy)).toBe(getAddress(APRMON_ADDRESS));
  });

  it("has deployed bytecode at the aprMON proxy address", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();
    expect(
      (await runtime.client.getCode({ address: manifest.aprMon.proxy }))?.length,
    ).toBeGreaterThan(2);
  });

  it("recorded implementation address has deployed bytecode on mainnet", { timeout: 60_000 }, async () => {
    const runtime = await monadRuntime();
    const code = await runtime.client.getCode({
      address: manifest.aprMon.implementation,
    });
    expect(code?.length).toBeGreaterThan(2);
  });

  it.skipIf(!online)("explorer can return verified ABI for the implementation", {
    timeout: 120_000,
  }, async () => {
    const res = await fetch(
      `https://api.etherscan.io/v2/api?chainid=10143&module=contract&action=getabi&address=${manifest.aprMon.implementation}&apikey=${encodeURIComponent(process.env.MONADSCAN_API_KEY!)}`,
    );
    const text = await res.text();
    const json = JSON.parse(text) as { status: string; message: string; result: string };
    if (json.status !== "1" || json.result === "Contract source code not verified") {
      throw new Error(`Explorer did not return verified ABI: ${text}`);
    }
    expect(json.result.length).toBeGreaterThan(100);
  });
});
