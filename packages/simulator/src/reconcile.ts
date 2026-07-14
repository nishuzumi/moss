import { type Expects, NATIVE } from "@themoss/core";
import type { EffectsSummary } from "./effects.js";

export type WarningCode =
  | "REVERTED"
  | "PLAN_TAMPERED"
  | "CONFIRMATION_MISSING"
  | "UNDECLARED_OUTFLOW"
  | "OUTFLOW_EXCEEDS_MAX"
  | "UNDECLARED_APPROVAL"
  | "APPROVAL_EXCEEDS_MAX"
  | "MIN_INFLOW_NOT_MET"
  | "UNDECLARED_NFT_OUT"
  | "NFT_OUT_EXCEEDS_MAX"
  | "NFT_OPERATOR_GRANTED";

export interface Warning {
  code: WarningCode;
  message: string;
}

function label(token: string): string {
  return token === NATIVE ? "native MON" : token;
}

/**
 * Effects reconciliation: the mechanical, server-side comparison between what
 * a Plan declared (expects) and what simulation actually showed. Warns only
 * on UNDECLARED differences — a declared outflow with nothing coming back is
 * legitimate (perp margin, unstake cooldown requests). See ADR 0004.
 *
 * Recipient-level analysis (funds to unknown addresses) needs per-protocol
 * contract allowlists and is deferred; recipients are surfaced in the summary.
 */
