import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { type RenderAbiModuleOptions, renderAbiModule } from "@themoss/abi-tools";
import { toEventSelector, toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { DISTRIBUTOR_ABI_SOURCE } from "../scripts/abis.js";
import { distributorAbi } from "../src/abis/distributor.js";
import { MERKL_DISTRIBUTOR_ADDRESS, MERKL_DISTRIBUTOR_IMPLEMENTATION } from "../src/adapter.js";

interface Manifest {
  distributor: { proxy: string; implementation: string };
}

const manifest = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
) as Manifest;

describe("Merkl explorer ABI derivation", () => {
  it("is byte-exact renderer output from the recorded explorer source", () => {
    const committed = readFileSync(new URL("../src/abis/distributor.ts", import.meta.url), "utf8");
    const retrieved = /^\/\/ {3}Retrieved: (\d{4}-\d{2}-\d{2}) \(UTC\)$/m.exec(committed)?.[1];
    const literal = /^export const \w+Abi = (\[[\s\S]*\]) as const;$/m.exec(committed)?.[1];
    expect(retrieved).toBeDefined();
    expect(literal).toBeDefined();
    const abi = JSON.parse(literal as string) as RenderAbiModuleOptions["abi"];
    expect(createHash("sha256").update(JSON.stringify(abi)).digest("hex")).toBe(
      DISTRIBUTOR_ABI_SOURCE.abiSha256,
    );
    expect(committed).toBe(
      renderAbiModule({
        exportName: DISTRIBUTOR_ABI_SOURCE.exportName,
        address: DISTRIBUTOR_ABI_SOURCE.address,
        abi,
        retrievedAt: new Date(`${retrieved}T00:00:00Z`),
      }),
    );
  });

  it("pins the protocol proxy and explorer-verified implementation", () => {
    expect(manifest.distributor.proxy).toBe(MERKL_DISTRIBUTOR_ADDRESS);
    expect(manifest.distributor.implementation).toBe(MERKL_DISTRIBUTOR_IMPLEMENTATION);
    expect(DISTRIBUTOR_ABI_SOURCE.address).toBe(MERKL_DISTRIBUTOR_IMPLEMENTATION);
  });

  it("contains the complete required deployed claim surface", () => {
    for (const functionName of ["claim", "getMerkleRoot", "claimed", "claimRecipient"]) {
      const item = distributorAbi.find(
        (entry) => entry.type === "function" && "name" in entry && entry.name === functionName,
      );
      expect(item, `missing ${functionName}`).toBeDefined();
      expect(
        toFunctionSelector(item as Extract<(typeof distributorAbi)[number], { type: "function" }>),
      ).toMatch(/^0x[0-9a-f]{8}$/);
    }
    const claimed = distributorAbi.find(
      (entry) => entry.type === "event" && "name" in entry && entry.name === "Claimed",
    );
    expect(
      toEventSelector(claimed as Extract<(typeof distributorAbi)[number], { type: "event" }>),
    ).toBe("0xf7a40077ff7a04c7e61f6f26fb13774259ddf1b6bce9ecf26a8276cdd3992683");
    expect(distributorAbi).toHaveLength(73);
  });
});
