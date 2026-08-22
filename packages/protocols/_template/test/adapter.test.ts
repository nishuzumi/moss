import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
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

  // Text-assertion example (issue #115): lock the top-level Receipt text format
  // and the exact ordered leaf-text sequence Agents actually read (mirrors
  // mcp-server's `receiptTexts` traversal), not just one leaf via toMatchObject.
  it("locks the top-level Receipt text and the exact ordered leaf-text sequence", async () => {
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

    expect(receipt.text).toBe(`Example Deposit: 1000000000000000000 by ${ACCOUNT}`);
    expect(receiptTexts(receipt)).toEqual([
      `Native MON Transfer: 1000000000000000000 from ${ACCOUNT} to Package(Template:Vault)`,
      `Example Deposit: 1000000000000000000 by ${ACCOUNT}`,
    ]);
  });
});

/** Mirrors mcp-server's `receiptTexts`: the exact ordered leaf-text projection Agents read. */
function receiptTexts(receipt: ReceiptResult): string[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.text] : receiptTexts(entry),
  );
}
