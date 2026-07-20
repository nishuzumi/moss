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
  UnsignedIntegerString,
} from "@themoss/core";
import { decodeEventLog } from "viem";
import { ierc1155Abi, ierc1155MetadataUriAbi } from "./abis/erc.js";

const MAX_UINT256 = (1n << 256n) - 1n;

const ERC1155Uint256String = UnsignedIntegerString.refine((value) => {
  try {
    return BigInt(value) <= MAX_UINT256;
  } catch {
    return false;
  }
}, "Expected an integer no greater than uint256 max.").describe(
  "A base-10 uint256 integer string, from 0 through 2^256 - 1.",
);

const erc1155TransferParams = {
  collection: { type: Address, description: "Collection containing the requested token." },
  tokenId: { type: ERC1155Uint256String, description: "Token selected within the collection." },
  amount: { type: ERC1155Uint256String, description: "Number of token units to transfer." },
  to: { type: Address, description: "Address that receives the token units." },
} satisfies ParamsSpec;

const erc1155BalanceParams = {
  collection: { type: Address, description: "Collection whose balance is requested." },
  tokenId: { type: ERC1155Uint256String, description: "Token selected within the collection." },
  owner: { type: Address, description: "Address whose token balance is read." },
} satisfies ParamsSpec;

const erc1155UriParams = {
  collection: { type: Address, description: "Collection whose metadata URI is requested." },
  tokenId: { type: ERC1155Uint256String, description: "Token selected within the collection." },
} satisfies ParamsSpec;

const erc1155ApprovalParams = {
  collection: { type: Address, description: "Collection to manage operator approval for." },
  operator: { type: Address, description: "Address authorized to manage the caller's tokens." },
  approved: {
    type: UnsignedIntegerString.refine(
      (v) => v === "1" || v === "0",
      'Expected "1" (approve) or "0" (revoke).',
    ).describe('Pass "1" to approve the operator or "0" to revoke.'),
    description: '"1" to approve the operator, "0" to revoke.',
  },
} satisfies ParamsSpec;

const erc1155ApprovalCheckParams = {
  collection: { type: Address, description: "Collection whose approval is checked." },
  owner: { type: Address, description: "Address that may have granted approval." },
  operator: { type: Address, description: "Address whose operator status is checked." },
} satisfies ParamsSpec;

export type ERC1155ApprovalOutcome = {
  operation: "approvalForAll";
  collection: AddressValue;
  account: AddressValue;
  operator: AddressValue;
  approved: boolean;
};
export type ERC1155TransferItem = {
  tokenId: string;
  amount: string;
};

export type ERC1155Outcome =
  | {
      operation: "transfer";
      event: "TransferSingle";
      collection: AddressValue;
      operator: AddressValue;
      from: AddressValue;
      to: AddressValue;
      tokenId: string;
      amount: string;
    }
  | {
      operation: "transfer";
      event: "TransferBatch";
      collection: AddressValue;
      operator: AddressValue;
      from: AddressValue;
      to: AddressValue;
      items: readonly ERC1155TransferItem[];
    };

export type ERC1155TransferOutcome = Extract<ERC1155Outcome, { event: "TransferSingle" }>;

@Protocol({
  name: "erc1155",
  category: "nft",
  description:
    "Generic ERC-1155 transfers, balances, metadata URIs, and ordered transfer evidence.",
  contracts: {},
})
export class ERC1155 {
  declare runtime: MossRuntime;

