import { describe, expect, it } from "vitest";
import { renderAbiModule } from "../src/render.js";
import { ABI, ADDRESS, NOW } from "./helpers.js";

describe("renderAbiModule", () => {
  it("renders the provenance header and typed as-const export deterministically", () => {
    const options = { exportName: "wmon", address: ADDRESS, abi: ABI, retrievedAt: NOW };
    const rendered = renderAbiModule(options);

    expect(rendered).toBe(
      [
        "// ABI origin: explorer (ADR 0007)",
        `//   Source:    https://monadscan.com/address/${ADDRESS}`,
        "//   Endpoint:  Etherscan V2 (chainid=143, module=contract, action=getabi)",
        "//   Retrieved: 2026-07-19 (UTC)",
        "",
        `export const wmonAbi = ${JSON.stringify(ABI, null, 2)} as const;`,
        "",
      ].join("\n"),
    );
    expect(renderAbiModule(options)).toBe(rendered);
  });
});
