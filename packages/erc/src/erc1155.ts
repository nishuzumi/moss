/**
 * ERC-1155 Multi Token Protocol for MOSS
 *
 * Implements the discover → load → action → simulate pipeline for ERC-1155 tokens.
 * Follows the same generic Protocol pattern as ERC-20.
 *
 * Related MOSS Issue: https://github.com/nishuzumi/moss/issues/68
 */

import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type Change,
  createHandle,
  type Hex,
  type InferParams,
  type ReceiptResult as MossReceipt,
  type MossRuntime,
  type ParamsSpec,
  Protocol,
  Query,
  Receipt,
} from "@themoss/core";
import { decodeEventLog } from "viem";
import { z } from "zod/v4";
import { ierc1155Abi } from "./abis/erc1155.js";

// ─── Zod-based Param Types ──────────────────────────────────────

const TokenIdString = z.string().describe("Token ID as a decimal string");
const AmountString = z.string().describe("Token amount as a decimal string");

// ─── Param Specs ───────────────────────────────────────────────

const transferParams = {
  token: { type: Address, description: "ERC-1155 contract address." },
  from: { type: Address, description: "Current token owner address." },
  to: { type: Address, description: "Recipient address." },
  id: { type: TokenIdString, description: "Token ID to transfer." },
  amount: { type: AmountString, description: "Quantity to transfer." },
} satisfies ParamsSpec;

const approvalParams = {
  token: { type: Address, description: "ERC-1155 contract address." },
  operator: { type: Address, description: "Address authorized to manage tokens." },
  approved: {
    type: z.boolean().describe("True to approve the operator, false to revoke."),
    description: "True to approve, false to revoke.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  token: { type: Address, description: "ERC-1155 contract address." },
  account: { type: Address, description: "Address whose balance is read." },
  id: { type: TokenIdString, description: "Token ID." },
} satisfies ParamsSpec;

const approvalCheckParams = {
  token: { type: Address, description: "ERC-1155 contract address." },
  account: { type: Address, description: "Token owner address." },
  operator: { type: Address, description: "Operator address to check." },
} satisfies ParamsSpec;

const uriParams = {
  token: { type: Address, description: "ERC-1155 contract address." },
  id: { type: TokenIdString, description: "Token ID." },
} satisfies ParamsSpec;

// ─── Outcome Types ──────────────────────────────────────────────

export type ERC1155Outcome =
  | {
      operation: "transferSingle";
      token: AddressValue;
      operator: AddressValue;
      from: AddressValue;
      to: AddressValue;
      id: string;
      amount: string;
    }
  | {
      operation: "transferBatch";
      token: AddressValue;
      operator: AddressValue;
      from: AddressValue;
      to: AddressValue;
      ids: string[];
      amounts: string[];
    }
  | {
      operation: "approvalForAll";
      token: AddressValue;
      account: AddressValue;
      operator: AddressValue;
      approved: boolean;
    };

export type ERC1155TransferSingleOutcome = Extract<ERC1155Outcome, { operation: "transferSingle" }>;

// ─── Protocol Class ─────────────────────────────────────────────

@Protocol({
  name: "erc1155",
  category: "token",
  description:
    "Generic ERC-1155 Multi Token transfers, batch transfers, approvals, balances, and metadata.",
  contracts: {},
})
export class ERC1155 {
  declare runtime: MossRuntime;

  #handle(token: AddressValue, account: AddressValue) {
    return createHandle(ierc1155Abi, token, this.runtime.client, account);
  }

  // ── Capabilities ────────────────────────────────────────────

  @Capability<ERC1155, typeof transferParams>({
    intent: "Transfer a single ERC-1155 token type",
    verb: "transfer",
    params: transferParams,
    receipt: "transferSingleReceipt",
    risk: ["fundOut"],
    tags: ["payment", "nft"],
  })
  async transfer(params: InferParams<typeof transferParams>, ctx: ActionCtx) {
    return [
      this.#handle(params.token, ctx.account).safeTransferFrom([
        params.from,
        params.to,
        BigInt(params.id),
        BigInt(params.amount),
        "0x" as Hex,
      ]),
    ];
  }

  @Capability<ERC1155, typeof approvalParams>({
    intent: "Set or revoke ERC-1155 operator approval",
    verb: "approve",
    params: approvalParams,
    receipt: "approvalReceipt",
    risk: ["approval"],
    tags: ["approval"],
  })
  async approve(params: InferParams<typeof approvalParams>, ctx: ActionCtx) {
    return [
      this.#handle(params.token, ctx.account).setApprovalForAll([params.operator, params.approved]),
    ];
  }

  // ── Queries ─────────────────────────────────────────────────

  @Query({ intent: "Read an ERC-1155 token balance", params: balanceParams, tags: ["balance"] })
  async balanceOf(params: InferParams<typeof balanceParams>, ctx: ActionCtx) {
    const handle = this.#handle(params.token, ctx.account);
    const balance = await handle.read.balanceOf([params.account, BigInt(params.id)]);
    return {
      token: params.token,
      account: params.account,
      id: params.id,
      balance: balance.toString(),
    };
  }

  @Query({
    intent: "Check ERC-1155 operator approval",
    params: approvalCheckParams,
  })
  async isApprovedForAll(params: InferParams<typeof approvalCheckParams>, ctx: ActionCtx) {
    const approved = await this.#handle(params.token, ctx.account).read.isApprovedForAll([
      params.account,
      params.operator,
    ]);
    return {
      token: params.token,
      account: params.account,
      operator: params.operator,
      approved,
    };
  }

  @Query({ intent: "Read ERC-1155 token metadata URI", params: uriParams })
  async uri(params: InferParams<typeof uriParams>, ctx: ActionCtx) {
    const handle = this.#handle(
      params.token,
      ctx.account ?? ("0x0000000000000000000000000000000000000000" as AddressValue),
    );
    const metadataUri = await handle.read.uri([BigInt(params.id)]);
    return { token: params.token, id: params.id, uri: metadataUri };
  }

  // ── Receipts ─────────────────────────────────────────────────

  @Receipt()
  transferSingleReceipt(changes: readonly Change[]): MossReceipt<ERC1155TransferSingleOutcome> {
    const receipt = this.changesReceipt(changes);
    const transfers = receipt.outcome.filter(
      (o): o is ERC1155TransferSingleOutcome => o.operation === "transferSingle",
    );
    const [transfer] = transfers;
    if (!transfer || transfers.length !== 1 || receipt.outcome.length !== 1) {
      throw new Error("ERC1155 transferSingle Receipt requires exactly one TransferSingle Change");
    }
    return { ...receipt, outcome: transfer, text: receipt.changes[0]?.text ?? receipt.text };
  }

  @Receipt()
  transferBatchReceipt(changes: readonly Change[]): MossReceipt<readonly ERC1155Outcome[]> {
    return this.changesReceipt(changes);
  }

  @Receipt()
  approvalReceipt(
    changes: readonly Change[],
  ): MossReceipt<Extract<ERC1155Outcome, { operation: "approvalForAll" }>> {
    const receipt = this.changesReceipt(changes);
    const approvals = receipt.outcome.filter(
      (o): o is Extract<ERC1155Outcome, { operation: "approvalForAll" }> =>
        o.operation === "approvalForAll",
    );
    const [approval] = approvals;
    if (!approval || approvals.length !== 1 || receipt.outcome.length !== 1) {
      throw new Error("ERC1155 approval Receipt requires exactly one ApprovalForAll Change");
    }
    return { ...receipt, outcome: approval, text: receipt.changes[0]?.text ?? receipt.text };
  }

  @Receipt()
  changesReceipt(changes: readonly Change[]): MossReceipt<readonly ERC1155Outcome[]> {
    const outcomes: ERC1155Outcome[] = [];
    const parsed = changes.map((change) => {
      const outcome = parseERC1155Change(change);
      outcomes.push(outcome);
      return {
        kind: "change" as const,
        change,
        data: outcome,
        text: describeERC1155Outcome(outcome),
      };
    });
    return {
      kind: "receipt",
      outcome: outcomes,
      text: parsed.map(({ text }) => text).join("; "),
      changes: parsed,
    };
  }
}

