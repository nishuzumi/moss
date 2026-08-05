/**
 * Honest degraded verification for the vendored Nad.fun Lens ABI (ADR 0007).
 *
 * Monadscan currently reports "source not verified" for the Lens address, so
 * this suite does NOT claim an explorer-verified cross-check. Instead it
 * records the real evidence chain and enforces the tripwires that would force
 * a human re-review if anything changes.
 *
 * Evidence recorded as of 2026-07-26:
 * - upstream source: Naddotfun/contract-v3-abi, commit
 *   35ca13bd26bb2a5418698b13ddcd07008eecc30a, file ILens.json;
 * - file SHA-256: 679d4f19e46f7f74aad0ac99f5beb485298caea61b0125f3b1222d4b3e87fadd;
 * - the upstream ABI is committed verbatim in abis-src/ILens.json;
 * - src/abis/lens.ts is generated deterministically from that committed input;
 * - the Lens address used by the adapter is the one published in the upstream
 *   README at the same commit: 0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea;
 * - the address has deployed bytecode on Monad mainnet;
 * - all seven Lens functions used by the adapter are present in that bytecode;
 * - the three Query methods have been exercised successfully against Monad
 *   mainnet in test-online/live-mainnet.test.ts.
 *
 * What this suite enforces:
 * - the address in abis.json still equals the adapter's NADFUN_LENS_ADDRESS;
 * - the RPC reports chain ID 143;
 * - deployed bytecode exists at the Lens address;
 * - every function required by scripts/abis.ts is reachable in the deployed
 *   bytecode (dispatcher selector search);
 * - if a MONADSCAN_API_KEY is injected, the explorer fetch honestly fails with
 *   "Contract source code not verified" instead of silently passing a
 *   non-existent verified ABI. A missing key skips this single assertion.
 */
import { readFileSync } from "node:fs";
import { fetchAbi } from "@themoss/abi-tools";
import { defaultRpcUrl } from "@themoss/core";
import {
  type Abi,
  type Address,
  createPublicClient,
  getAddress,
  http,
  toFunctionSelector,
} from "viem";
import { describe, expect, it } from "vitest";
import { REQUIRED_LENS_FUNCTIONS } from "../scripts/abis.js";
import { NadFunLensAbi } from "../src/abis/lens.js";
import { NADFUN_LENS_ADDRESS } from "../src/adapter.js";

interface AbiManifest {
  lens: { address: Address };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as AbiManifest;

const RPC_URL = defaultRpcUrl();

describe("Nad.fun Lens ABI degraded verification", () => {
  it("pins the Lens address used by the adapter", () => {
    expect(getAddress(manifest.lens.address)).toBe(getAddress(NADFUN_LENS_ADDRESS));
  });

  it("has deployed bytecode on Monad mainnet and exposes every required selector", {
    timeout: 60_000,
  }, async () => {
    const client = createPublicClient({
      transport: http(RPC_URL, {
        timeout: 30_000,
        retryCount: 2,
      }),
    });

    expect(await client.getChainId()).toBe(143);

    const code = await client.getCode({
      address: manifest.lens.address,
    });

    expect(code).toBeDefined();
    expect(code).not.toBe("0x");

    if (!code) {
      throw new Error("Lens has no deployed bytecode");
    }

    const codeLower = code.toLowerCase();

    for (const name of REQUIRED_LENS_FUNCTIONS) {
      const item = (NadFunLensAbi as Abi).find(
        (entry): entry is Extract<typeof entry, { type: "function" }> =>
          entry.type === "function" && "name" in entry && entry.name === name,
      );

      if (!item) {
        throw new Error(`required function ${name} is missing from the vendored ABI`);
      }

      const selector = toFunctionSelector(item).toLowerCase().slice(2);

      expect(
        codeLower.includes(selector),
        `deployed bytecode must contain selector for ${name} (0x${selector})`,
      ).toBe(true);
    }
  });

  it("honestly reports that Monadscan source is not verified", {
    timeout: 120_000,
  }, async () => {
    const key = process.env.MONADSCAN_API_KEY;

    if (!key) {
      // This assertion is keyed by design; skipping it does not weaken the
      // degraded verification above, which is the actual gate.
      return;
    }

    await expect(fetchAbi(manifest.lens.address, key)).rejects.toThrow(
      /Contract source code not verified/i,
    );
  });
});
