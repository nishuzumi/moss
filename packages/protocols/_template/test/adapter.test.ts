import { type MossRuntime, NATIVE, type Plan, Registry } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { EXAMPLE_VAULT_ADDRESS, templateManifest } from "../src/index.js";

const ACCOUNT = "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC";

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    // biome-ignore lint/suspicious/noExplicitAny: reads unused in offline tests
    client: {} as any,
  };
  const registry = new Registry(runtime);
  registry.use(templateManifest);
  return registry;
}

describe("template adapter (offline shape)", () => {
  it("is discoverable and loads a described stub", () => {
    const registry = offlineRegistry();
    expect(registry.discover({ protocol: "template" })).toHaveLength(2);
    const [stub] = registry.load([{ protocol: "template", method: "deposit" }]);
    expect(stub?.risk).toEqual(["fundOut"]);
  });

  it("builds a plan with quantified expects", async () => {
    const registry = offlineRegistry();
    const built = (await registry.action("template", "deposit", ACCOUNT, {
      amount: "1",
    })) as Plan;
    expect(built.txs[0]?.to).toBe(EXAMPLE_VAULT_ADDRESS);
    expect(built.expects.out).toEqual([{ token: NATIVE, amountMax: (10n ** 18n).toString() }]);
    expect(built.planHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

// CHANGEME: add a live e2e that simulates your happy path on Monad mainnet
// and asserts zero warnings (free — nothing is signed or sent):
//
// describe.skipIf(!!process.env.MOSS_SKIP_E2E)("<protocol> (Monad mainnet e2e)", () => {
//   it("happy path simulates with zero warnings", { timeout: 120_000 }, async () => {
//     const runtime = monadRuntime(); // from @themoss/system
//     ...registry.use(...); const simulator = createTraceSimulator(runtime);
//     const { results } = await simulator.simulate([plan]);
//     expect(results[0]?.warnings).toEqual([]);
//   });
// });
