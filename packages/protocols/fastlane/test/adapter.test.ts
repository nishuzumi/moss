import { type Change, flattenCapabilityTree, type MossRuntime, Registry } from "@themoss/core";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ShMonadAbi } from "../src/abis/shmonad.js";
import { FASTLANE_SHMONAD_ADDRESS, FastLaneProtocol } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

describe("FastLane shMONAD protocol", () => {
  it("registers its exported Protocol directly and builds one stake transaction", async () => {
    const registry = new Registry(runtime).use(FastLaneProtocol);
    const capability = await registry.action("fastlane", "stake", ACCOUNT, { amount: "1" });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(capability.receipt).toBe("stakeReceipt");
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      to: FASTLANE_SHMONAD_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
  });

  it("parses a native transfer change into a stake receipt", async () => {
    const registry = new Registry(runtime).use(FastLaneProtocol);
    const capability = await registry.action("fastlane", "stake", ACCOUNT, { amount: "1" });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: FASTLANE_SHMONAD_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;
    const receipt = registry.parseReceipt(capability, [native]);
    expect(receipt.outcome).toEqual({
      operation: "stake",
      account: ACCOUNT,
      amount: "1000000000000000000",
    });
  });

  it("exposes the ABI so the contract interface is available to callers", () => {
    expect(ShMonadAbi).toBeDefined();
    expect(ShMonadAbi.some((item) => item.type === "function" && item.name === "deposit")).toBe(true);
  });
});
