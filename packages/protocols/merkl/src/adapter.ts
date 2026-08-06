import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type ParamsSpec,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { ERC20, ERC20Abi } from "@themoss/erc";
import { concatHex, decodeEventLog, encodeAbiParameters, getAddress, keccak256 } from "viem";
import { distributorAbi } from "./abis/distributor.js";
import { fetchMerklRewardCandidates } from "./api.js";
import type {
  MerklClaimOutcome,
  MerklReward,
  MerklRewardCandidate,
  MerklRewardsResult,
} from "./types.js";

// Monad mainnet canonical sources:
// - Monad protocol registry: https://github.com/monad-developers/protocols/blob/main/mainnet/merkl.jsonc
// - Merkl docs: https://docs.merkl.xyz/integrate-merkl/smart-contract-addresses
// The address is an ERC-1967/UUPS proxy. abis.json and the online suites pin
// its deployed bytecode and current implementation.
export const MERKL_DISTRIBUTOR_ADDRESS: AddressValue = "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae";

export const MERKL_DISTRIBUTOR_IMPLEMENTATION: AddressValue =
  "0x3f0fa7847b1b2e4515a93e05b29f115d9bb51d85";

export const MAX_MERKL_CLAIM_TOKENS = 16;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const ZERO_ROOT = `0x${"00".repeat(32)}` as Hex;

const RewardTokenList = Address.array()
  .min(1)
  .max(MAX_MERKL_CLAIM_TOKENS)
  .refine(
    (tokens) => new Set(tokens.map((token) => token.toLowerCase())).size === tokens.length,
    "Reward token addresses must be unique.",
  )
  .describe(`An ordered list of 1 through ${MAX_MERKL_CLAIM_TOKENS} unique EVM token addresses.`);

const rewardsParams = {
  account: {
    type: Address,
    description: "Public account whose Monad Merkl rewards are inspected.",
  },
} satisfies ParamsSpec;

const claimParams = {
  tokens: {
    type: RewardTokenList,
    description: "Reward tokens selected from the current merkl.rewards result, in claim order.",
  },
} satisfies ParamsSpec;

interface RewardOnchainState {
  onchainClaimedAmount: bigint;
  effectiveRecipient: AddressValue;
}

@Protocol({
  name: "merkl",
  category: "rewards",
  description:
    "Merkl reward discovery and safe self-claiming through the fixed Monad mainnet Distributor.",
  contracts: {
    distributor: { abi: distributorAbi, addr: MERKL_DISTRIBUTOR_ADDRESS },
  },
  protocols: {
    erc20: ERC20,
  },
  labels: {
    Distributor: MERKL_DISTRIBUTOR_ADDRESS,
  },
})
export class MerklProtocol {
  declare distributor: Handle<typeof distributorAbi>;
  declare erc20: ProtocolRef<ERC20>;

  @Query({
    intent: "Inspect an account's Merkl rewards on Monad mainnet",
    params: rewardsParams,
    tags: ["rewards", "merkle", "incentives"],
  })
  async rewards(params: InferParams<typeof rewardsParams>): Promise<MerklRewardsResult> {
    const candidates = await fetchMerklRewardCandidates(params.account, { reload: false });
    const [merkleRoot, defaultRecipient] = await Promise.all([
      this.distributor.read.getMerkleRoot(),
      this.distributor.read.claimRecipient([params.account, ZERO_ADDRESS]),
    ]);
    const states = await Promise.all(
      candidates.map((candidate) =>
        this.#readRewardState(params.account, candidate.token, defaultRecipient),
      ),
    );

    return {
      account: getAddress(params.account),
      merkleRoot,
      rewards: candidates.map((candidate, index) =>
        queryReward(params.account, merkleRoot, candidate, states[index] as RewardOnchainState),
      ),
    };
  }

