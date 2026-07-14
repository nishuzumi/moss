import { type Address, NATIVE, type TokenRef } from "@themoss/core";
import { decodeAbiParameters, toEventSelector } from "viem";
import type { CallFrame, TraceLog } from "./trace.js";

// Topic hashes are DERIVED from the human-readable signatures at module load,
// never hand-pasted: the signature is the source of truth, the hash a
// mechanical product. A typo'd hash would be a SILENT blind spot in effects
// reconciliation; a typo'd signature is reviewable text — and the canonical
// hashes are pinned in simulator.test.ts, so a wrong signature screams.
//
// Transfer is shared by ERC-20 and ERC-721; they are distinguished by topic
// count (ERC-721 indexes the token id).
export const TRANSFER_TOPIC = toEventSelector("Transfer(address,address,uint256)");
export const APPROVAL_TOPIC = toEventSelector("Approval(address,address,uint256)");
export const APPROVAL_FOR_ALL_TOPIC = toEventSelector("ApprovalForAll(address,address,bool)");
export const TRANSFER_SINGLE_TOPIC = toEventSelector(
  "TransferSingle(address,address,address,uint256,uint256)",
);
export const TRANSFER_BATCH_TOPIC = toEventSelector(
  "TransferBatch(address,address,address,uint256[],uint256[])",
);
// WETH9-style wrapped-native mint/burn emit Deposit/Withdrawal, NOT Transfer —
// without these, wrapping MON would show funds out and nothing back.
export const WETH_DEPOSIT_TOPIC = toEventSelector("Deposit(address,uint256)");
export const WETH_WITHDRAWAL_TOPIC = toEventSelector("Withdrawal(address,uint256)");

/**
 * The structured result of simulating one Plan, relative to its account.
 * This is what agents use for intent alignment — never raw logs.
 */
export interface EffectsSummary {
  assetsOut: { token: TokenRef; amount: string }[];
  assetsIn: { token: TokenRef; amount: string }[];
  approvals: { token: Address; spender: Address; amount: string }[];
  /** ERC-721 approvals / operator grants — always surfaced, never declarable. */
  nftApprovals: { collection: Address; operator: Address }[];
  /** NFT movements grouped by collection and distinct token id. */
  nftsOut: {
    collection: Address;
    count: number;
    items: { tokenId: string; amount?: string }[];
  }[];
  nftsIn: {
    collection: Address;
    count: number;
    items: { tokenId: string; amount?: string }[];
  }[];
  /** Every address that received value from the account (informational). */
  recipients: Address[];
}

/** Mutable accumulator while walking a Plan's transactions. */
export class EffectsAccumulator {
  #account: string;
  #out = new Map<string, bigint>();
  #in = new Map<string, bigint>();
  #approvals = new Map<string, { token: Address; spender: Address; amount: bigint }>();
  #nftApprovals = new Map<string, { collection: Address; operator: Address }>();
  #nftsOut = new Map<string, Map<string, bigint | undefined>>();
  #nftsIn = new Map<string, Map<string, bigint | undefined>>();
  #recipients = new Set<string>();

  constructor(account: Address) {
    this.#account = account.toLowerCase();
  }

  /** Walk one transaction's call tree: native value flows + token events. */
  addFrame(frame: CallFrame): void {
    this.#walkNative(frame);
    for (const log of collectLogs(frame)) this.#addLog(log);
  }

