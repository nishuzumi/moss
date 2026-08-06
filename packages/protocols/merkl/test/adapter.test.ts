import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import {
  concatHex,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  keccak256,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { distributorAbi } from "../src/abis/distributor.js";
import { parseMerklRewardsResponse } from "../src/api.js";
import {
  MAX_MERKL_CLAIM_TOKENS,
  MERKL_DISTRIBUTOR_ADDRESS,
  MerklProtocol,
  merklLeaf,
} from "../src/index.js";

const ACCOUNT = getAddress("0x461549c73FFfB676860A0E49F5DaABEcf4E8D2d7");
const OTHER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const TOKEN_A = getAddress("0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A");
const TOKEN_B = getAddress("0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");
const AMOUNT_A = 100n;
const AMOUNT_B = 200n;
const LEAF_A = merklLeaf(ACCOUNT, TOKEN_A, AMOUNT_A);
const LEAF_B = merklLeaf(ACCOUNT, TOKEN_B, AMOUNT_B);
const ROOT = hashPair(LEAF_A, LEAF_B);
const WRONG_ROOT = `0x${"99".repeat(32)}` as Hex;

afterEach(() => vi.unstubAllGlobals());

function hashPair(a: Hex, b: Hex): Hex {
  return BigInt(a) < BigInt(b) ? keccak256(concatHex([a, b])) : keccak256(concatHex([b, a]));
}

function reward(
  token: string,
  amount: string,
  proof: readonly Hex[],
  overrides: Record<string, unknown> = {},
) {
  return {
    root: ROOT,
    distributionChainId: 143,
    recipient: ACCOUNT,
    amount,
    claimed: "0",
    pending: "3",
    proofs: proof,
    token: { chainId: 143, address: token, decimals: 18, symbol: "TEST" },
    breakdowns: [
      {
        root: ROOT,
        distributionChainId: 143,
        reason: "fixture",
        amount,
        claimed: "0",
        pending: "3",
        campaignId: `0x${"11".repeat(32)}`,
        opportunityId: "1",
      },
    ],
    ...overrides,
  };
}

function payload(rewards = [reward(TOKEN_A, AMOUNT_A.toString(), [LEAF_B])]) {
  return [{ chain: { id: 143, name: "Monad" }, rewards }];
}

interface OfflineOptions {
  apiPayload?: unknown;
  root?: Hex;
  claimed?: Readonly<Record<string, bigint>>;
  tokenRecipients?: Readonly<Record<string, string>>;
  defaultRecipient?: string;
  fetchError?: Error;
}

function offline(options: OfflineOptions = {}) {
  const root = options.root ?? ROOT;
  const fetchMock = options.fetchError
    ? vi.fn().mockRejectedValue(options.fetchError)
    : vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(options.apiPayload ?? payload()), { status: 200 }),
        );
  vi.stubGlobal("fetch", fetchMock);
  const readContract = vi.fn(
    async (request: { functionName: string; args?: readonly unknown[] }) => {
      switch (request.functionName) {
        case "getMerkleRoot":
          return root;
        case "claimed": {
          const token = String(request.args?.[1]).toLowerCase();
          return [options.claimed?.[token] ?? 0n, 0, root] as const;
        }
        case "claimRecipient": {
          const token = String(request.args?.[1]).toLowerCase();
          if (token === ZERO.toLowerCase()) return getAddress(options.defaultRecipient ?? ZERO);
          return getAddress(options.tokenRecipients?.[token] ?? ZERO);
        }
        default:
          throw new Error(`unexpected read ${request.functionName}`);
      }
    },
  );
  const runtime = {
    rpcUrl: "http://offline",
    client: { readContract } as unknown as MossRuntime["client"],
  };
  return { registry: new Registry(runtime).use(MerklProtocol), readContract, fetchMock };
}

async function claimCapability(options: OfflineOptions = {}, tokens = [TOKEN_A]) {
  const { registry, ...rest } = offline(options);
  const capability = await registry.action("merkl", "claim", ACCOUNT, { tokens });
  if (capability.kind !== "capability") throw new Error("expected Capability");
  return { registry, capability, ...rest };
}

