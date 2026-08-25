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

// Mirrors the MCP layer's receiptTexts (mcp-server/src/server.ts): the ordered
// leaf `text` strings an Agent reads. Kept local so the projection contract is
// asserted without a dependency on the server package. New protocols scaffolded
// from this template should copy this helper into their own test file.
function flattenReceiptTexts(receipt: ReceiptResult): string[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.text] : flattenReceiptTexts(entry),
  );
}

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

    // Canonical Receipt text-projection lock. New protocols scaffolded from this
    // template should copy this block. Lock the exact leaf text an Agent reads
    // for each Change class in order. Raw base-unit amounts plus label or raw
    // address rendering are the accepted convention.
    const nativeText = `Native MON Transfer: 1000000000000000000 from ${ACCOUNT} to Package(Template:Vault)`;
    const depositText = `Example Deposit: 1000000000000000000 by ${ACCOUNT}`;
    expect(receipt.changes.map((entry) => (entry.kind === "change" ? entry.text : null))).toEqual([
      nativeText,
      depositText,
    ]);

    // Top-level Receipt text. This parser summarizes with its deposit line, so
    // confirm the exact string rather than assuming a joined form.
    expect(receipt.text).toBe(depositText);

    // The ordered leaf-text sequence, flattened exactly as receiptTexts projects
    // it to Agents, locks order and completeness together.
    expect(flattenReceiptTexts(receipt)).toEqual([nativeText, depositText]);
  });
});