  #handle(collection: AddressValue, account: AddressValue) {
    return createHandle(ierc1155Abi, collection, this.runtime.client, account);
  }

  #metadataHandle(collection: AddressValue, account: AddressValue) {
    return createHandle(ierc1155MetadataUriAbi, collection, this.runtime.client, account);
  }

  @Capability<ERC1155, typeof erc1155TransferParams>({
    intent: "Transfer ERC-1155 token units",
    verb: "transfer",
    params: erc1155TransferParams,
    receipt: "transferReceipt",
    risk: ["fundOut"],
    tags: ["nft", "payment"],
  })
  async transfer(params: InferParams<typeof erc1155TransferParams>, ctx: ActionCtx) {
    return [
      this.#handle(params.collection, ctx.account).safeTransferFrom([
        ctx.account,
        params.to,
        BigInt(params.tokenId),
        BigInt(params.amount),
        "0x",
      ]),
    ];
  }

  @Query({
    intent: "Read an ERC-1155 token balance",
    params: erc1155BalanceParams,
    tags: ["balance"],
  })
  async balanceOf(params: InferParams<typeof erc1155BalanceParams>, ctx: ActionCtx) {
    const balance = await this.#handle(params.collection, ctx.account).read.balanceOf([
      params.owner,
      BigInt(params.tokenId),
    ]);
    return { ...params, balance: balance.toString() };
  }

  @Query({
    intent: "Read an ERC-1155 metadata URI",
    params: erc1155UriParams,
    tags: ["metadata"],
  })
  async uri(params: InferParams<typeof erc1155UriParams>, ctx: ActionCtx) {
    const uri = await this.#metadataHandle(params.collection, ctx.account).read.uri([
      BigInt(params.tokenId),
    ]);
    return { ...params, uri };
  }

  @Capability<ERC1155, typeof erc1155ApprovalParams>({
    intent: "Set or revoke an ERC-1155 operator approval",
    verb: "approve",
    params: erc1155ApprovalParams,
    receipt: "approvalReceipt",
    risk: ["approval"],
    tags: ["approval"],
  })
  async approve(params: InferParams<typeof erc1155ApprovalParams>, ctx: ActionCtx) {
    return [
      this.#handle(params.collection, ctx.account).setApprovalForAll([
        params.operator,
        params.approved === "1",
      ]),
    ];
  }

  @Query({
    intent: "Check whether an operator is approved for an ERC-1155 collection",
    params: erc1155ApprovalCheckParams,
  })
  async isApprovedForAll(params: InferParams<typeof erc1155ApprovalCheckParams>, ctx: ActionCtx) {
    const approved = await this.#handle(params.collection, ctx.account).read.isApprovedForAll([
      params.owner,
      params.operator,
    ]);
    return { ...params, approved };
  }
  @Receipt()
  transferReceipt(changes: readonly Change[]): MossReceipt<ERC1155TransferOutcome> {
    const receipt = this.changesReceipt(changes);
    const [outcome] = receipt.outcome;
    if (!outcome || receipt.outcome.length !== 1 || outcome.event !== "TransferSingle") {
      throw new Error("ERC1155 transfer Receipt requires exactly one TransferSingle Change");
    }
    return { ...receipt, outcome, text: receipt.changes[0]?.text ?? receipt.text };
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

  @Receipt()
  approvalReceipt(changes: readonly Change[]): MossReceipt<ERC1155ApprovalOutcome> {
    const first = changes[0];
    if (changes.length !== 1 || !first || first.kind !== "event") {
      throw new Error("ERC1155 approval Receipt requires exactly one event Change");
    }
    let decoded: ReturnType<typeof decodeEventLog<typeof ierc1155Abi>>;
    try {
      decoded = decodeEventLog({
        abi: ierc1155Abi,
        topics: first.topics as [Hex, ...Hex[]],
        data: first.data,
        strict: true,
      });
    } catch {
      throw new Error(`Unexpected Change: ${first.address} emitted an unsupported event`);
    }
    if (decoded.eventName !== "ApprovalForAll") {
      throw new Error(
        `Unexpected Change: ${first.address} emitted ${decoded.eventName}, expected ApprovalForAll`,
      );
    }
    const outcome: ERC1155ApprovalOutcome = {
      operation: "approvalForAll",
      collection: first.address,
      account: decoded.args.account,
      operator: decoded.args.operator,
      approved: decoded.args.approved,
    };
    const text = `ERC1155 ApprovalForAll: ${outcome.account} ${outcome.approved ? "approved" : "revoked"} ${outcome.operator} for ${outcome.collection}`;
    return {
      kind: "receipt",
      outcome,
      text,
      changes: [{ kind: "change" as const, change: first, data: outcome, text }],
    };
  }
}

function parseERC1155Change(change: Change): ERC1155Outcome {
  if (change.kind !== "event") {
    throw new Error("Unexpected Change: ERC1155 Receipts only accept contract events");
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

  if (decoded.eventName === "TransferSingle") {
    return {
      operation: "transfer",
      event: "TransferSingle",
      collection: change.address,
      operator: decoded.args.operator,
      from: decoded.args.from,
      to: decoded.args.to,
      tokenId: decoded.args.id.toString(),
      amount: decoded.args.value.toString(),
    };
  }

  if (decoded.eventName === "TransferBatch") {
    if (decoded.args.ids.length !== decoded.args.values.length) {
      throw new Error("Unexpected Change: ERC1155 TransferBatch ids and values lengths differ");
    }
    return {
      operation: "transfer",
      event: "TransferBatch",
      collection: change.address,
      operator: decoded.args.operator,
      from: decoded.args.from,
      to: decoded.args.to,
      items: decoded.args.ids.map((tokenId, index) => {
        const amount = decoded.args.values[index];
        if (amount === undefined) {
          throw new Error("Unexpected Change: ERC1155 TransferBatch is missing a value");
        }
        return { tokenId: tokenId.toString(), amount: amount.toString() };
      }),
    };
  }

  throw new Error(`Unexpected Change: ${change.address} emitted an unsupported ERC-1155 event`);
}

function describeERC1155Outcome(outcome: ERC1155Outcome): string {
  if (outcome.event === "TransferSingle") {
    return `ERC1155 TransferSingle: ${outcome.amount} of ${outcome.collection} #${outcome.tokenId} from ${outcome.from} to ${outcome.to} by ${outcome.operator}`;
  }
  const items = outcome.items.map(({ tokenId, amount }) => `${amount} of #${tokenId}`).join(", ");
  return `ERC1155 TransferBatch: ${items} from ${outcome.from} to ${outcome.to} by ${outcome.operator} in ${outcome.collection}`;
}
