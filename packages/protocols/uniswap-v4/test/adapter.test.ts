import { type MossRuntime, Registry } from "@themoss/core";
import { describe, expect, it } from "vitest";
import {
  UNISWAP_V4_POOL_MANAGER_ADDRESS,
  UNISWAP_V4_QUOTER_ADDRESS,
  UniswapV4,
} from "../src/index.js";

const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

describe("Uniswap v4 Protocol skeleton", () => {
  it("registers and loads the swap capability", () => {
    const registry = new Registry(runtime).use(UniswapV4);
    const [loaded] = registry.load([{ protocol: "uniswap-v4", method: "swap" }]);
    expect(loaded?.protocol).toBe("uniswap-v4");
    expect(loaded?.method).toBe("swap");
  });

  it("registers and loads the quote query", () => {
    const registry = new Registry(runtime).use(UniswapV4);
    const [loaded] = registry.load([{ protocol: "uniswap-v4", method: "quote" }]);
    expect(loaded?.protocol).toBe("uniswap-v4");
    expect(loaded?.method).toBe("quote");
  });

  it("declares contracts with verified addresses", () => {
    // All addresses are 42-char hex strings
    expect(UNISWAP_V4_POOL_MANAGER_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(UNISWAP_V4_QUOTER_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("does not throw when creating a Registry instance", () => {
    expect(() => new Registry(runtime).use(UniswapV4)).not.toThrow();
  });
});