export function reconcile(expects: Expects, effects: EffectsSummary): Warning[] {
  const warnings: Warning[] = [];
  const declaredOut = new Map(
    (expects.out ?? []).map((e) => [e.token.toLowerCase(), BigInt(e.amountMax)]),
  );
  const declaredApprovals = (expects.approvals ?? []).map((a) => ({
    token: a.token.toLowerCase(),
    spender: a.spender.toLowerCase(),
    amountMax: BigInt(a.amountMax),
  }));
  const declaredNftOut = new Map<
    string,
    {
      count: number;
      items: Map<string, { tokenId: string; amountMax?: string }>;
      missingItems: boolean;
    }
  >();
  for (const nft of expects.nfts ?? []) {
    if (nft.direction !== "out") continue;
    const key = nft.collection.toLowerCase();
    const merged = declaredNftOut.get(key) ?? {
      count: 0,
      items: new Map(),
      missingItems: false,
    };
    merged.count += nft.count;
    if (!nft.items) {
      merged.missingItems = true;
    } else {
      for (const item of nft.items) {
        const current = merged.items.get(item.tokenId);
        if (!current) {
          merged.items.set(item.tokenId, item);
        } else if (current.amountMax !== undefined && item.amountMax !== undefined) {
          merged.items.set(item.tokenId, {
            tokenId: item.tokenId,
            amountMax: (BigInt(current.amountMax) + BigInt(item.amountMax)).toString(),
          });
        } else {
          // Any uncapped declaration keeps this id uncapped and therefore
          // fail-closed if simulation identifies it as ERC-1155.
          merged.items.set(item.tokenId, { tokenId: item.tokenId });
        }
      }
    }
    declaredNftOut.set(key, merged);
  }

  for (const out of effects.assetsOut) {
    const max = declaredOut.get(out.token.toLowerCase());
    if (max === undefined) {
      warnings.push({
        code: "UNDECLARED_OUTFLOW",
        message: `${out.amount} of ${label(out.token)} leaves the account, but the plan declared no outflow of it`,
      });
    } else if (BigInt(out.amount) > max) {
      warnings.push({
        code: "OUTFLOW_EXCEEDS_MAX",
        message: `${label(out.token)} outflow ${out.amount} exceeds the declared maximum ${max}`,
      });
    }
  }

  for (const approval of effects.approvals) {
    const declared = declaredApprovals.find(
      (d) =>
        d.token === approval.token.toLowerCase() && d.spender === approval.spender.toLowerCase(),
    );
    if (!declared) {
      warnings.push({
        code: "UNDECLARED_APPROVAL",
        message: `approval of ${approval.amount} on ${approval.token} granted to ${approval.spender} was never declared`,
      });
    } else if (BigInt(approval.amount) > declared.amountMax) {
      warnings.push({
        code: "APPROVAL_EXCEEDS_MAX",
        message: `approval to ${approval.spender} on ${approval.token} is ${approval.amount}, above the declared cap ${declared.amountMax}`,
      });
    }
  }

  for (const expected of expects.in ?? []) {
    const actual = effects.assetsIn.find(
      (a) => a.token.toLowerCase() === expected.token.toLowerCase(),
    );
    if (!actual || BigInt(actual.amount) < BigInt(expected.amountMin)) {
      warnings.push({
        code: "MIN_INFLOW_NOT_MET",
        message: `plan declared at least ${expected.amountMin} of ${label(expected.token)} arriving; simulation shows ${actual?.amount ?? "0"}`,
      });
    }
  }

  const declaredNftIn = new Map<
    string,
    { collection: string; knownIds: Set<string>; unknownCount: number }
  >();
  for (const expected of (expects.nfts ?? []).filter((nft) => nft.direction === "in")) {
    const key = expected.collection.toLowerCase();
    const merged = declaredNftIn.get(key) ?? {
      collection: expected.collection,
      knownIds: new Set(),
      unknownCount: 0,
    };
    const knownIds = expected.items?.map((item) => item.tokenId) ?? [];
    for (const tokenId of knownIds) merged.knownIds.add(tokenId);
    merged.unknownCount += Math.max(0, expected.count - knownIds.length);
    declaredNftIn.set(key, merged);
  }

  for (const expected of declaredNftIn.values()) {
    const actual = effects.nftsIn.find(
      (nft) => nft.collection.toLowerCase() === expected.collection.toLowerCase(),
    );
    const minimumCount = expected.knownIds.size + expected.unknownCount;
    if (!actual || actual.count < minimumCount) {
      warnings.push({
        code: "MIN_INFLOW_NOT_MET",
        message: `plan declared at least ${minimumCount} distinct NFT token id(s) arriving from ${expected.collection}; simulation shows ${actual?.count ?? 0}`,
      });
      continue;
    }
    const actualIds = new Set(actual.items.map((item) => item.tokenId));
    for (const tokenId of expected.knownIds) {
      if (!actualIds.has(tokenId)) {
        warnings.push({
          code: "MIN_INFLOW_NOT_MET",
          message: `plan declared NFT token id ${tokenId} arriving from ${expected.collection}, but simulation did not observe it`,
        });
      }
    }
  }

  for (const nft of effects.nftsOut) {
    const declared = declaredNftOut.get(nft.collection.toLowerCase());
    if (!declared) {
      warnings.push({
        code: "UNDECLARED_NFT_OUT",
        message: `${nft.count} NFT token id(s) from ${nft.collection} leave the account, but the plan declared none`,
      });
      continue;
    }
    if (nft.count > declared.count) {
      warnings.push({
        code: "UNDECLARED_NFT_OUT",
        message: `${nft.count} distinct NFT token id(s) from ${nft.collection} leave the account; declared maximum: ${declared.count}`,
      });
    }

    if (declared.missingItems) {
      warnings.push({
        code: "UNDECLARED_NFT_OUT",
        message: `NFT outflow from ${nft.collection} did not declare its token ids`,
      });
      continue;
    }

    for (const item of nft.items) {
      const expected = declared.items.get(item.tokenId);
      if (!expected) {
        warnings.push({
          code: "UNDECLARED_NFT_OUT",
          message: `NFT token id ${item.tokenId} from ${nft.collection} leaves the account but was not declared`,
        });
        continue;
      }
      if (item.amount !== undefined && expected.amountMax === undefined) {
        warnings.push({
          code: "UNDECLARED_NFT_OUT",
          message: `ERC-1155 token id ${item.tokenId} from ${nft.collection} moves ${item.amount} unit(s), but the plan declared no amount cap`,
        });
      } else if (
        item.amount !== undefined &&
        expected.amountMax !== undefined &&
        BigInt(item.amount) > BigInt(expected.amountMax)
      ) {
        warnings.push({
          code: "NFT_OUT_EXCEEDS_MAX",
          message: `${nft.collection} token id ${item.tokenId} ERC-1155 outflow ${item.amount} exceeds the declared maximum ${expected.amountMax}`,
        });
      } else if (item.amount === undefined && expected.amountMax !== undefined) {
        warnings.push({
          code: "UNDECLARED_NFT_OUT",
          message: `${nft.collection} token id ${item.tokenId} was declared as quantified ERC-1155 units, but simulation observed a non-quantified NFT transfer`,
        });
      }
    }
  }

  // Operator grants hand transfer rights over an entire collection and are
  // not declarable in v1 — always surface them.
  for (const grant of effects.nftApprovals) {
    warnings.push({
      code: "NFT_OPERATOR_GRANTED",
      message: `operator ${grant.operator} was granted control over all NFTs in ${grant.collection}`,
    });
  }

  return warnings;
}
