import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  NATIVE,
  Registry,
} from "@themoss/core";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ierc20Abi } from "../src/abis/erc.js";
import { ERC20 } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const TOKEN = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";
const SPENDER = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB";

function registryWithDecimals(decimals = 6) {
  const runtime: MossRuntime = {
    rpcUrl: "http://offline",
    client: {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "decimals") return decimals;
        throw new Error(`unexpected read ${functionName}`);
      },
    } as unknown as MossRuntime["client"],
  };
  return new Registry(runtime).use(ERC20);
}

describe("ERC20", () => {
  it("builds address-based transfers and approvals from the direct Protocol export", async () => {
    const registry = registryWithDecimals();
    const transfer = await registry.action("erc20", "transfer", ACCOUNT, {
      token: TOKEN,
      to: RECIPIENT,
      amount: "1.5",
    });
    if (transfer.kind !== "capability") throw new Error("expected capability");
    const [transferTx] = flattenCapabilityTree(transfer);
    if (!transferTx) throw new Error("missing transfer transaction");
    expect(decodeFunctionData({ abi: ierc20Abi, data: transferTx.transaction.data })).toEqual({
      functionName: "transfer",
      args: [RECIPIENT, 1_500_000n],
    });

    const approval = await registry.action("erc20", "approve", ACCOUNT, {
      token: TOKEN,
      spender: SPENDER,
      amount: "42",
    });
    if (approval.kind !== "capability") throw new Error("expected capability");
    const [approvalTx] = flattenCapabilityTree(approval);
    if (!approvalTx) throw new Error("missing approval transaction");
    expect(
      decodeFunctionData({
        abi: ierc20Abi,
        data: approvalTx.transaction.data,
      }),
    ).toEqual({
      functionName: "approve",
      args: [SPENDER, 42n],
    });
  });

  it("builds a native transfer and preserves JSON-safe params", async () => {
    const transfer = await registryWithDecimals().action("erc20", "transfer", ACCOUNT, {
      token: NATIVE,
      to: RECIPIENT,
      amount: "0.5",
    });
    if (transfer.kind !== "capability") throw new Error("expected capability");
    expect(transfer.params).toEqual({ token: NATIVE, to: RECIPIENT, amount: "0.5" });
    expect(flattenCapabilityTree(transfer)[0]?.transaction).toMatchObject({
      from: ACCOUNT,
      to: RECIPIENT,
      value: "0x6f05b59d3b20000",
    });
  });

  it("parses every Change in order into typed Receipt text and data", () => {
    const transfer = {
      kind: "event",
      address: TOKEN,
      topics: encodeEventTopics({
        abi: ierc20Abi,
        eventName: "Transfer",
        args: { from: ACCOUNT, to: RECIPIENT },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }], [15n]),
    } satisfies Change;
    const approval = {
      kind: "event",
      address: TOKEN,
      topics: encodeEventTopics({
        abi: ierc20Abi,
        eventName: "Approval",
        args: { owner: ACCOUNT, spender: SPENDER },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }], [42n]),
    } satisfies Change;
    const protocol = Object.create(ERC20.prototype) as ERC20;
    const receipt = protocol.changesReceipt([transfer, approval]);
    expect(receipt.changes.map((entry) => entry.kind === "change" && entry.change)).toEqual([
      transfer,
      approval,
    ]);
    expect(receipt.outcome).toEqual([
      { operation: "transfer", token: TOKEN, from: ACCOUNT, to: RECIPIENT, amount: "15" },
      { operation: "approve", token: TOKEN, owner: ACCOUNT, spender: SPENDER, amount: "42" },
    ]);
    expect(receipt.text).toContain("ERC20 Transfer:");
    expect(receipt.text).toContain("ERC20 Approval:");
  });
});
