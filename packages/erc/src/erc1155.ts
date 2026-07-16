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
import { ierc1155Abi } from "./abis/erc.js";

const tokenParams = {
  collection: { type: Address, description: "ERC-1155 contract containing the selected token." },
  tokenId: { type: UnsignedIntegerString, description: "Token id selected within the collection." },
} satisfies ParamsSpec;

const transferParams = {
  ...tokenParams,
  to: { type: Address, description: "Address that receives the ERC-1155 token units." },
  amount: {
    type: UnsignedIntegerString,
    description: "Number of token units to transfer.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  ...tokenParams,
  owner: { type: Address, description: "Address whose ERC-1155 token balance is read." },
} satisfies ParamsSpec;

const approvalParams = {
  collection: { type: Address, description: "ERC-1155 contract whose operator approval is read." },
  owner: { type: Address, description: "Address that owns the ERC-1155 tokens." },
  operator: { type: Address, description: "Address whose operator approval is checked." },
} satisfies ParamsSpec;

export type ERC1155TransferOutcome = {
  operation: "transfer";
  collection: AddressValue;
  operator: AddressValue;
  from: AddressValue;
  to: AddressValue;
  tokenId: string;
  amount: string;
};

@Protocol({
  name: "erc1155",
  category: "nft",
  description: "Generic ERC-1155 single-token transfers, balances, approvals, and metadata URIs.",
  contracts: {},
})
export class ERC1155 {
  declare runtime: MossRuntime;

  #handle(collection: AddressValue, account: AddressValue) {
    return createHandle(ierc1155Abi, collection, this.runtime.client, account);
  }

  @Capability<ERC1155, typeof transferParams>({
    intent: "Transfer ERC-1155 token units",
    verb: "transfer",
    params: transferParams,
    receipt: "transferReceipt",
    risk: ["fundOut"],
    tags: ["nft", "multi-token", "payment"],
  })
  async transfer(params: InferParams<typeof transferParams>, ctx: ActionCtx) {
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

  @Query({ intent: "Read an ERC-1155 token balance", params: balanceParams, tags: ["balance"] })
  async balanceOf(params: InferParams<typeof balanceParams>, ctx: ActionCtx) {
    const balance = await this.#handle(params.collection, ctx.account).read.balanceOf([
      params.owner,
      BigInt(params.tokenId),
    ]);
    return { ...params, balance: balance.toString() };
  }

  @Query({
    intent: "Read an ERC-1155 operator approval",
    params: approvalParams,
    tags: ["approval"],
  })
  async isApprovedForAll(params: InferParams<typeof approvalParams>, ctx: ActionCtx) {
    const approved = await this.#handle(params.collection, ctx.account).read.isApprovedForAll([
      params.owner,
      params.operator,
    ]);
    return { ...params, approved };
  }

  @Query({ intent: "Read an ERC-1155 metadata URI", params: tokenParams, tags: ["metadata"] })
  async uri(params: InferParams<typeof tokenParams>, ctx: ActionCtx) {
    const uri = await this.#handle(params.collection, ctx.account).read.uri([
      BigInt(params.tokenId),
    ]);
    return { ...params, uri };
  }

  @Receipt()
  transferReceipt(changes: readonly Change[]): MossReceipt<ERC1155TransferOutcome> {
    if (changes.length !== 1 || changes[0]?.kind !== "event") {
      throw new Error("ERC1155 transfer Receipt requires exactly one TransferSingle event");
    }
    const change = changes[0];
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
    if (decoded.eventName !== "TransferSingle") {
      throw new Error(
        `Unexpected Change: expected ERC1155 TransferSingle, received ${decoded.eventName}`,
      );
    }
    const outcome: ERC1155TransferOutcome = {
      operation: "transfer",
      collection: change.address,
      operator: decoded.args.operator,
      from: decoded.args.from,
      to: decoded.args.to,
      tokenId: decoded.args.id.toString(),
      amount: decoded.args.value.toString(),
    };
    const text = `ERC1155 Transfer: ${outcome.amount} units of ${outcome.collection} #${outcome.tokenId} from ${outcome.from} to ${outcome.to}`;
    return {
      kind: "receipt",
      outcome,
      text,
      changes: [{ kind: "change", change, data: outcome, text }],
    };
  }
}
