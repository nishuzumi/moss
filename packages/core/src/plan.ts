import { isAddress, keccak256, toHex } from "viem";
import type { TxStep } from "./handle.js";
import type {
  Address,
  CanonicalNftTransfer,
  Expects,
  Hex,
  Plan,
  RiskLabel,
  TokenRef,
  UnsignedTx,
  Verb,
} from "./types.js";
import { parseUint256Decimal } from "./uint.js";

/**
 * What a capability author declares may move, in runtime (bigint) form.
 * Approvals are collected automatically from tagged approve steps.
 */
export interface DeclaredFlows {
  out?: { token: TokenRef; amountMax: bigint }[];
  in?: { token: TokenRef; amountMin: bigint }[];
  nfts?: {
    collection: Address;
    count: number;
    direction: "in" | "out";
    items?: { tokenId: bigint; amountMax?: bigint }[];
  }[];
  /** Required canonical ERC-721/1155 receipts in runtime bigint form. */
  nftTransfers?: DeclaredNftTransfer[];
}

export type DeclaredNftTransfer =
  | {
      kind: "erc721";
      collection: Address;
      from: Address;
      to: Address;
      tokenId: bigint;
    }
  | {
      kind: "erc1155-single";
      collection: Address;
      operator: Address;
      from: Address;
      to: Address;
      tokenId: bigint;
      amount: bigint;
    }
  | {
      kind: "erc1155-batch";
      collection: Address;
      operator: Address;
      from: Address;
      to: Address;
      items: { tokenId: bigint; amount: bigint }[];
    };

/** The value a Capability method returns; core finalizes it into a Plan. */
export interface PlanDraft {
  kind: "planDraft";
  steps: TxStep[];
  flows: DeclaredFlows;
}

/**
 * Validate a transported Plan's expectations.
 *
 * This deliberately lives in core: Plans are a domain contract, while MCP's
 * Zod schema only guards its untrusted JSON boundary. Keep this validator
 * dependency-free apart from viem's address predicate so other Plan consumers
 * cannot accidentally accept a different NFT contract.
 */
export function validateExpects(expects: Expects): void {
  const outTokens = new Set<string>();
  for (const out of expects.out ?? []) {
    validateTokenRef(out.token, "outflow token");
    parseUint256(out.amountMax, "outflow maximum");
    assertUnique(outTokens, out.token.toLowerCase(), "outflow tokens must be distinct");
  }
  const inTokens = new Set<string>();
  for (const incoming of expects.in ?? []) {
    validateTokenRef(incoming.token, "inflow token");
    parseUint256(incoming.amountMin, "inflow minimum");
    assertUnique(inTokens, incoming.token.toLowerCase(), "inflow tokens must be distinct");
  }
  const approvalKeys = new Set<string>();
  for (const approval of expects.approvals ?? []) {
    validateAddress(approval.token, "approval token");
    validateAddress(approval.spender, "approval spender");
    parseUint256(approval.amountMax, "approval maximum");
    assertUnique(
      approvalKeys,
      `${approval.token.toLowerCase()}:${approval.spender.toLowerCase()}`,
      "approval token/spender pairs must be distinct",
    );
  }
  for (const nft of expects.nfts ?? []) {
    validateAddress(nft.collection, "NFT collection");
    if (!Number.isSafeInteger(nft.count) || nft.count < 0) {
      throw new Error("NFT count must be a non-negative safe integer");
    }
    if (nft.direction !== "in" && nft.direction !== "out") {
      throw new Error('NFT direction must be "in" or "out"');
    }
    if (nft.direction === "out" && !nft.items) {
      throw new Error("NFT outflows must declare their token ids");
    }
    if (!nft.items) continue;

    const ids = new Set<string>();
    for (const item of nft.items) {
      parseUint256(item.tokenId, "NFT token ids");
      if (ids.has(item.tokenId))
        throw new Error("NFT token ids must be distinct within one declaration");
      ids.add(item.tokenId);
      if (item.amountMax !== undefined) {
        parseUint256(item.amountMax, "NFT amount caps");
        if (nft.direction === "in")
          throw new Error("NFT inflows cannot declare maximum amount caps");
      }
    }
    if (nft.direction === "out" && nft.count !== ids.size) {
      throw new Error("NFT count must equal the number of declared token ids");
    }
    if (nft.direction === "in" && ids.size > nft.count) {
      throw new Error("Known NFT inflow ids cannot exceed the minimum count");
    }
  }
  for (const transfer of expects.nftTransfers ?? []) {
    validateAddress(transfer.collection, "NFT transfer collection");
    validateAddress(transfer.from, "NFT transfer sender");
    validateAddress(transfer.to, "NFT transfer recipient");
    if (transfer.kind === "erc721") {
      parseUint256(transfer.tokenId, "ERC-721 transfer token id");
    } else {
      validateAddress(transfer.operator, "ERC-1155 transfer operator");
      if (transfer.kind === "erc1155-single") {
        parseUint256(transfer.tokenId, "ERC-1155 transfer token id");
        parseUint256(transfer.amount, "ERC-1155 transfer amount");
      } else if (transfer.kind === "erc1155-batch") {
        for (const item of transfer.items) {
          parseUint256(item.tokenId, "ERC-1155 batch token id");
          parseUint256(item.amount, "ERC-1155 batch amount");
        }
      } else {
        throw new Error("unknown canonical NFT transfer kind");
      }
    }
  }
}

