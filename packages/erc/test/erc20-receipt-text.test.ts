import { type Change, type Hex, NATIVE, type ReceiptResult } from "@themoss/core";
import { encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ierc20Abi } from "../src/abis/erc.js";
import { ERC20 } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = getAddress("0x1111111111111111111111111111111111111111");
const TOKEN = getAddress("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa");
const SPENDER = getAddress("0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB");

const protocol = Object.create(ERC20.prototype) as ERC20;

/** Mirrors mcp-server's `receiptTexts`: the exact ordered leaf-text projection Agents read. */
function receiptTexts(receipt: ReceiptResult): string[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.text] : receiptTexts(entry),
  );
}

function erc20TransferChange(token: string, from: string, to: string, amount: bigint): Change {
  return {
    kind: "event",
    address: token as `0x${string}`,
    topics: encodeEventTopics({
      abi: ierc20Abi,
      eventName: "Transfer",
      args: { from: from as `0x${string}`, to: to as `0x${string}` },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function erc20ApprovalChange(
  token: string,
  owner: string,
  spender: string,
  amount: bigint,
): Change {
  return {
    kind: "event",
    address: token as `0x${string}`,
    topics: encodeEventTopics({
      abi: ierc20Abi,
      eventName: "Approval",
      args: { owner: owner as `0x${string}`, spender: spender as `0x${string}` },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

describe("ERC20 Receipt text projections", () => {
  it("locks the exact leaf text for an ERC-20 Transfer Change", () => {
    const change = erc20TransferChange(TOKEN, ACCOUNT, RECIPIENT, 15n);
    const receipt = protocol.changesReceipt([change]);
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `ERC20 Transfer: 15 ${TOKEN} from ${ACCOUNT} to ${RECIPIENT}`,
    });
  });

  it("locks the exact leaf text for an ERC-20 Approval Change", () => {
    const change = erc20ApprovalChange(TOKEN, ACCOUNT, SPENDER, 42n);
    const receipt = protocol.changesReceipt([change]);
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `ERC20 Approval: ${ACCOUNT} approved ${SPENDER} for 42 ${TOKEN}`,
    });
  });

  it("locks the exact leaf text for a native MON transfer Change, using the NATIVE sentinel", () => {
    const change: Change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: RECIPIENT,
      value: "500000000000000000",
    };
    const receipt = protocol.changesReceipt([change]);
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `ERC20 Transfer: 500000000000000000 ${NATIVE} from ${ACCOUNT} to ${RECIPIENT}`,
    });
  });

  it("locks the single-change transferReceipt top-level text to the one leaf text", () => {
    const change = erc20TransferChange(TOKEN, ACCOUNT, RECIPIENT, 15n);
    const receipt = protocol.transferReceipt([change]);
    expect(receipt.text).toBe(`ERC20 Transfer: 15 ${TOKEN} from ${ACCOUNT} to ${RECIPIENT}`);
  });

  it("locks the single-change approveReceipt top-level text to the one leaf text", () => {
    const change = erc20ApprovalChange(TOKEN, ACCOUNT, SPENDER, 42n);
    const receipt = protocol.approveReceipt([change]);
    expect(receipt.text).toBe(`ERC20 Approval: ${ACCOUNT} approved ${SPENDER} for 42 ${TOKEN}`);
  });

  it("locks the multi-change changesReceipt top-level text to a semicolon join, and the exact ordered leaf-text sequence", () => {
    const transfer = erc20TransferChange(TOKEN, ACCOUNT, RECIPIENT, 15n);
    const approval = erc20ApprovalChange(TOKEN, ACCOUNT, SPENDER, 42n);
    const receipt = protocol.changesReceipt([transfer, approval]);

    expect(receipt.text).toBe(
      `ERC20 Transfer: 15 ${TOKEN} from ${ACCOUNT} to ${RECIPIENT}; ` +
        `ERC20 Approval: ${ACCOUNT} approved ${SPENDER} for 42 ${TOKEN}`,
    );
    expect(receiptTexts(receipt)).toEqual([
      `ERC20 Transfer: 15 ${TOKEN} from ${ACCOUNT} to ${RECIPIENT}`,
      `ERC20 Approval: ${ACCOUNT} approved ${SPENDER} for 42 ${TOKEN}`,
    ]);
  });
});
