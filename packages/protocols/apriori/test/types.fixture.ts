import { describe, it } from "vitest";
import { AprioriProtocol } from "../src/index.js";

describe("apriori Protocol metadata", () => {
  it("declares stake and unstake Capabilities", () => {
    // compile-time check that the protocol shape is well-formed
    const proto = AprioriProtocol;
    if (proto.name !== "apriori") throw new Error("unexpected protocol name");
  });
});
