import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ExampleVaultAbi } from "../src/abis/example.js";
import { EXAMPLE_VAULT_ADDRESS, ExampleProtocol } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

describe("Protocol template", () => {
  it("registers its exported Protocol directly and builds one transaction", async () => {
    const registry = new Registry(runtime).use(ExampleProtocol);
    const capability = await registry.action("template", "deposit", ACCOUNT, { amount: "1" });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      to: EXAMPLE_VAULT_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
  });

  it("parses all deposit Changes without replacing their objects", async () => {
    const registry = new Registry(runtime).use(ExampleProtocol);
    const capability = await registry.action("template", "deposit", ACCOUNT, { amount: "1" });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: EXAMPLE_VAULT_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;
    const deposited = {
      kind: "event",
      address: EXAMPLE_VAULT_ADDRESS,
      topics: encodeEventTopics({
        abi: ExampleVaultAbi,
        eventName: "Deposited",
        args: { account: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }], [10n ** 18n]),
    } satisfies Change;
    const receipt = registry.parseReceipt(capability, [native, deposited]);
    expect(receipt.outcome).toEqual({
      operation: "deposit",
      account: ACCOUNT,
      amount: "1000000000000000000",
    });
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `Native MON Transfer: 1000000000000000000 from ${ACCOUNT} to Package(Template:Vault)`,
    });
  });
});