describe("Merkl API validation", () => {
  it("parses a real-shaped Monad response and campaign breakdown", () => {
    const [candidate] = parseMerklRewardsResponse(payload(), ACCOUNT);
    expect(candidate).toMatchObject({
      token: TOKEN_A,
      cumulativeAmount: AMOUNT_A,
      pendingAmount: 3n,
    });
    expect(candidate?.breakdowns[0]).toMatchObject({ reason: "fixture", amount: "100" });
  });

  it("rejects malformed top-level and wrong-chain responses", () => {
    expect(() => parseMerklRewardsResponse({}, ACCOUNT)).toThrow(/top level/);
    const wrong = payload();
    (wrong[0] as { chain: { id: number } }).chain.id = 1;
    expect(() => parseMerklRewardsResponse(wrong, ACCOUNT)).toThrow(/must equal 143/);
  });

  it("rejects invalid addresses, amounts, proofs, and inconsistent recipients", () => {
    expect(() =>
      parseMerklRewardsResponse(payload([reward("bad", "100", [LEAF_B])]), ACCOUNT),
    ).toThrow(/token.address/);
    expect(() =>
      parseMerklRewardsResponse(payload([reward(TOKEN_A, "1.5", [LEAF_B])]), ACCOUNT),
    ).toThrow(/unsigned integer/);
    expect(() =>
      parseMerklRewardsResponse(payload([reward(TOKEN_A, "100", ["0x01" as Hex])]), ACCOUNT),
    ).toThrow(/32-byte/);
    expect(() =>
      parseMerklRewardsResponse(
        payload([reward(TOKEN_A, "100", [LEAF_B], { recipient: OTHER })]),
        ACCOUNT,
      ),
    ).toThrow(/does not match/);
  });

  it("rejects duplicate tokens and empty proofs for positive rewards", () => {
    expect(() => parseMerklRewardsResponse(payload([reward(TOKEN_A, "100", [])]), ACCOUNT)).toThrow(
      /must not be empty/,
    );
    expect(() =>
      parseMerklRewardsResponse(
        payload([reward(TOKEN_A, "100", [LEAF_B]), reward(TOKEN_A.toLowerCase(), "100", [LEAF_B])]),
        ACCOUNT,
      ),
    ).toThrow(/duplicate token/);
    expect(() =>
      parseMerklRewardsResponse(
        payload([
          reward(TOKEN_A, "100", [LEAF_B], {
            breakdowns: [
              {
                ...reward(TOKEN_A, "100", [LEAF_B]).breakdowns[0],
                root: WRONG_ROOT,
              },
            ],
          }),
        ]),
        ACCOUNT,
      ),
    ).toThrow(/does not match its reward root/);
  });
});

describe("merkl.rewards", () => {
  it("cross-checks API totals with on-chain claimed state and recipient", async () => {
    const { registry } = offline({ claimed: { [TOKEN_A.toLowerCase()]: 40n } });
    const result = await registry.action("merkl", "rewards", OTHER, { account: ACCOUNT });
    expect(result).toMatchObject({
      kind: "query",
      data: {
        account: ACCOUNT,
        merkleRoot: ROOT,
        rewards: [
          {
            token: TOKEN_A,
            cumulativeAmount: "100",
            apiClaimedAmount: "0",
            onchainClaimedAmount: "40",
            claimableAmount: "60",
            pendingAmount: "3",
            proofLength: 1,
            effectiveRecipient: ACCOUNT,
            claimableNow: true,
          },
        ],
      },
    });
  });

  it("keeps pending-only rewards separate and non-claimable", async () => {
    const pendingOnly = reward(TOKEN_A, "0", [], { pending: "9", breakdowns: [] });
    const { registry } = offline({ apiPayload: payload([pendingOnly]) });
    const result = await registry.action("merkl", "rewards", ACCOUNT, { account: ACCOUNT });
    expect(result).toMatchObject({
      kind: "query",
      data: { rewards: [{ claimableAmount: "0", pendingAmount: "9", claimableNow: false }] },
    });
  });

  it("uses on-chain claimed state even when it is ahead of the API", async () => {
    const { registry } = offline({ claimed: { [TOKEN_A.toLowerCase()]: 101n } });
    const result = await registry.action("merkl", "rewards", ACCOUNT, { account: ACCOUNT });
    expect(result).toMatchObject({
      kind: "query",
      data: {
        rewards: [
          {
            claimableAmount: "0",
            claimableNow: false,
            unavailableReason: expect.stringContaining("behind"),
          },
        ],
      },
    });
  });
});