  @Capability<MerklProtocol, typeof claimParams>({
    intent: "Claim selected Merkl reward tokens to the acting account",
    verb: "claim",
    params: claimParams,
    receipt: "claimReceipt",
    // The claim is inflow-only. Registry currently rejects an empty risk list
    // and core has no accepted fundIn label; follow the aPriori claim precedent
    // until the framework gains a semantically correct inflow label.
    risk: ["fundOut"],
    tags: ["rewards", "merkle", "batch-claim", "incentives"],
  })
  async claim(params: InferParams<typeof claimParams>, ctx: ActionCtx) {
    const account = getAddress(ctx.account);
    const candidates = await fetchMerklRewardCandidates(account, { reload: true });
    const byToken = new Map(
      candidates.map((candidate) => [candidate.token.toLowerCase(), candidate]),
    );
    const selected = params.tokens.map((token) => {
      const candidate = byToken.get(token.toLowerCase());
      if (!candidate)
        throw new Error(`Merkl has no current reward record for selected token ${token}`);
      return candidate;
    });

    const [merkleRoot, defaultRecipient] = await Promise.all([
      this.distributor.read.getMerkleRoot(),
      this.distributor.read.claimRecipient([account, ZERO_ADDRESS]),
    ]);
    if (sameHex(merkleRoot, ZERO_ROOT)) {
      throw new Error("Merkl Distributor has no active Merkle root");
    }
    const states = await Promise.all(
      selected.map((candidate) =>
        this.#readRewardState(account, candidate.token, defaultRecipient),
      ),
    );

    selected.forEach((candidate, index) => {
      const state = states[index] as RewardOnchainState;
      if (candidate.cumulativeAmount <= state.onchainClaimedAmount) {
        throw new Error(
          `Merkl reward ${candidate.token} has no positive incremental claim: cumulative ${candidate.cumulativeAmount}, on-chain claimed ${state.onchainClaimedAmount}`,
        );
      }
      if (!sameHex(candidate.root, merkleRoot)) {
        throw new Error(
          `Merkl reward ${candidate.token} proof root ${candidate.root} does not match active root ${merkleRoot}`,
        );
      }
      if (
        !verifyMerklProof(
          account,
          candidate.token,
          candidate.cumulativeAmount,
          candidate.proofs,
          merkleRoot,
        )
      ) {
        throw new Error(`Merkl reward ${candidate.token} proof does not match the active root`);
      }
      if (!sameAddress(state.effectiveRecipient, account)) {
        throw new Error(
          `Merkl reward ${candidate.token} redirects claims to ${state.effectiveRecipient}; safe self-claim requires recipient ${account}`,
        );
      }
    });

    return [
      this.distributor.claim([
        selected.map(() => account),
        selected.map((candidate) => candidate.token),
        selected.map((candidate) => candidate.cumulativeAmount),
        selected.map((candidate) => candidate.proofs),
      ]),
    ];
  }

  @Receipt()
  claimReceipt(changes: readonly Change[]): ReceiptResult<MerklClaimOutcome> {
    if (changes.length === 0 || changes.length % 2 !== 0) {
      throw new Error("Merkl claim Receipt requires one ordered Claimed/Transfer pair per reward");
    }

    let account: AddressValue | undefined;
    const seenTokens = new Set<string>();
    const rewards: MerklClaimOutcome["rewards"][number][] = [];
    const parsed: ReceiptResult["changes"][number][] = [];

    for (let index = 0; index < changes.length; index += 2) {
      const claimedChange = changes[index];
      const transferChange = changes[index + 1];
      if (!claimedChange || !transferChange) {
        throw new Error("Merkl claim Receipt requires complete Claimed/Transfer pairs");
      }
      const claimed = decodeClaimed(claimedChange);
      if (claimed.amount === 0n) throw new Error("Merkl claim Receipt rejects zero-amount claims");
      if (account !== undefined && !sameAddress(account, claimed.user)) {
        throw new Error("Merkl claim Receipt saw Claimed events for different users");
      }
      account = getAddress(claimed.user);
      const tokenKey = claimed.token.toLowerCase();
      if (seenTokens.has(tokenKey)) {
        throw new Error(`Merkl claim Receipt saw duplicate Claimed evidence for ${claimed.token}`);
      }
      seenTokens.add(tokenKey);

      const transfer = decodeRewardTransfer(transferChange, claimed.token);
      if (!sameAddress(transfer.from, MERKL_DISTRIBUTOR_ADDRESS)) {
        throw new Error("Merkl claim Receipt requires Transfer sender to be the Distributor");
      }
      if (!sameAddress(transfer.to, claimed.user)) {
        throw new Error("Merkl claim Receipt requires Transfer recipient to equal Claimed.user");
      }
      if (transfer.value !== claimed.amount) {
        throw new Error("Merkl claim Receipt requires Transfer value to equal Claimed.amount");
      }

      const reward = { token: getAddress(claimed.token), amount: claimed.amount.toString() };
      rewards.push(reward);
      parsed.push({
        kind: "change",
        change: claimedChange,
        data: { operation: "claim", account, ...reward },
        text: `Merkl Claim: ${reward.amount} of ${reward.token} paid by ${MERKL_DISTRIBUTOR_ADDRESS} to ${account}`,
      });
      parsed.push(this.erc20.changesReceipt([transferChange]));
    }

    if (!account) throw new Error("Merkl claim Receipt has no self-claim account evidence");
    const outcome: MerklClaimOutcome = { operation: "claim", account, rewards };
    return {
      kind: "receipt",
      outcome,
      text: `Merkl Claim: ${rewards.length} reward token(s) paid to ${account}`,
      changes: parsed,
    };
  }

