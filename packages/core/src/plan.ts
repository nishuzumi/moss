import { keccak256, toHex } from "viem";
import type { TxStep } from "./handle.js";
import type {
  Address,
  Expects,
  Hex,
  Plan,
  RiskLabel,
  TokenRef,
  UnsignedTx,
  Verb,
} from "./types.js";

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
}

/** The value a Capability method returns; core finalizes it into a Plan. */
export interface PlanDraft {
  kind: "planDraft";
  steps: TxStep[];
  flows: DeclaredFlows;
}

/**
 * Declare a capability's steps and its quantified expectations (ADR 0004).
 * For a swap, `flows` is nearly a restatement of the decoded params — that is
 * the point: the declaration must be machine-comparable against simulation.
 */
export function plan(steps: TxStep[], flows: DeclaredFlows = {}): PlanDraft {
  if (steps.length === 0) throw new Error("a plan needs at least one step");
  for (const nft of flows.nfts ?? []) {
    if (!Number.isSafeInteger(nft.count) || nft.count < 0) {
      throw new Error("NFT count must be a non-negative safe integer");
    }
    if (nft.direction === "out" && !nft.items) {
      throw new Error("NFT outflows must declare their token ids");
    }
    if (nft.items) {
      for (const item of nft.items) {
        if (item.tokenId < 0n) throw new Error("NFT token ids must be uint256 values");
        if (item.amountMax !== undefined && item.amountMax < 0n) {
          throw new Error("NFT amount caps must be uint256 values");
        }
        if (nft.direction === "in" && item.amountMax !== undefined) {
          throw new Error("NFT inflows cannot declare maximum amount caps");
        }
      }
      const ids = nft.items.map((item) => item.tokenId.toString());
      if (new Set(ids).size !== ids.length) {
        throw new Error("NFT token ids must be distinct within one declaration");
      }
      if (nft.direction === "out" && nft.count !== ids.length) {
        throw new Error("NFT count must equal the number of declared token ids");
      }
      if (nft.direction === "in" && ids.length > nft.count) {
        throw new Error("Known NFT inflow ids cannot exceed the minimum count");
      }
    }
  }
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

  const expects: Expects = {
    out: (draft.flows.out ?? []).map((f) => ({
      token: f.token,
      amountMax: f.amountMax.toString(),
    })),
    in: (draft.flows.in ?? []).map((f) => ({ token: f.token, amountMin: f.amountMin.toString() })),
    approvals,
    nfts: (draft.flows.nfts ?? []).map((nft) => ({
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
    })),
  };

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