function parseUint256(value: string, label: string): bigint {
  return parseUint256Decimal(value, label);
}

function validateAddress(value: string, label: string): void {
  if (!isAddress(value)) throw new Error(`${label} must be a 20-byte 0x address`);
}

function validateTokenRef(value: string, label: string): void {
  if (value !== "native") validateAddress(value, label);
}

function assertUnique(seen: Set<string>, key: string, message: string): void {
  if (seen.has(key)) throw new Error(message);
  seen.add(key);
}

function serializeNfts(nfts: DeclaredFlows["nfts"]): NonNullable<Expects["nfts"]> {
  return (nfts ?? []).map((nft) => ({
    collection: nft.collection,
    count: nft.count,
    direction: nft.direction,
    ...(nft.items === undefined
      ? {}
      : {
          items: nft.items.map((item) => ({
            tokenId: item.tokenId.toString(),
            ...(item.amountMax === undefined ? {} : { amountMax: item.amountMax.toString() }),
          })),
        }),
  }));
}

function serializeNftTransfers(
  transfers: DeclaredFlows["nftTransfers"],
): NonNullable<Expects["nftTransfers"]> {
  return (transfers ?? []).map((transfer): CanonicalNftTransfer => {
    const base = {
      kind: transfer.kind,
      collection: transfer.collection,
      from: transfer.from,
      to: transfer.to,
    } as const;
    if (transfer.kind === "erc721") {
      return { ...base, kind: transfer.kind, tokenId: transfer.tokenId.toString() };
    }
    if (transfer.kind === "erc1155-single") {
      return {
        ...base,
        kind: transfer.kind,
        operator: transfer.operator,
        tokenId: transfer.tokenId.toString(),
        amount: transfer.amount.toString(),
      };
    }
    return {
      ...base,
      kind: transfer.kind,
      operator: transfer.operator,
      items: transfer.items.map((item) => ({
        tokenId: item.tokenId.toString(),
        amount: item.amount.toString(),
      })),
    };
  });
}

function serializeFlows(flows: DeclaredFlows): Expects {
  return {
    out: (flows.out ?? []).map((flow) => ({
      token: flow.token,
      amountMax: flow.amountMax.toString(),
    })),
    in: (flows.in ?? []).map((flow) => ({
      token: flow.token,
      amountMin: flow.amountMin.toString(),
    })),
    approvals: [],
    nfts: serializeNfts(flows.nfts),
    nftTransfers: serializeNftTransfers(flows.nftTransfers),
  };
}

/**
 * Declare a capability's steps and its quantified expectations (ADR 0004).
 * For a swap, `flows` is nearly a restatement of the decoded params — that is
 * the point: the declaration must be machine-comparable against simulation.
 */
export function plan(steps: TxStep[], flows: DeclaredFlows = {}): PlanDraft {
  if (steps.length === 0) throw new Error("a plan needs at least one step");
  validateExpects(serializeFlows(flows));
  return { kind: "planDraft", steps, flows };
}

/** JSON.stringify with recursively sorted object keys, for stable hashing. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, (v as Record<string, unknown>)[k]]),
      );
    }
    return v;
  });
}

export function computePlanHash(
  p: Pick<Plan, "chainId" | "account" | "txs" | "expects" | "confirms">,
): Hex {
  return keccak256(
    toHex(
      stableStringify({
        chainId: p.chainId,
        account: p.account,
        txs: p.txs,
        expects: p.expects,
        confirms: p.confirms,
      }),
    ),
  );
}

export interface PlanMeta {
  protocol: string;
  method: string;
  verb: Verb;
  chainId: number;
  account: Address;
  intent: string;
  declaredRisk: RiskLabel[];
  confirms?: string[];
}

/**
 * Turn a capability's draft into the self-contained Plan that travels through
 * the agent: attach the account as sender, serialize amounts as decimal
 * strings, fold tagged approve steps into expects, and seal with planHash.
 */
export function finalizePlan(draft: PlanDraft, meta: PlanMeta): Plan {
  const txs: UnsignedTx[] = draft.steps.map((s) => ({
    from: meta.account,
    to: s.to,
    data: s.data,
    value: toHex(s.value),
  }));

  const approvals = draft.steps
    .filter((s) => s.approval !== undefined)
    .map((s) => {
      const a = s.approval as NonNullable<TxStep["approval"]>;
      return { token: a.token, spender: a.spender, amountMax: a.amount.toString() };
    });

  const expects: Expects = { ...serializeFlows(draft.flows), approvals };
  validateExpects(expects);

  const base = {
    chainId: meta.chainId,
    account: meta.account,
    txs,
    expects,
    confirms: meta.confirms ?? [],
  };

  return {
    kind: "plan",
    protocol: meta.protocol,
    method: meta.method,
    verb: meta.verb,
    intent: meta.intent,
    declaredRisk: meta.declaredRisk,
    ...base,
    planHash: computePlanHash(base),
  };
}