  async #readRewardState(
    account: AddressValue,
    token: AddressValue,
    defaultRecipient: AddressValue,
  ): Promise<RewardOnchainState> {
    const [claim, tokenRecipient] = await Promise.all([
      this.distributor.read.claimed([account, token]),
      this.distributor.read.claimRecipient([account, token]),
    ]);
    const effectiveRecipient = !sameAddress(tokenRecipient, ZERO_ADDRESS)
      ? tokenRecipient
      : !sameAddress(defaultRecipient, ZERO_ADDRESS)
        ? defaultRecipient
        : account;
    return { onchainClaimedAmount: claim[0], effectiveRecipient: getAddress(effectiveRecipient) };
  }
}

export function merklLeaf(
  account: AddressValue,
  token: AddressValue,
  cumulativeAmount: bigint,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint256" }],
      [account, token, cumulativeAmount],
    ),
  );
}

export function verifyMerklProof(
  account: AddressValue,
  token: AddressValue,
  cumulativeAmount: bigint,
  proofs: readonly Hex[],
  root: Hex,
): boolean {
  let current = merklLeaf(account, token, cumulativeAmount);
  for (const proof of proofs) {
    current =
      BigInt(current) < BigInt(proof)
        ? keccak256(concatHex([current, proof]))
        : keccak256(concatHex([proof, current]));
  }
  return sameHex(current, root);
}

function queryReward(
  account: AddressValue,
  merkleRoot: Hex,
  candidate: MerklRewardCandidate,
  state: RewardOnchainState,
): MerklReward {
  const claimable =
    candidate.cumulativeAmount > state.onchainClaimedAmount
      ? candidate.cumulativeAmount - state.onchainClaimedAmount
      : 0n;
  let unavailableReason: string | undefined;
  if (sameHex(merkleRoot, ZERO_ROOT)) unavailableReason = "Distributor has no active Merkle root.";
  else if (!sameHex(candidate.root, merkleRoot))
    unavailableReason = "API proof targets a stale Merkle root.";
  else if (candidate.cumulativeAmount < state.onchainClaimedAmount) {
    unavailableReason = "API cumulative amount is behind the on-chain claimed amount.";
  } else if (claimable === 0n) unavailableReason = "No newly claimable reward is available.";
  else if (candidate.proofs.length === 0) unavailableReason = "API did not provide a Merkle proof.";
  else if (!sameAddress(state.effectiveRecipient, account)) {
    unavailableReason = `On-chain recipient mapping redirects this token to ${state.effectiveRecipient}.`;
  }

  return {
    token: candidate.token,
    cumulativeAmount: candidate.cumulativeAmount.toString(),
    apiClaimedAmount: candidate.apiClaimedAmount.toString(),
    onchainClaimedAmount: state.onchainClaimedAmount.toString(),
    claimableAmount: claimable.toString(),
    pendingAmount: candidate.pendingAmount.toString(),
    proofLength: candidate.proofs.length,
    effectiveRecipient: state.effectiveRecipient,
    claimableNow: unavailableReason === undefined,
    ...(unavailableReason ? { unavailableReason } : {}),
    breakdowns: candidate.breakdowns,
  };
}

function decodeClaimed(change: Change) {
  if (change.kind !== "event" || !sameAddress(change.address, MERKL_DISTRIBUTOR_ADDRESS)) {
    throw new Error("Merkl claim Receipt requires Claimed emitted by the fixed Distributor");
  }
  try {
    const decoded = decodeEventLog({
      abi: distributorAbi,
      eventName: "Claimed",
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
    return decoded.args;
  } catch {
    throw new Error("Merkl claim Receipt encountered malformed or unsupported Distributor event");
  }
}

function decodeRewardTransfer(change: Change, token: AddressValue) {
  if (change.kind !== "event" || !sameAddress(change.address, token)) {
    throw new Error("Merkl claim Receipt requires Transfer emitted by the claimed token");
  }
  try {
    const decoded = decodeEventLog({
      abi: ERC20Abi,
      eventName: "Transfer",
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
    return decoded.args;
  } catch {
    throw new Error("Merkl claim Receipt encountered malformed or unsupported token event");
  }
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function sameHex(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
