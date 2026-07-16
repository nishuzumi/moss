import type { ERC20 } from "../src/erc20.js";
import type { ERC721 } from "../src/erc721.js";
import type { ERC1155 } from "../src/erc1155.js";

type TransferOperation = ReturnType<ERC20["transferReceipt"]>["outcome"]["operation"];
type ApprovalOperation = ReturnType<ERC20["approveReceipt"]>["outcome"]["operation"];
type ERC721TransferOperation = ReturnType<ERC721["transferReceipt"]>["outcome"]["operation"];
type ERC1155TransferOperation = ReturnType<ERC1155["transferReceipt"]>["outcome"]["operation"];

const transfer: TransferOperation = "transfer";
// @ts-expect-error transferReceipt cannot report an approval outcome.
const invalidTransfer: TransferOperation = "approve";
const approval: ApprovalOperation = "approve";
// @ts-expect-error approveReceipt cannot report a transfer outcome.
const invalidApproval: ApprovalOperation = "transfer";
const erc721Transfer: ERC721TransferOperation = "transfer";
const erc1155Transfer: ERC1155TransferOperation = "transfer";
// @ts-expect-error ERC-1155 transferReceipt cannot report an approval outcome.
const invalidERC1155Transfer: ERC1155TransferOperation = "approve";

void transfer;
void invalidTransfer;
void approval;
void invalidApproval;
void erc721Transfer;
void erc1155Transfer;
void invalidERC1155Transfer;
