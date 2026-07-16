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
import { ierc721Abi } from "./abis/erc.js";

const tokenParams = {
  collection: { type: Address, description: "Collection containing the requested token." },
  tokenId: { type: UnsignedIntegerString, description: "Token selected within the collection." },
} satisfies ParamsSpec;

const transferParams = {
  ...tokenParams,
  to: { type: Address, description: "Address that receives the NFT." },
} satisfies ParamsSpec;

const balanceParams = {
  collection: { type: Address, description: "Collection whose balance is requested." },
  owner: { type: Address, description: "Address whose collection balance is read." },
} satisfies ParamsSpec;

export type ERC721TransferOutcome = {
  operation: "transfer";
  collection: AddressValue;
  from: AddressValue;
  to: AddressValue;
  tokenId: string;
};

@Protocol({
  name: "erc721",
  category: "nft",
  description: "Generic ERC-721 transfers, ownership, and balance queries.",
  contracts: {},
})
export class ERC721 {
  declare runtime: MossRuntime;

  #handle(collection: AddressValue, account: AddressValue) {
    return createHandle(ierc721Abi, collection, this.runtime.client, account);
  }

  @Capability<ERC721, typeof transferParams>({
    intent: "Transfer an ERC-721 token",
    verb: "transfer",
    params: transferParams,
    receipt: "transferReceipt",
    risk: ["fundOut"],
    tags: ["nft", "payment"],
  })
  async transfer(params: InferParams<typeof transferParams>, ctx: ActionCtx) {
    return [
      this.#handle(params.collection, ctx.account).safeTransferFrom([
        ctx.account,
        params.to,
        BigInt(params.tokenId),
      ]),
    ];
  }

  @Query({ intent: "Read the owner of an ERC-721 token", params: tokenParams })
  async ownerOf(params: InferParams<typeof tokenParams>, ctx: ActionCtx) {
    const owner = await this.#handle(params.collection, ctx.account).read.ownerOf([
      BigInt(params.tokenId),
    ]);
    return { ...params, owner };
  }

  @Query({ intent: "Read an ERC-721 collection balance", params: balanceParams, tags: ["balance"] })
  async balanceOf(params: InferParams<typeof balanceParams>, ctx: ActionCtx) {
    const balance = await this.#handle(params.collection, ctx.account).read.balanceOf([
      params.owner,
    ]);
    return { ...params, balance: balance.toString() };
  }

  @Receipt()
  transferReceipt(changes: readonly Change[]): MossReceipt<ERC721TransferOutcome> {
    if (changes.length !== 1 || changes[0]?.kind !== "event") {
      throw new Error("ERC721 transfer Receipt requires exactly one Transfer event");
    }
    const change = changes[0];
    let decoded: ReturnType<typeof decodeEventLog<typeof ierc721Abi>>;
    try {
      decoded = decodeEventLog({
        abi: ierc721Abi,
        topics: change.topics as [Hex, ...Hex[]],
        data: change.data,
        strict: true,
      });
    } catch {
      throw new Error(`Unexpected Change: ${change.address} emitted an unsupported ERC-721 event`);
    }
    if (decoded.eventName !== "Transfer") {
      throw new Error(`Unexpected Change: expected ERC721 Transfer, received ${decoded.eventName}`);
    }
    const outcome: ERC721TransferOutcome = {
      operation: "transfer",
      collection: change.address,
      from: decoded.args.from,
      to: decoded.args.to,
      tokenId: decoded.args.tokenId.toString(),
    };
    const text = `ERC721 Transfer: ${outcome.collection} #${outcome.tokenId} from ${outcome.from} to ${outcome.to}`;
    return {
      kind: "receipt",
      outcome,
      text,
      changes: [{ kind: "change", change, data: outcome, text }],
    };
  }
}
