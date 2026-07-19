import { monadRuntime } from "@themoss/system";
import { describe, expect, it } from "vitest";
import {
  PENDLE_MARKET_FACTORY_ADDRESS,
  PENDLE_ROUTER_ADDRESS,
  PENDLE_ROUTER_STATIC_ADDRESS,
} from "../src/addresses.js";

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Pendle Monad deployments", () => {
  it("are contracts on chain 143", { timeout: 60_000 }, async () => {
    const { client } = await monadRuntime();
    expect(await client.getChainId()).toBe(143);

    for (const address of [
      PENDLE_MARKET_FACTORY_ADDRESS,
      PENDLE_ROUTER_ADDRESS,
      PENDLE_ROUTER_STATIC_ADDRESS,
    ]) {
      expect((await client.getCode({ address }))?.length).toBeGreaterThan(2);
    }
  });
});
