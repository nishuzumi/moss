import type { AddressValue, Hex } from "@themoss/core";
import { getAddress, isAddress } from "viem";
import type { MerklRewardBreakdown, MerklRewardCandidate } from "./types.js";

export const MERKL_API_URL = "https://api.merkl.xyz";
export const MERKL_CHAIN_ID = 143;

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 4_000_000;
const MAX_REWARD_RECORDS = 128;
const MAX_BREAKDOWNS_PER_REWARD = 512;
const UINT256_MAX = 2n ** 256n - 1n;

export async function fetchMerklRewardCandidates(
  account: AddressValue,
  options: { reload: boolean },
): Promise<readonly MerklRewardCandidate[]> {
  const query = new URLSearchParams({ chainId: String(MERKL_CHAIN_ID) });
  if (options.reload) query.set("reloadChainId", String(MERKL_CHAIN_ID));
  const url = `${MERKL_API_URL}/v4/users/${account}/rewards?${query}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Merkl rewards request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw new Error(`Merkl rewards request failed: ${errorMessage(error)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `Merkl rewards request failed with HTTP ${response.status}; retry after checking api.merkl.xyz status`,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await readBoundedResponse(response));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Merkl rewards response")) throw error;
    throw new Error(`Merkl rewards response is not valid JSON: ${errorMessage(error)}`);
  }

  return parseMerklRewardsResponse(payload, account);
}

export function parseMerklRewardsResponse(
  payload: unknown,
  account: AddressValue,
): readonly MerklRewardCandidate[] {
  if (!Array.isArray(payload)) throw schemaError("top level must be an array");
  if (payload.length > 1) throw schemaError("expected at most one chain result for chainId=143");
  if (payload.length === 0) return [];

  const chainResult = record(payload[0], "chain result");
  const chain = record(chainResult.chain, "chain result.chain");
  parseChainId(chain.id, "chain result.chain.id");

  if (!Array.isArray(chainResult.rewards)) {
    throw schemaError("chain result.rewards must be an array");
  }
  if (chainResult.rewards.length > MAX_REWARD_RECORDS) {
    throw schemaError(`reward count exceeds ${MAX_REWARD_RECORDS}`);
  }

  const candidates = chainResult.rewards.map((value, index) => parseReward(value, account, index));
  const tokens = new Set<string>();
  let root: string | undefined;
  for (const candidate of candidates) {
    const token = candidate.token.toLowerCase();
    if (tokens.has(token)) throw schemaError(`duplicate token record ${candidate.token}`);
    tokens.add(token);
    if (root !== undefined && root !== candidate.root.toLowerCase()) {
      throw schemaError("reward records disagree on the Merkle root");
    }
    root = candidate.root.toLowerCase();
  }
  return candidates;
}

function parseReward(value: unknown, account: AddressValue, index: number): MerklRewardCandidate {
  const path = `chain result.rewards[${index}]`;
  const reward = record(value, path);
  parseChainId(reward.distributionChainId, `${path}.distributionChainId`);
  const recipient = parseAddress(reward.recipient, `${path}.recipient`);
  if (!sameAddress(recipient, account)) {
    throw schemaError(`${path}.recipient does not match requested account ${account}`);
  }

  const token = record(reward.token, `${path}.token`);
  parseChainId(token.chainId, `${path}.token.chainId`);
  const tokenAddress = parseAddress(token.address, `${path}.token.address`);
  const cumulativeAmount = parseUnsignedInteger(reward.amount, `${path}.amount`);
  const apiClaimedAmount = parseUnsignedInteger(reward.claimed, `${path}.claimed`);
  const pendingAmount = parseUnsignedInteger(reward.pending, `${path}.pending`);
  if (apiClaimedAmount > cumulativeAmount) {
    throw schemaError(`${path}.claimed exceeds cumulative amount`);
  }

  const root = parseBytes32(reward.root, `${path}.root`);
  if (!Array.isArray(reward.proofs)) throw schemaError(`${path}.proofs must be an array`);
  const proofs = reward.proofs.map((proof, proofIndex) =>
    parseBytes32(proof, `${path}.proofs[${proofIndex}]`),
  );
  if (cumulativeAmount > 0n && proofs.length === 0) {
    throw schemaError(`${path}.proofs must not be empty for a positive cumulative amount`);
  }

  return {
    root,
    recipient,
    token: tokenAddress,
    cumulativeAmount,
    apiClaimedAmount,
    pendingAmount,
    proofs,
    breakdowns: parseBreakdowns(reward.breakdowns, path, root),
  };
}

