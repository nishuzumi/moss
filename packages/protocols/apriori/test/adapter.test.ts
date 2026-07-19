import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { AprioriProtocol, AprMonAbi, APRMON_ADDRESS } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

describe("AprioriProtocol", () => {
  it("registers and builds one stake transaction", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "stake", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      to: APRMON_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
  });

  it("parses Deposit event into a stake Receipt", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "stake", ACCOUNT, {
      amount: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: APRMON_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;
    const deposited = {
      kind: "event",
      address: APRMON_ADDRESS,
      topics: encodeEventTopics({
        abi: AprMonAbi,
        eventName: "Deposit",
        args: { sender: ACCOUNT, owner: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [
          { type: "uint256" },
          { type: "uint256" },
        ],
        [10n ** 18n, 995000000000000000n],
      ),
    } satisfies Change;
    const receipt = registry.parseReceipt(capability, [native, deposited]);
    expect(receipt.outcome).toEqual({
      operation: "stake",
      account: ACCOUNT,
      assets: "1000000000000000000",
      shares: "995000000000000000",
    });
  });
  it("builds a requestRedeem (unstake) transaction", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "unstake", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      to: APRMON_ADDRESS,
    });
  });

  it("parses RequestRedeem event into an unstake Receipt", async () => {
    const registry = new Registry(runtime).use(AprioriProtocol);
    const capability = await registry.action("apriori", "unstake", ACCOUNT, {
      shares: "1",
      receiver: ACCOUNT,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const requested = {
      kind: "event",
      address: APRMON_ADDRESS,
      topics: encodeEventTopics({
        abi: AprMonAbi,
        eventName: "RequestRedeem",
        args: { sender: ACCOUNT, owner: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        [10n ** 18n, 7n],
      ),
    } satisfies Change;
    const receipt = registry.parseReceipt(capability, [requested]);
    expect(receipt.outcome).toEqual({
      operation: "unstake",
      account: ACCOUNT,
      shares: "1000000000000000000",
      requestId: "7",
    });
  });
 });
