import { type MossRuntime, Registry } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { defaultProtocolModules } from "../src/composition.js";

const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

describe("default MCP Protocol composition", () => {
  it("includes the Nad.fun Protocol module", () => {
    const nadfunModule = defaultProtocolModules.find((module) => "NadFun" in module);

    expect(nadfunModule).toBeDefined();
  });

  it("discovers and loads Nad.fun Query coordinates through the default composition", () => {
    const registry = new Registry(runtime).use(...defaultProtocolModules);

    const discovered = registry.discover({ protocol: "nadfun" });

    expect(discovered).toHaveLength(3);

    for (const method of ["quoteBuy", "quoteSell", "tokenStatus"]) {
      expect(discovered).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            protocol: "nadfun",
            method,
            kind: "query",
          }),
        ]),
      );
    }

    const loaded = registry.load([
      { protocol: "nadfun", method: "quoteBuy" },
      { protocol: "nadfun", method: "quoteSell" },
      { protocol: "nadfun", method: "tokenStatus" },
    ]);

    expect(loaded).toHaveLength(3);

    const buy = loaded.find((item) => item.method === "quoteBuy");
    const sell = loaded.find((item) => item.method === "quoteSell");
    const status = loaded.find((item) => item.method === "tokenStatus");

    expect(buy).toMatchObject({
      kind: "query",
      protocol: "nadfun",
      method: "quoteBuy",
      params: {
        token: { description: expect.stringContaining("buy") },
        amountIn: { description: expect.stringContaining("wei") },
      },
    });

    expect(sell).toMatchObject({
      kind: "query",
      protocol: "nadfun",
      method: "quoteSell",
      params: {
        token: { description: expect.stringContaining("sell") },
        amountIn: { description: expect.stringContaining("base units") },
      },
    });

    expect(status).toMatchObject({
      kind: "query",
      protocol: "nadfun",
      method: "tokenStatus",
      params: {
        token: { description: expect.stringContaining("launch status") },
      },
    });
  });
});