// ─── Event Parsers ──────────────────────────────────────────────

function parseERC1155Change(change: Change): ERC1155Outcome {
  // ERC-1155 only handles event-type Changes (no native MON transfers)
  if (change.kind !== "event") {
    throw new Error(
      `Unexpected Change kind: ${change.kind} — ERC-1155 only processes event Changes`,
    );
  }

  let decoded: ReturnType<typeof decodeEventLog<typeof ierc1155Abi>>;
  try {
    decoded = decodeEventLog({
      abi: ierc1155Abi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    throw new Error(`Unexpected Change: ${change.address} emitted an unsupported ERC-1155 event`);
  }

  switch (decoded.eventName) {
    case "TransferSingle":
      return {
        operation: "transferSingle",
        token: change.address,
        operator: decoded.args.operator,
        from: decoded.args.from,
        to: decoded.args.to,
        id: (decoded.args.id as bigint).toString(),
        amount: (decoded.args.value as bigint).toString(),
      };
    case "TransferBatch":
      return {
        operation: "transferBatch",
        token: change.address,
        operator: decoded.args.operator,
        from: decoded.args.from,
        to: decoded.args.to,
        ids: (decoded.args.ids as bigint[]).map((v) => v.toString()),
        amounts: (decoded.args.values as bigint[]).map((v) => v.toString()),
      };
    case "ApprovalForAll":
      return {
        operation: "approvalForAll",
        token: change.address,
        account: decoded.args.account,
        operator: decoded.args.operator,
        approved: decoded.args.approved as boolean,
      };
    default:
      throw new Error(
        `Unexpected Change: ${change.address} emitted unsupported event: ${decoded.eventName}`,
      );
  }
}

// ─── Human-readable Descriptions ────────────────────────────────

function describeERC1155Outcome(outcome: ERC1155Outcome): string {
  switch (outcome.operation) {
    case "transferSingle":
      return `ERC1155 TransferSingle: ${outcome.amount} of token#${outcome.id} from ${outcome.from} to ${outcome.to}`;
    case "transferBatch":
      return `ERC1155 TransferBatch: ${outcome.ids.length} types from ${outcome.from} to ${outcome.to}`;
    case "approvalForAll":
      return `ERC1155 ApprovalForAll: ${outcome.account} ${outcome.approved ? "approved" : "revoked"} ${outcome.operator}`;
  }
}
