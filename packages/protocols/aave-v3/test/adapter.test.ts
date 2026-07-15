import { type MossRuntime, Registry } from "@themoss/core";
import { describe, expect, it } from "vitest";
import { aaveV3Manifest } from "../src/index.js";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143, rpcUrl: "http://offline", client: {} as any,
  };
  const registry = new Registry(runtime);
  registry.use(aaveV3Manifest);
  return registry;
}

describe("aave-v3 adapter (offline shape)", () => {
  it("discovers supply/withdraw/borrow/repay", () => {
    const registry = offlineRegistry();
    const caps = registry.discover({ protocol: "aave-v3" });
    expect(caps.map((c) => c.method).sort()).toEqual([
      "borrow", "repay", "reserveData", "supply",
      "userAccountData", "withdraw",
    ]);
  });

  it("loads supply stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "supply" }]);
    expect(stub?.verb).toBe("supply");
    expect(stub?.risk).toContain("fundOut");
    expect(stub?.params).toHaveProperty("amount");
  });

  it("loads withdraw stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "withdraw" }]);
    expect(stub?.verb).toBe("withdraw");
  });

  it("loads borrow stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "borrow" }]);
    expect(stub?.verb).toBe("borrow");
  });

  it("loads repay stub", () => {
    const registry = offlineRegistry();
    const [stub] = registry.load([{ protocol: "aave-v3", method: "repay" }]);
    expect(stub?.verb).toBe("repay");
  });
});
