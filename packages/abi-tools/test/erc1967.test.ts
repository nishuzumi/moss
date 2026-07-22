import { describe, expect, it } from "vitest";
import { ERC1967_IMPLEMENTATION_SLOT, erc1967ImplementationAddress } from "../src/erc1967.js";

const IMPLEMENTATION = "0f2a2a5c0a78c406c26adb2f1681d3e47322a9cd";

describe("erc1967ImplementationAddress", () => {
  it("extracts the lowercase address from a clean slot word", () => {
    const word = `0x${"0".repeat(24)}${IMPLEMENTATION.toUpperCase()}`;
    expect(erc1967ImplementationAddress(word)).toBe(`0x${IMPLEMENTATION}`);
  });

  it.each([
    ["undefined", undefined],
    ["a bare address", `0x${IMPLEMENTATION}`],
    ["a short word", `0x${"0".repeat(23)}${IMPLEMENTATION}`],
    ["dirty upper bytes", `0x${"1".repeat(24)}${IMPLEMENTATION}`],
    ["non-hex content", `0x${"0".repeat(24)}${"g".repeat(40)}`],
  ])("fails closed on %s", (_name, word) => {
    expect(() => erc1967ImplementationAddress(word)).toThrow(/ERC-1967/);
  });
});

describe("ERC1967_IMPLEMENTATION_SLOT", () => {
  it("is the eip1967.proxy.implementation slot", () => {
    expect(ERC1967_IMPLEMENTATION_SLOT).toBe(
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
    );
  });
});