  #walkNative(frame: CallFrame): void {
    // DELEGATECALL/STATICCALL frames echo the parent's value without moving it.
    const moves = frame.type === "CALL" || frame.type === "CREATE" || frame.type === "CREATE2";
    if (moves && frame.value && BigInt(frame.value) > 0n && frame.to) {
      const from = frame.from.toLowerCase();
      const to = frame.to.toLowerCase();
      const value = BigInt(frame.value);
      if (from === this.#account && to !== this.#account) {
        bump(this.#out, NATIVE, value);
        this.#recipients.add(to);
      }
      if (to === this.#account && from !== this.#account) {
        bump(this.#in, NATIVE, value);
      }
    }
    for (const child of frame.calls ?? []) this.#walkNative(child);
  }

  #addLog(log: TraceLog): void {
    const topic0 = log.topics[0]?.toLowerCase();
    const contract = log.address.toLowerCase() as Address;
    if (topic0 === TRANSFER_TOPIC && log.topics.length === 3) {
      // ERC-20 Transfer(from indexed, to indexed, amount in data)
      const from = topicAddress(log.topics[1]);
      const to = topicAddress(log.topics[2]);
      const amount = BigInt(log.data === "0x" ? 0 : log.data);
      if (from === this.#account && to !== this.#account) {
        bump(this.#out, contract, amount);
        this.#recipients.add(to);
      }
      if (to === this.#account && from !== this.#account) bump(this.#in, contract, amount);
    } else if (topic0 === TRANSFER_TOPIC && log.topics.length === 4) {
      // ERC-721 Transfer(from indexed, to indexed, tokenId indexed)
      const from = topicAddress(log.topics[1]);
      const to = topicAddress(log.topics[2]);
      const tokenId = BigInt(log.topics[3] ?? "0x0");
      if (from === this.#account && to !== this.#account) {
        bumpNft(this.#nftsOut, contract, tokenId);
      }
      if (to === this.#account && from !== this.#account) {
        bumpNft(this.#nftsIn, contract, tokenId);
      }
    } else if (topic0 === TRANSFER_SINGLE_TOPIC && log.topics.length === 4) {
      // ERC-1155 TransferSingle(operator indexed, from indexed, to indexed,
      // id, value). Repeated movements of one id aggregate exact uint256 units.
      const from = topicAddress(log.topics[2]);
      const to = topicAddress(log.topics[3]);
      const [id, value] = decodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], log.data);
      if (from === this.#account && to !== this.#account) {
        bumpNft(this.#nftsOut, contract, id, value);
      }
      if (to === this.#account && from !== this.#account) {
        bumpNft(this.#nftsIn, contract, id, value);
      }
    } else if (topic0 === TRANSFER_BATCH_TOPIC && log.topics.length === 4) {
      // ERC-1155 TransferBatch encodes parallel id/value arrays. Duplicate ids
      // are one distinct token id and their quantities aggregate.
      const from = topicAddress(log.topics[2]);
      const to = topicAddress(log.topics[3]);
      const [ids, values] = decodeAbiParameters(
        [{ type: "uint256[]" }, { type: "uint256[]" }],
        log.data,
      );
      if (ids.length !== values.length) throw new Error("malformed ERC-1155 TransferBatch event");
      for (const [index, id] of ids.entries()) {
        const value = values[index];
        if (value === undefined) throw new Error("malformed ERC-1155 TransferBatch event");
        if (from === this.#account && to !== this.#account) {
          bumpNft(this.#nftsOut, contract, id, value);
        }
        if (to === this.#account && from !== this.#account) {
          bumpNft(this.#nftsIn, contract, id, value);
        }
      }
    } else if (topic0 === APPROVAL_TOPIC && log.topics.length === 3) {
      // ERC-20 Approval(owner indexed, spender indexed, amount in data)
      const owner = topicAddress(log.topics[1]);
      const spender = topicAddress(log.topics[2]) as Address;
      if (owner === this.#account) {
        const amount = BigInt(log.data === "0x" ? 0 : log.data);
        // Last write wins per (token, spender) — matches on-chain semantics.
        this.#approvals.set(`${contract}:${spender}`, { token: contract, spender, amount });
      }
    } else if (topic0 === APPROVAL_FOR_ALL_TOPIC && log.topics.length === 3) {
      const owner = topicAddress(log.topics[1]);
      const operator = topicAddress(log.topics[2]) as Address;
      if (owner === this.#account && log.data.endsWith("1")) {
        this.#nftApprovals.set(`${contract}:${operator}`, { collection: contract, operator });
      }
    } else if (topic0 === WETH_DEPOSIT_TOPIC && log.topics.length === 2) {
      // Wrapped-native mint: account receives the wrapper token (no Transfer).
      const dst = topicAddress(log.topics[1]);
      if (dst === this.#account) bump(this.#in, contract, BigInt(log.data === "0x" ? 0 : log.data));
    } else if (topic0 === WETH_WITHDRAWAL_TOPIC && log.topics.length === 2) {
      // Wrapped-native burn: account's wrapper tokens are destroyed.
      const src = topicAddress(log.topics[1]);
      if (src === this.#account)
        bump(this.#out, contract, BigInt(log.data === "0x" ? 0 : log.data));
    }
  }

  summary(): EffectsSummary {
    return {
      assetsOut: [...this.#out.entries()].map(([token, amount]) => ({
        token: token as TokenRef,
        amount: amount.toString(),
      })),
      assetsIn: [...this.#in.entries()].map(([token, amount]) => ({
        token: token as TokenRef,
        amount: amount.toString(),
      })),
      approvals: [...this.#approvals.values()]
        .filter((a) => a.amount > 0n)
        .map((a) => ({ token: a.token, spender: a.spender, amount: a.amount.toString() })),
      nftApprovals: [...this.#nftApprovals.values()],
      nftsOut: summarizeNfts(this.#nftsOut),
      nftsIn: summarizeNfts(this.#nftsIn),
      recipients: [...this.#recipients] as Address[],
    };
  }
}

export function collectLogs(frame: CallFrame): TraceLog[] {
  const logs = [...(frame.logs ?? [])];
  for (const child of frame.calls ?? []) logs.push(...collectLogs(child));
  return logs;
}

function topicAddress(topic: string | undefined): string {
  return topic ? `0x${topic.slice(-40)}`.toLowerCase() : "";
}

function bump(map: Map<string, bigint>, key: string, amount: bigint): void {
  map.set(key, (map.get(key) ?? 0n) + amount);
}

function bumpNft(
  map: Map<string, Map<string, bigint | undefined>>,
  collection: string,
  tokenId: bigint,
  amount?: bigint,
): void {
  if (amount === 0n) return;
  let items = map.get(collection);
  if (!items) {
    items = new Map();
    map.set(collection, items);
  }
  const id = tokenId.toString();
  if (amount === undefined) {
    if (!items.has(id)) items.set(id, undefined);
    return;
  }
  items.set(id, (items.get(id) ?? 0n) + amount);
}

function summarizeNfts(map: Map<string, Map<string, bigint | undefined>>) {
  return [...map.entries()].map(([collection, amounts]) => {
    const items = [...amounts.entries()].map(([tokenId, amount]) => ({
      tokenId,
      ...(amount === undefined ? {} : { amount: amount.toString() }),
    }));
    return { collection: collection as Address, count: items.length, items };
  });
}
