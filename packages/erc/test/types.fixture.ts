import type { Change, ReceiptResult } from "@themoss/core";
import { Receipt } from "@themoss/core";
import type { ERC20 } from "../src/erc20.js";
import type { ERC1155, ERC1155Outcome } from "../src/erc1155.js";

type TransferOperation = ReturnType<ERC20["transferReceipt"]>["outcome"]["operation"];
type ApprovalOperation = ReturnType<ERC20["approveReceipt"]>["outcome"]["operation"];

const transfer: TransferOperation = "transfer";
// @ts-expect-error transferReceipt cannot report an approval outcome.
const invalidTransfer: TransferOperation = "approve";
const approval: ApprovalOperation = "approve";
// @ts-expect-error approveReceipt cannot report a transfer outcome.
const invalidApproval: ApprovalOperation = "transfer";

void transfer;
void invalidTransfer;
void approval;
void invalidApproval;

type ERC1155TransferParams = Parameters<ERC1155["transfer"]>[0];
const erc1155Params: ERC1155TransferParams = {
  collection: "0x1111111111111111111111111111111111111111",
  tokenId: "42",
  amount: "3",
  to: "0x2222222222222222222222222222222222222222",
};
const invalidTokenId: ERC1155TransferParams = {
  ...erc1155Params,
  // @ts-expect-error ERC1155 token IDs are decimal strings, not bigint values.
  tokenId: 42n,
};
// @ts-expect-error ERC1155 transfer params require a recipient.
const missingRecipient: ERC1155TransferParams = {
  collection: erc1155Params.collection,
  tokenId: "42",
  amount: "3",
};

type ERC1155ApprovalParams = Parameters<ERC1155["approve"]>[0];
const erc1155ApprovalParams: ERC1155ApprovalParams = {
  collection: "0x1111111111111111111111111111111111111111",
  operator: "0x2222222222222222222222222222222222222222",
  approved: true,
};
const erc1155RevokeParams: ERC1155ApprovalParams = {
  ...erc1155ApprovalParams,
  approved: false,
};
const invalidApprovedString: ERC1155ApprovalParams = {
  ...erc1155ApprovalParams,
  // @ts-expect-error The approved flag is a JSON boolean, not a string.
  approved: "1",
};
const invalidApprovedNumber: ERC1155ApprovalParams = {
  ...erc1155ApprovalParams,
  // @ts-expect-error The approved flag is a JSON boolean, not a number.
  approved: 1,
};

type ERC1155DirectOutcome = ReturnType<ERC1155["transferReceipt"]>["outcome"];
const directEvent: ERC1155DirectOutcome["event"] = "TransferSingle";
// @ts-expect-error The direct transfer Receipt cannot report a TransferBatch event.
const invalidDirectEvent: ERC1155DirectOutcome["event"] = "TransferBatch";
const batchOutcome: ERC1155Outcome = {
  operation: "transfer",
  event: "TransferBatch",
  collection: erc1155Params.collection,
  operator: erc1155Params.collection,
  from: erc1155Params.collection,
  to: erc1155Params.to,
  items: [{ tokenId: "1", amount: "2" }],
};

class ERC1155CompileFixture {
  @Receipt()
  validReceipt(changes: readonly Change[]): ReceiptResult<ERC1155DirectOutcome> {
    throw new Error(String(changes.length));
  }

  // @ts-expect-error Receipt parsers accept only an immutable ordered Change list.
  @Receipt()
  invalidReceipt(_: string): ReceiptResult<ERC1155DirectOutcome> {
    throw new Error("compile fixture");
  }
}

void erc1155Params;
void invalidTokenId;
void missingRecipient;
void erc1155ApprovalParams;
void erc1155RevokeParams;
void invalidApprovedString;
void invalidApprovedNumber;
void directEvent;
void invalidDirectEvent;
void batchOutcome;
void ERC1155CompileFixture;