function parseBreakdowns(
  value: unknown,
  rewardPath: string,
  expectedRoot: Hex,
): readonly MerklRewardBreakdown[] {
  if (!Array.isArray(value)) throw schemaError(`${rewardPath}.breakdowns must be an array`);
  if (value.length > MAX_BREAKDOWNS_PER_REWARD) {
    throw schemaError(`${rewardPath}.breakdowns count exceeds ${MAX_BREAKDOWNS_PER_REWARD}`);
  }
  return value.map((entry, index) => {
    const path = `${rewardPath}.breakdowns[${index}]`;
    const breakdown = record(entry, path);
    parseChainId(breakdown.distributionChainId, `${path}.distributionChainId`);
    const root = parseBytes32(breakdown.root, `${path}.root`);
    if (root.toLowerCase() !== expectedRoot.toLowerCase()) {
      throw schemaError(`${path}.root does not match its reward root`);
    }
    if (typeof breakdown.reason !== "string" || breakdown.reason.length === 0) {
      throw schemaError(`${path}.reason must be a non-empty string`);
    }
    if (
      typeof breakdown.opportunityId !== "string" ||
      !/^(?:0|[1-9]\d*)$/.test(breakdown.opportunityId)
    ) {
      throw schemaError(`${path}.opportunityId must be an unsigned integer string`);
    }
    const amount = parseUnsignedInteger(breakdown.amount, `${path}.amount`);
    const claimed = parseUnsignedInteger(breakdown.claimed, `${path}.claimed`);
    const pending = parseUnsignedInteger(breakdown.pending, `${path}.pending`);
    if (claimed > amount) throw schemaError(`${path}.claimed exceeds amount`);
    return {
      reason: breakdown.reason,
      amount: amount.toString(),
      claimed: claimed.toString(),
      pending: pending.toString(),
      campaignId: parseBytes32(breakdown.campaignId, `${path}.campaignId`),
      opportunityId: breakdown.opportunityId,
    };
  });
}

async function readBoundedResponse(response: Response): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
      throw new Error(`Merkl rewards response exceeds ${MAX_RESPONSE_BYTES} bytes`);
    }
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new Error(`Merkl rewards response exceeds ${MAX_RESPONSE_BYTES} bytes`);
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error(`Merkl rewards response exceeds ${MAX_RESPONSE_BYTES} bytes`);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function parseChainId(value: unknown, path: string): void {
  if (value !== MERKL_CHAIN_ID) throw schemaError(`${path} must equal ${MERKL_CHAIN_ID}`);
}

function parseAddress(value: unknown, path: string): AddressValue {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw schemaError(`${path} must be a 20-byte EVM address`);
  }
  return getAddress(value);
}

function parseBytes32(value: unknown, path: string): Hex {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw schemaError(`${path} must be a 32-byte hex value`);
  }
  return value as Hex;
}

function parseUnsignedInteger(value: unknown, path: string): bigint {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)$/.test(value)) {
    throw schemaError(`${path} must be an unsigned integer string`);
  }
  const parsed = BigInt(value);
  if (parsed > UINT256_MAX) throw schemaError(`${path} exceeds uint256`);
  return parsed;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw schemaError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function schemaError(detail: string): Error {
  return new Error(`Merkl rewards API schema error: ${detail}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
