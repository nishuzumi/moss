import type { ERC20 } from "../src/erc20.js";

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
