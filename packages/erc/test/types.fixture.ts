import { type AddressValue, createHandle, type Handle } from "@themoss/core";
import type { PublicClient } from "viem";
import type { ERC20 } from "../src/erc20.js";
import { ERC4626Abi } from "../src/index.js";

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

declare const account: AddressValue;
declare const receiver: AddressValue;
declare const owner: AddressValue;
declare const client: PublicClient;
const erc4626Handle: Handle<typeof ERC4626Abi> = createHandle(ERC4626Abi, owner, client, account);

erc4626Handle.deposit([1n, receiver]);
erc4626Handle.withdraw([1n, receiver, owner]);
erc4626Handle.redeem([1n, receiver, owner]);
erc4626Handle.read.asset();
erc4626Handle.read.previewDeposit([1n]);
erc4626Handle.read.previewMint([1n]);
erc4626Handle.read.previewRedeem([1n]);
erc4626Handle.read.maxWithdraw([owner]);
// @ts-expect-error deposit requires assets and receiver.
erc4626Handle.deposit([1n]);
// @ts-expect-error redeem expects shares, receiver, and owner.
erc4626Handle.redeem([receiver]);
// @ts-expect-error ERC-4626 does not define a strategy function.
erc4626Handle.read.strategy();
