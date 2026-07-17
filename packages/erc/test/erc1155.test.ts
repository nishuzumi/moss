/**
 * ERC-1155 Protocol Tests
 *
 * Follows the ERC-20 test pattern: offline tests using mocked runtime.
 * Validates Capability construction, calldata encoding, and Receipt parsing.
 */

import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ierc1155Abi } from "../src/abis/erc1155.js";
import { ERC1155 } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const TOKEN = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";
const OPERATOR = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB";

function registry() {
  const runtime: MossRuntime = {
    rpcUrl: "http://offline",
    client: {} as MossRuntime["client"],
  };
  return new Registry(runtime).use(ERC1155);
}

describe("ERC1155", () => {
  // ── Capability: transfer ──────────────────────────────────────

  it("builds safeTransferFrom calldata from params", async () => {
    const reg = registry();
    const result = await reg.action("erc1155", "transfer", ACCOUNT, {
      token: TOKEN,
      from: ACCOUNT,
      to: RECIPIENT,
      id: "42",
      amount: "7",
    });

    if (result.kind !== "capability") throw new Error("expected capability");
    const [tx] = flattenCapabilityTree(result);
    if (!tx) throw new Error("missing transaction");

    expect(decodeFunctionData({ abi: ierc1155Abi, data: tx.transaction.data })).toEqual({
      functionName: "safeTransferFrom",
      args: [ACCOUNT, RECIPIENT, 42n, 7n, "0x"],
    });
  });

  // ── Capability: setApprovalForAll ─────────────────────────────

  it("builds setApprovalForAll calldata for approve and revoke", async () => {
    const reg = registry();

    const approve = await reg.action("erc1155", "approve", ACCOUNT, {
      token: TOKEN,
      operator: OPERATOR,
      approved: true,
    });
    if (approve.kind !== "capability") throw new Error("expected capability");
    const [approveTx] = flattenCapabilityTree(approve);
    if (!approveTx) throw new Error("missing approve transaction");
    expect(decodeFunctionData({ abi: ierc1155Abi, data: approveTx.transaction.data })).toEqual({
      functionName: "setApprovalForAll",
      args: [OPERATOR, true],
    });

    const revoke = await reg.action("erc1155", "approve", ACCOUNT, {
      token: TOKEN,
      operator: OPERATOR,
      approved: false,
    });
    if (revoke.kind !== "capability") throw new Error("expected capability");
    const [revokeTx] = flattenCapabilityTree(revoke);
    if (!revokeTx) throw new Error("missing revoke transaction");
    expect(decodeFunctionData({ abi: ierc1155Abi, data: revokeTx.transaction.data })).toEqual({
      functionName: "setApprovalForAll",
      args: [OPERATOR, false],
    });
  });

  // ── Receipt: TransferSingle ───────────────────────────────────

  it("parses TransferSingle Change into typed Receipt text and data", () => {
    const change: Change = {
      kind: "event",
      address: TOKEN,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "TransferSingle",
        args: { operator: ACCOUNT, from: ACCOUNT, to: RECIPIENT },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [99n, 5n]),
    };

    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    const receipt = protocol.changesReceipt([change]);

    expect(receipt.changes).toHaveLength(1);
    expect(receipt.outcome).toEqual([
      {
        operation: "transferSingle",
        token: TOKEN,
        operator: ACCOUNT,
        from: ACCOUNT,
        to: RECIPIENT,
        id: "99",
        amount: "5",
      },
    ]);
    expect(receipt.text).toContain("ERC1155 TransferSingle");
    expect(receipt.text).toContain("token#99");
  });

  // ── Receipt: TransferBatch ────────────────────────────────────

  it("parses TransferBatch Change with multiple token types", () => {
    const change: Change = {
      kind: "event",
      address: TOKEN,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "TransferBatch",
        args: { operator: ACCOUNT, from: ACCOUNT, to: RECIPIENT },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [{ type: "uint256[]" }, { type: "uint256[]" }],
        [
          [1n, 2n],
          [100n, 200n],
        ],
      ),
    };

    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    const receipt = protocol.changesReceipt([change]);

    expect(receipt.outcome).toEqual([
      {
        operation: "transferBatch",
        token: TOKEN,
        operator: ACCOUNT,
        from: ACCOUNT,
        to: RECIPIENT,
        ids: ["1", "2"],
        amounts: ["100", "200"],
      },
    ]);
    expect(receipt.text).toContain("ERC1155 TransferBatch");
  });

  // ── Receipt: ApprovalForAll ───────────────────────────────────

  it("parses ApprovalForAll Change into typed Receipt", () => {
    const change: Change = {
      kind: "event",
      address: TOKEN,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "ApprovalForAll",
        args: { account: ACCOUNT, operator: OPERATOR },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "bool" }], [true]),
    };

    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    const receipt = protocol.changesReceipt([change]);

    expect(receipt.outcome).toEqual([
      {
        operation: "approvalForAll",
        token: TOKEN,
        account: ACCOUNT,
        operator: OPERATOR,
        approved: true,
      },
    ]);
    expect(receipt.text).toContain("approved");
  });

  // ── Receipt: multiple Changes in order ────────────────────────

  it("parses every Change in order into typed Receipt", () => {
    const transferSingle: Change = {
      kind: "event",
      address: TOKEN,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "TransferSingle",
        args: { operator: ACCOUNT, from: ACCOUNT, to: RECIPIENT },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [10n, 3n]),
    };
    const approval: Change = {
      kind: "event",
      address: TOKEN,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "ApprovalForAll",
        args: { account: ACCOUNT, operator: OPERATOR },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "bool" }], [false]),
    };

    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    const receipt = protocol.changesReceipt([transferSingle, approval]);

    expect(receipt.changes).toHaveLength(2);
    expect(receipt.outcome).toEqual([
      {
        operation: "transferSingle",
        token: TOKEN,
        operator: ACCOUNT,
        from: ACCOUNT,
        to: RECIPIENT,
        id: "10",
        amount: "3",
      },
      {
        operation: "approvalForAll",
        token: TOKEN,
        account: ACCOUNT,
        operator: OPERATOR,
        approved: false,
      },
    ]);
    expect(receipt.text).toContain("ERC1155 TransferSingle");
    expect(receipt.text).toContain("revoked");
  });

  // ── Error: unsupported event ──────────────────────────────────

  it("throws on unsupported events", () => {
    const change: Change = {
      kind: "event",
      address: TOKEN,
      topics: encodeEventTopics({
        abi: ierc1155Abi,
        eventName: "URI",
        args: { id: 1n },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "string" }], ["https://example.com/1.json"]),
    };

    const protocol = Object.create(ERC1155.prototype) as ERC1155;
    expect(() => protocol.transferSingleReceipt([change])).toThrow("unsupported event: URI");
  });
});
