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
  const declaredNftOut = new Map(
    (expects.nfts ?? [])
      .filter((n) => n.direction === "out")
      .map((n) => [n.collection.toLowerCase(), n]),
  );

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

  for (const nft of effects.nftsOut) {
    const declared = declaredNftOut.get(nft.collection.toLowerCase());
    if (!declared || nft.count > declared.count) {
      warnings.push({
        code: "UNDECLARED_NFT_OUT",
        message: `${nft.count} NFT token id(s) from ${nft.collection} leave the account; declared: ${declared?.count ?? 0}`,
      });
    } else if (
      nft.amount !== undefined &&
      declared.amountMax !== undefined &&
      BigInt(nft.amount) > BigInt(declared.amountMax)
    ) {
      warnings.push({
        code: "NFT_OUT_EXCEEDS_MAX",
        message: `${nft.collection} ERC-1155 outflow ${nft.amount} exceeds the declared maximum ${declared.amountMax}`,
      });
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
