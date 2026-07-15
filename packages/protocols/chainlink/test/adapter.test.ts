import { type MossRuntime, Registry } from "@themoss/core";
import { describe, expect, it } from "vitest";

import { chainlinkManifest } from "../src/index.js";


function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 1,
    rpcUrl: "http://offline",
    // biome-ignore lint/suspicious/noExplicitAny: offline mock client
    client: {} as any,
  };

  const registry = new Registry(runtime);

  registry.use(chainlinkManifest);

  return registry;
}


describe("chainlink adapter (offline shape)", () => {

  it("is discoverable and loads price query", () => {

    const registry = offlineRegistry();

    const result = registry.discover({
      protocol: "chainlink",
    });

    expect(result.length).toBeGreaterThan(0);

  });


  it("loads latest price query", () => {

    const registry = offlineRegistry();

    const actions = registry.load([
      {
        protocol: "chainlink",
        method: "latestPrice",
      },
    ]);

    expect(actions.length).toBe(1);

  });

});