describe("merkl.claim construction", () => {
  it("uses ActionCtx.account, cumulative amounts, requested order, and one fixed transaction", async () => {
    const apiPayload = payload([
      reward(TOKEN_A, AMOUNT_A.toString(), [LEAF_B]),
      reward(TOKEN_B, AMOUNT_B.toString(), [LEAF_A]),
    ]);
    const { capability, fetchMock } = await claimCapability({ apiPayload }, [TOKEN_B, TOKEN_A]);
    const flattened = flattenCapabilityTree(capability);
    expect(flattened).toHaveLength(1);
    expect(flattened[0]?.transaction.to).toBe(MERKL_DISTRIBUTOR_ADDRESS);
    const decoded = decodeFunctionData({
      abi: distributorAbi,
      data: flattened[0]?.transaction.data as Hex,
    });
    expect(decoded.functionName).toBe("claim");
    expect(decoded.args).toEqual([
      [ACCOUNT, ACCOUNT],
      [TOKEN_B, TOKEN_A],
      [AMOUNT_B, AMOUNT_A],
      [[LEAF_A], [LEAF_B]],
    ]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("reloadChainId=143");
  });

  it("rejects missing selected tokens, duplicate requests, and oversized batches", async () => {
    const { registry } = offline();
    await expect(registry.action("merkl", "claim", ACCOUNT, { tokens: [] })).rejects.toThrow();
    await expect(registry.action("merkl", "claim", ACCOUNT, { tokens: [TOKEN_B] })).rejects.toThrow(
      /no current reward record/,
    );
    await expect(
      registry.action("merkl", "claim", ACCOUNT, { tokens: [TOKEN_A, TOKEN_A.toLowerCase()] }),
    ).rejects.toThrow(/unique/);
    const many = Array.from(
      { length: MAX_MERKL_CLAIM_TOKENS + 1 },
      (_, index) => `0x${index.toString(16).padStart(40, "0")}`,
    );
    await expect(registry.action("merkl", "claim", ACCOUNT, { tokens: many })).rejects.toThrow();
  });

  it("rejects non-positive increments, empty active roots, and proof mismatches", async () => {
    await expect(
      claimCapability({ claimed: { [TOKEN_A.toLowerCase()]: AMOUNT_A } }),
    ).rejects.toThrow(/no positive incremental/);
    await expect(
      claimCapability({ claimed: { [TOKEN_A.toLowerCase()]: AMOUNT_A + 1n } }),
    ).rejects.toThrow(/no positive incremental/);
    await expect(claimCapability({ root: `0x${"00".repeat(32)}` as Hex })).rejects.toThrow(
      /no active Merkle root/,
    );
    await expect(claimCapability({ root: WRONG_ROOT })).rejects.toThrow(
      /does not match active root/,
    );
    const invalidReward = reward(TOKEN_A, AMOUNT_A.toString(), [WRONG_ROOT], {
      root: WRONG_ROOT,
    });
    const invalid = payload([
      {
        ...invalidReward,
        breakdowns: invalidReward.breakdowns.map((breakdown) => ({
          ...breakdown,
          root: WRONG_ROOT,
        })),
      },
    ]);
    await expect(claimCapability({ apiPayload: invalid, root: WRONG_ROOT })).rejects.toThrow(
      /proof does not match/,
    );
  });

  it("rejects token-specific and default redirections but accepts explicit self-recipient", async () => {
    await expect(
      claimCapability({ tokenRecipients: { [TOKEN_A.toLowerCase()]: OTHER } }),
    ).rejects.toThrow(/redirects claims/);
    await expect(claimCapability({ defaultRecipient: OTHER })).rejects.toThrow(/redirects claims/);
    await expect(
      claimCapability({ tokenRecipients: { [TOKEN_A.toLowerCase()]: ACCOUNT } }),
    ).resolves.toBeDefined();
  });

  it("surfaces API and network failures", async () => {
    await expect(claimCapability({ apiPayload: { drifted: true } })).rejects.toThrow(
      /schema error/,
    );
    await expect(claimCapability({ fetchError: new Error("offline") })).rejects.toThrow(
      /request failed: offline/,
    );
  });

  it("rejects unsupported raw construction fields", async () => {
    const { registry } = offline();
    for (const extra of [
      { user: OTHER },
      { amount: "1" },
      { proof: [LEAF_B] },
      { recipient: OTHER },
      { distributor: OTHER },
    ]) {
      await expect(
        registry.action("merkl", "claim", ACCOUNT, { tokens: [TOKEN_A], ...extra }),
      ).rejects.toThrow(/unrecognized/i);
    }
  });
});

function claimedEvent(
  user = ACCOUNT,
  token = TOKEN_A,
  amount = 60n,
  emitter = MERKL_DISTRIBUTOR_ADDRESS,
): Change {
  return {
    kind: "event",
    address: emitter,
    topics: encodeEventTopics({
      abi: distributorAbi,
      eventName: "Claimed",
      args: { user, token },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function transferEvent(
  from = MERKL_DISTRIBUTOR_ADDRESS,
  to = ACCOUNT,
  amount = 60n,
  emitter = TOKEN_A,
): Change {
  return {
    kind: "event",
    address: emitter,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function leafChange(entry: ReceiptResult["changes"][number] | undefined): Change {
  if (!entry) throw new Error("missing Receipt entry");
  return entry.kind === "change" ? entry.change : leafChange(entry.changes[0]);
}

describe("Merkl claim Receipt evidence", () => {
  it("parses a valid single-token claim with original identity and Package label", async () => {
    const { registry, capability } = await claimCapability();
    const changes = [claimedEvent(), transferEvent()];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "claim",
      account: ACCOUNT,
      rewards: [{ token: TOKEN_A, amount: "60" }],
    });
    expect(receipt.changes).toHaveLength(changes.length);
    changes.forEach((change, index) => {
      expect(leafChange(receipt.changes[index])).toBe(change);
    });
    expect(receipt.changes[0]).toMatchObject({
      text: expect.stringContaining("Package(Merkl:Distributor)"),
    });
  });

  it("preserves observed multi-token execution order", async () => {
    const { registry, capability } = await claimCapability();
    const changes = [
      claimedEvent(ACCOUNT, TOKEN_B, 7n),
      transferEvent(MERKL_DISTRIBUTOR_ADDRESS, ACCOUNT, 7n, TOKEN_B),
      claimedEvent(ACCOUNT, TOKEN_A, 9n),
      transferEvent(MERKL_DISTRIBUTOR_ADDRESS, ACCOUNT, 9n, TOKEN_A),
    ];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "claim",
      account: ACCOUNT,
      rewards: [
        { token: TOKEN_B, amount: "7" },
        { token: TOKEN_A, amount: "9" },
      ],
    });
    changes.forEach((change, index) => {
      expect(leafChange(receipt.changes[index])).toBe(change);
    });
  });

  it("rejects forged emitters, wrong actors, endpoints, amounts, and zero claims", async () => {
    const { registry, capability } = await claimCapability();
    expect(() =>
      registry.parseReceipt(capability, [
        claimedEvent(ACCOUNT, TOKEN_A, 60n, OTHER),
        transferEvent(),
      ]),
    ).toThrow(/fixed Distributor/);
    expect(() =>
      registry.parseReceipt(capability, [
        claimedEvent(),
        transferEvent(MERKL_DISTRIBUTOR_ADDRESS, ACCOUNT, 60n, TOKEN_B),
      ]),
    ).toThrow(/claimed token/);
    expect(() => registry.parseReceipt(capability, [claimedEvent(OTHER), transferEvent()])).toThrow(
      /recipient/,
    );
    expect(() => registry.parseReceipt(capability, [claimedEvent(), transferEvent(OTHER)])).toThrow(
      /sender/,
    );
    expect(() =>
      registry.parseReceipt(capability, [
        claimedEvent(),
        transferEvent(MERKL_DISTRIBUTOR_ADDRESS, OTHER),
      ]),
    ).toThrow(/recipient/);
    expect(() =>
      registry.parseReceipt(capability, [
        claimedEvent(),
        transferEvent(MERKL_DISTRIBUTOR_ADDRESS, ACCOUNT, 61n),
      ]),
    ).toThrow(/value/);
    expect(() =>
      registry.parseReceipt(capability, [
        claimedEvent(ACCOUNT, TOKEN_A, 0n),
        transferEvent(MERKL_DISTRIBUTOR_ADDRESS, ACCOUNT, 0n),
      ]),
    ).toThrow(/zero-amount/);
  });

  it("rejects missing, duplicate, decoy, reordered, malformed, and extra evidence", async () => {
    const { registry, capability } = await claimCapability();
    expect(() => registry.parseReceipt(capability, [claimedEvent()])).toThrow(/pair/);
    expect(() => registry.parseReceipt(capability, [transferEvent()])).toThrow(/pair|Claimed/);
    expect(() =>
      registry.parseReceipt(capability, [
        claimedEvent(),
        claimedEvent(),
        transferEvent(),
        transferEvent(),
      ]),
    ).toThrow();
    expect(() =>
      registry.parseReceipt(capability, [claimedEvent(), transferEvent(), transferEvent()]),
    ).toThrow(/pair/);
    expect(() =>
      registry.parseReceipt(capability, [
        claimedEvent(),
        transferEvent(MERKL_DISTRIBUTOR_ADDRESS, ACCOUNT, 60n, TOKEN_B),
        transferEvent(),
      ]),
    ).toThrow();
    expect(() => registry.parseReceipt(capability, [transferEvent(), claimedEvent()])).toThrow(
      /Claimed/,
    );
    expect(() =>
      registry.parseReceipt(capability, [
        { ...claimedEvent(), data: "0x01" } as Change,
        transferEvent(),
      ]),
    ).toThrow(/malformed/);
    const approval: Change = {
      kind: "event",
      address: TOKEN_A,
      topics: encodeEventTopics({
        abi: ERC20Abi,
        eventName: "Approval",
        args: { owner: ACCOUNT, spender: OTHER },
      }) as readonly Hex[],
      data: encodeAbiParameters([{ type: "uint256" }], [1n]),
    };
    expect(() =>
      registry.parseReceipt(capability, [claimedEvent(), transferEvent(), approval]),
    ).toThrow(/pair/);
  });
});

describe("Merkl metadata and Registry", () => {
  it("discovers and loads the real Query and Capability contracts", () => {
    const { registry } = offline();
    expect(registry.discover({ protocol: "merkl" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "merkl",
          method: "rewards",
          kind: "query",
          category: "rewards",
        }),
        expect.objectContaining({
          protocol: "merkl",
          method: "claim",
          kind: "capability",
          verb: "claim",
          category: "rewards",
        }),
      ]),
    );
    const [rewards, claim] = registry.load([
      { protocol: "merkl", method: "rewards" },
      { protocol: "merkl", method: "claim" },
    ]);
    expect(rewards).toMatchObject({
      params: {
        account: {
          description: expect.stringContaining("inspected"),
          type: { description: expect.stringContaining("20-byte") },
        },
      },
    });
    expect(claim).toMatchObject({
      risk: ["fundOut"],
      tags: ["rewards", "merkle", "batch-claim", "incentives"],
      params: {
        tokens: {
          description: expect.stringContaining("merkl.rewards"),
          type: { maxItems: MAX_MERKL_CLAIM_TOKENS },
        },
      },
    });
  });
});
