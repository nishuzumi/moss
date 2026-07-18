import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  parseAbiItem,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MorphoVaultV2Abi } from "../src/abis/morpho.js";
import { MORPHO_VAULT_V2_FACTORY_ADDRESS, Morpho } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const OWNER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");
const VAULT_USDC = getAddress("0x1111111111111111111111111111111111111111");
const VAULT_WETH = getAddress("0x2222222222222222222222222222222222222222");
const WETH = getAddress("0x3333333333333333333333333333333333333333");
const ADAPTER = getAddress("0x4444444444444444444444444444444444444444");

type MockVault = {
  address: `0x${string}`;
  asset: `0x${string}`;
  attested: boolean;
  totalAssets: bigint;
  liquidityAdapter?: `0x${string}`;
};

type MockToken = { name: string; symbol: string; decimals: number };

const VAULTS: readonly MockVault[] = [
  { address: VAULT_USDC, asset: USDC_ADDRESS, attested: true, totalAssets: 26_359_442_020_937n },
  {
    address: VAULT_WETH,
    asset: WETH,
    attested: true,
    totalAssets: 13_089_515_250_132_911_569_813n,
    liquidityAdapter: ADAPTER,
  },
];

const TOKENS = new Map<string, MockToken>([
  [USDC_ADDRESS.toLowerCase(), { name: "USD Coin", symbol: "USDC", decimals: 6 }],
  [WETH.toLowerCase(), { name: "Wrapped Ether", symbol: "WETH", decimals: 18 }],
]);

afterEach(() => vi.unstubAllGlobals());

describe("Morpho", () => {
  it("loads separate field and type descriptions for deposit", async () => {
    const { registry } = offlineRegistry();
    const [loaded] = registry.load([{ protocol: "morpho", method: "deposit" }]);
    expect(loaded?.params.vault).toMatchObject({
      description: expect.stringContaining("attested by the on-chain VaultV2 factory"),
      type: { description: expect.stringContaining("20-byte EVM address") },
    });
    expect(loaded?.params.amount).toMatchObject({
      description: expect.stringContaining("underlying asset to deposit"),
      type: { description: expect.stringContaining("decimal string") },
    });
  });

  it("rejects malformed amounts and unknown parameters", async () => {
    const { registry } = offlineRegistry();
    for (const amount of ["0", "-1", "1,5", ""]) {
      await expect(
        registry.action("morpho", "deposit", ACCOUNT, { vault: VAULT_USDC, amount }),
      ).rejects.toThrow("invalid parameters");
    }
    await expect(
      registry.action("morpho", "withdraw", ACCOUNT, {
        vault: VAULT_USDC,
        amount: "1",
        extra: true,
      }),
    ).rejects.toThrow("invalid parameters");
  });

  it("discovers listed vaults, verifies them on-chain, and keeps API data advisory", async () => {
    const { registry, fetchMock } = offlineRegistry();
    const result = await registry.action("morpho", "vaults", ACCOUNT, {});
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toEqual({
      vaults: [
        {
          address: VAULT_USDC,
          name: "Hyperithm USDC Apex",
          symbol: "hyperUSDCa",
          asset: { address: USDC_ADDRESS, symbol: "USDC", decimals: 6 },
          totalAssets: "26359442020937",
          totalAssetsDisplay: "26359442.020937",
          netApy: 0.0843,
          netApyExcludingRewards: 0.0641,
          totalAssetsUsd: 26356321.73,
          liquidityAdapter: null,
        },
        {
          address: VAULT_WETH,
          name: "Steakhouse Prime ETH",
          symbol: "steakETH",
          asset: { address: WETH, symbol: "WETH", decimals: 18 },
          totalAssets: "13089515250132911569813",
          totalAssetsDisplay: "13089.515250132911569813",
          netApy: null,
          netApyExcludingRewards: null,
          totalAssetsUsd: null,
          liquidityAdapter: ADAPTER,
        },
      ],
    });
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      query: string;
      variables: { first: number; where: Record<string, unknown> };
    };
    expect(request.query).toContain("vaultV2s");
    expect(request.variables.where).toEqual({ chainId_in: [143], listed: true });

    await registry.action("morpho", "vaults", ACCOUNT, { asset: USDC_ADDRESS });
    const filtered = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      variables: { where: Record<string, unknown> };
    };
    expect(filtered.variables.where).toEqual({
      chainId_in: [143],
      listed: true,
      assetAddress_in: [USDC_ADDRESS],
    });
  });

  it("rejects vaults the factory does not attest, for discovery and direct params alike", async () => {
    const unattested = { ...VAULTS[0], attested: false } as MockVault;
    const { registry } = offlineRegistry([unattested]);
    await expect(registry.action("morpho", "vaults", ACCOUNT, {})).rejects.toThrow(
      `address ${VAULT_USDC} is not a factory-attested Morpho Vault V2`,
    );
    await expect(
      registry.action("morpho", "deposit", ACCOUNT, { vault: VAULT_USDC, amount: "1" }),
    ).rejects.toThrow("not a factory-attested");
    await expect(
      registry.action("morpho", "position", ACCOUNT, { vault: VAULT_USDC, owner: OWNER }),
    ).rejects.toThrow("not a factory-attested");
  });

  it("rejects API candidates whose claimed asset mismatches chain state", async () => {
    const { registry } = offlineRegistry(VAULTS, [
      { address: VAULT_USDC, asset: { address: WETH } },
    ]);
    await expect(registry.action("morpho", "vaults", ACCOUNT, {})).rejects.toThrow(
      `Morpho API returned vault ${VAULT_USDC} with a mismatched asset`,
    );
  });

  it("rejects malformed discovery responses", async () => {
    const { registry } = offlineRegistry(VAULTS, [
      { address: "not-an-address", asset: { address: USDC_ADDRESS } },
    ]);
    await expect(registry.action("morpho", "vaults", ACCOUNT, {})).rejects.toThrow(
      "invalid address",
    );

    for (const [payload, message] of [
      [{ data: { vaultV2s: { items: "nope" } } }, "invalid response"],
      [{ errors: [{ message: "boom" }] }, "GraphQL error: boom"],
      [
        {
          data: {
            vaultV2s: {
              items: [
                { address: VAULT_USDC, asset: { address: USDC_ADDRESS } },
                { address: VAULT_USDC.toLowerCase(), asset: { address: WETH } },
              ],
            },
          },
        },
        `conflicting vault ${VAULT_USDC.toLowerCase()}`,
      ],
    ] as const) {
      const { registry: fresh } = offlineRegistry(VAULTS, undefined, {
        json: async () => payload,
      });
      await expect(fresh.action("morpho", "vaults", ACCOUNT, {})).rejects.toThrow(message);
    }

    const { registry: badStatus } = offlineRegistry(VAULTS, undefined, { ok: false, status: 500 });
    await expect(badStatus.action("morpho", "vaults", ACCOUNT, {})).rejects.toThrow("HTTP 500");

    const { registry: badJson } = offlineRegistry(VAULTS, undefined, {
      json: async () => {
        throw new Error("bad json");
      },
    });
    await expect(badJson.action("morpho", "vaults", ACCOUNT, {})).rejects.toThrow("invalid JSON");
  });

  it("builds deposit as one approve child plus exactly one direct vault transaction", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("morpho", "deposit", ACCOUNT, {
      vault: VAULT_USDC,
      amount: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const transactions = flattenCapabilityTree(capability);
    expect(transactions).toHaveLength(2);
    const [approval, deposit] = transactions;
    if (!approval || !deposit) throw new Error("missing Morpho transactions");
    expect(approval.transaction.to).toBe(USDC_ADDRESS);
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [VAULT_USDC, 1_500_000n],
    });
    expect(deposit.transaction.to).toBe(VAULT_USDC);
    expect(decodeFunctionData({ abi: MorphoVaultV2Abi, data: deposit.transaction.data })).toEqual({
      functionName: "deposit",
      args: [1_500_000n, ACCOUNT],
    });
  });

  it("builds withdraw as exactly one direct vault transaction pinned to the caller", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("morpho", "withdraw", ACCOUNT, {
      vault: VAULT_USDC,
      amount: "2",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const transactions = flattenCapabilityTree(capability);
    expect(transactions).toHaveLength(1);
    const [withdraw] = transactions;
    if (!withdraw) throw new Error("missing Morpho transaction");
    expect(withdraw.transaction.to).toBe(VAULT_USDC);
    expect(decodeFunctionData({ abi: MorphoVaultV2Abi, data: withdraw.transaction.data })).toEqual({
      functionName: "withdraw",
      args: [2_000_000n, ACCOUNT, ACCOUNT],
    });
  });

  it("reads positions and previews deposits from chain state only", async () => {
    const { registry, fetchMock } = offlineRegistry();
    const position = await registry.action("morpho", "position", ACCOUNT, {
      vault: VAULT_USDC,
      owner: OWNER,
    });
    if (position.kind !== "query") throw new Error("expected query");
    expect(position.data).toEqual({
      vault: VAULT_USDC,
      owner: OWNER,
      shares: "5000000",
      assets: "10000000",
      assetsDisplay: "10",
      asset: { address: USDC_ADDRESS, symbol: "USDC", decimals: 6 },
    });

    const preview = await registry.action("morpho", "previewDeposit", ACCOUNT, {
      vault: VAULT_USDC,
      amount: "1",
    });
    if (preview.kind !== "query") throw new Error("expected query");
    expect(preview.data).toEqual({
      vault: VAULT_USDC,
      amount: "1",
      assets: "1000000",
      shares: "3000000",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("translates the observed deposit Change grammar into an exhaustive Receipt", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("morpho", "deposit", ACCOUNT, {
      vault: VAULT_USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    // The empirical Monad mainnet grammar: underlying Transfer(payer->vault),
    // underlying Approval (allowance decrement on transferFrom), vault
    // AccrueInterest, share-mint Transfer(0x0->onBehalf), vault Deposit.
    const changes = [
      erc20Transfer(USDC_ADDRESS, ACCOUNT, VAULT_USDC, 1_000_000n),
      erc20Approval(USDC_ADDRESS, ACCOUNT, VAULT_USDC, 0n),
      accrueInterest(VAULT_USDC, 5n, 7n),
      erc20Transfer(VAULT_USDC, ZERO, ACCOUNT, 999_000n),
      depositEvent(VAULT_USDC, ACCOUNT, ACCOUNT, 1_000_000n, 999_000n),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "deposit",
      protocol: "morpho",
      vault: VAULT_USDC,
      sender: ACCOUNT,
      onBehalf: ACCOUNT,
      assets: "1000000",
      shares: "999000",
    });
    expect(receipt.changes[0]).toMatchObject({
      kind: "receipt",
      outcome: [
        {
          operation: "transfer",
          token: USDC_ADDRESS,
          from: ACCOUNT,
          to: VAULT_USDC,
          amount: "1000000",
        },
      ],
    });
    expect(receipt.changes[2]).toMatchObject({
      kind: "change",
      data: {
        event: "AccrueInterest",
        emitter: VAULT_USDC,
        previousTotalAssets: "5",
        newTotalAssets: "7",
      },
    });
    expect(receipt.changes[3]).toMatchObject({
      kind: "receipt",
      outcome: [
        { operation: "transfer", token: VAULT_USDC, from: ZERO, to: ACCOUNT, amount: "999000" },
      ],
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("translates a withdraw Change grammar into an exhaustive Receipt", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("morpho", "withdraw", ACCOUNT, {
      vault: VAULT_USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      accrueInterest(VAULT_USDC, 7n, 9n),
      erc20Transfer(VAULT_USDC, ACCOUNT, ZERO, 999_000n),
      erc20Transfer(USDC_ADDRESS, VAULT_USDC, ACCOUNT, 1_000_000n),
      withdrawEvent(VAULT_USDC, ACCOUNT, ACCOUNT, ACCOUNT, 1_000_000n, 999_000n),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "withdraw",
      protocol: "morpho",
      vault: VAULT_USDC,
      sender: ACCOUNT,
      receiver: ACCOUNT,
      onBehalf: ACCOUNT,
      assets: "1000000",
      shares: "999000",
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("fails loudly on missing, duplicated, or unexpected vault events", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("morpho", "deposit", ACCOUNT, {
      vault: VAULT_USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");

    expect(() =>
      registry.parseReceipt(capability, [
        erc20Transfer(USDC_ADDRESS, ACCOUNT, VAULT_USDC, 1_000_000n),
      ]),
    ).toThrow("Morpho deposit Receipt requires a Deposit event");

    const deposit = depositEvent(VAULT_USDC, ACCOUNT, ACCOUNT, 1_000_000n, 999_000n);
    expect(() => registry.parseReceipt(capability, [deposit, deposit])).toThrow(
      "multiple Deposit events",
    );

    expect(() =>
      registry.parseReceipt(capability, [deposit, removeAdapterEvent(VAULT_USDC, ADAPTER)]),
    ).toThrow("Unexpected Change: Morpho vault emitted RemoveAdapter");

    // A Withdraw during a deposit is just as unexpected.
    expect(() =>
      registry.parseReceipt(capability, [
        withdrawEvent(VAULT_USDC, ACCOUNT, ACCOUNT, ACCOUNT, 1n, 1n),
      ]),
    ).toThrow("Unexpected Change: Morpho vault emitted Withdraw");
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Morpho mainnet", () => {
  it("has deployed factory bytecode and discovers verified vaults live", {
    timeout: 120_000,
  }, async () => {
    const runtime = await monadRuntime();
    expect(
      (await runtime.client.getCode({ address: MORPHO_VAULT_V2_FACTORY_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
    const registry = new Registry(runtime).use(Morpho);
    const result = await registry.action("morpho", "vaults", ACCOUNT, {});
    if (result.kind !== "query") throw new Error("expected query");
    const { vaults } = result.data as { vaults: readonly { address: `0x${string}` }[] };
    expect(vaults.length).toBeGreaterThan(0);
  });

  it("simulates a live deposit into an exhaustive typed Receipt", {
    timeout: 300_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Morpho);
    const target = await liveSimulationTarget(runtime, registry);
    if (!target) {
      console.warn("Morpho deposit E2E skipped: no funded live account found");
      return;
    }
    const capability = await registry.action("morpho", "deposit", target.owner, {
      vault: target.vault,
      amount: target.amount,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    for (const result of outcome.results) expect(result.warnings).toEqual([]);
    expect(outcome.results.at(-1)?.receipt?.outcome).toMatchObject({
      operation: "deposit",
      protocol: "morpho",
      vault: target.vault,
      onBehalf: target.owner,
    });
  });

  it("simulates a live withdraw from a current shareholder", { timeout: 300_000 }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Morpho);
    const target = await liveWithdrawTarget(runtime, registry);
    if (!target) {
      console.warn("Morpho withdraw E2E skipped: no live shareholder found");
      return;
    }
    const capability = await registry.action("morpho", "withdraw", target.owner, {
      vault: target.vault,
      amount: target.amount,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    for (const result of outcome.results) expect(result.warnings).toEqual([]);
    expect(outcome.results.at(-1)?.receipt?.outcome).toMatchObject({
      operation: "withdraw",
      protocol: "morpho",
      vault: target.vault,
      receiver: target.owner,
    });
  });
});

/** Simulation-only E2E target discovery (Moss never signs or sends): use the
 * Morpho API to find recent depositors into idle-liquidity vaults, then keep
 * only senders whose *current on-chain* underlying balance can fund a small
 * deposit. The API only nominates candidates; balances decide. */
async function liveSimulationTarget(runtime: MossRuntime, registry: Registry) {
  for (const { vault, asset, decimals, owners } of await liveCandidates(registry)) {
    for (const owner of owners) {
      const balance = (await runtime.client.readContract({
        address: asset,
        abi: ERC20Abi,
        functionName: "balanceOf",
        args: [owner],
      })) as bigint;
      if (balance >= 10n ** BigInt(decimals)) return { vault, owner, amount: "1" };
    }
  }
  return undefined;
}

async function liveWithdrawTarget(runtime: MossRuntime, registry: Registry) {
  for (const { vault, decimals, owners } of await liveCandidates(registry)) {
    for (const owner of owners) {
      const shares = (await runtime.client.readContract({
        address: vault,
        abi: MorphoVaultV2Abi,
        functionName: "balanceOf",
        args: [owner],
      })) as bigint;
      if (shares === 0n) continue;
      const assets = (await runtime.client.readContract({
        address: vault,
        abi: MorphoVaultV2Abi,
        functionName: "convertToAssets",
        args: [shares],
      })) as bigint;
      if (assets >= 10n ** BigInt(decimals)) return { vault, owner, amount: "1" };
    }
  }
  return undefined;
}

type LiveCandidate = {
  vault: `0x${string}`;
  asset: `0x${string}`;
  decimals: number;
  owners: readonly `0x${string}`[];
};

async function liveCandidates(registry: Registry): Promise<readonly LiveCandidate[]> {
  const result = await registry.action("morpho", "vaults", ACCOUNT, {});
  if (result.kind !== "query") throw new Error("expected query");
  const { vaults } = result.data as {
    vaults: readonly {
      address: `0x${string}`;
      asset: { address: `0x${string}`; decimals: number };
      liquidityAdapter: `0x${string}` | null;
    }[];
  };
  // Idle-liquidity vaults only: adapter-routed flows emit allocation events
  // the v1 Receipts deliberately reject.
  const idle = vaults.filter((vault) => vault.liquidityAdapter === null).slice(0, 3);
  const candidates: LiveCandidate[] = [];
  for (const vault of idle) {
    const response = await fetch("https://api.morpho.org/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query Owners($where: VaultV2TransactionFilters!) {
          vaultV2transactions(first: 25, where: $where, orderBy: Time, orderDirection: Desc) {
            items { data { ... on VaultV2DepositData { sender } ... on VaultV2WithdrawData { sender } } }
          }
        }`,
        variables: { where: { chainId_in: [143], vaultAddress_in: [vault.address] } },
      }),
    });
    if (!response.ok) continue;
    const payload = (await response.json()) as {
      data?: { vaultV2transactions?: { items?: readonly { data?: { sender?: string } }[] } };
    };
    const owners = [
      ...new Set(
        (payload.data?.vaultV2transactions?.items ?? [])
          .map((item) => item.data?.sender)
          .filter((sender): sender is string => typeof sender === "string")
          .map((sender) => getAddress(sender)),
      ),
    ];
    candidates.push({
      vault: vault.address,
      asset: vault.asset.address,
      decimals: vault.asset.decimals,
      owners,
    });
  }
  return candidates;
}

function offlineRegistry(
  vaults: readonly MockVault[] = VAULTS,
  apiItems?: readonly unknown[],
  responseOverrides: Partial<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }> = {},
) {
  const byAddress = new Map(vaults.map((vault) => [vault.address.toLowerCase(), vault]));
  const items =
    apiItems ??
    vaults.map((vault, index) => ({
      address: vault.address,
      name: index === 0 ? "Hyperithm USDC Apex" : "Steakhouse Prime ETH",
      symbol: index === 0 ? "hyperUSDCa" : "steakETH",
      ...(index === 0
        ? { netApy: 0.0843, netApyExcludingRewards: 0.0641, totalAssetsUsd: 26356321.73 }
        : { netApy: null, netApyExcludingRewards: null, totalAssetsUsd: null }),
      liquidityAdapter: vault.liquidityAdapter ? { address: vault.liquidityAdapter } : null,
      asset: { address: vault.asset },
    }));
  const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body ?? "{}")) as {
      variables?: { where?: { assetAddress_in?: readonly string[] } };
    };
    const assetFilter = request.variables?.where?.assetAddress_in?.map((a) => a.toLowerCase());
    const filtered = assetFilter
      ? items.filter((item) => {
          const record = item as { asset?: { address?: string } };
          return assetFilter.includes(String(record.asset?.address).toLowerCase());
        })
      : items;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ data: { vaultV2s: { items: filtered } } }),
      ...responseOverrides,
    } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
  const client = {
    readContract: async ({
      address,
      functionName,
      args = [],
    }: {
      address: string;
      functionName: string;
      args?: readonly unknown[];
    }) => {
      if (functionName === "isVaultV2") {
        if (address.toLowerCase() !== MORPHO_VAULT_V2_FACTORY_ADDRESS.toLowerCase()) {
          throw new Error(`isVaultV2 asked of non-factory ${address}`);
        }
        return byAddress.get(String(args[0]).toLowerCase())?.attested ?? false;
      }
      const vault = byAddress.get(address.toLowerCase());
      if (vault) {
        if (functionName === "asset") return vault.asset;
        if (functionName === "totalAssets") return vault.totalAssets;
        if (functionName === "balanceOf") {
          return String(args[0]).toLowerCase() === OWNER.toLowerCase() ? 5_000_000n : 0n;
        }
        if (functionName === "convertToAssets") return (args[0] as bigint) * 2n;
        if (functionName === "previewDeposit") return (args[0] as bigint) * 3n;
        throw new Error(`unexpected vault read ${functionName}`);
      }
      const token = TOKENS.get(address.toLowerCase());
      if (token) {
        if (functionName === "name") return token.name;
        if (functionName === "symbol") return token.symbol;
        if (functionName === "decimals") return token.decimals;
        throw new Error(`unexpected token read ${functionName}`);
      }
      throw new Error(`unexpected read of ${address}`);
    },
  } as unknown as MossRuntime["client"];
  return {
    registry: new Registry({ rpcUrl: "http://offline", client }).use(Morpho),
    fetchMock,
  };
}

function firstChange(entry: ReceiptResult["changes"][number]): Change {
  if (entry.kind === "change") return entry.change;
  const [child] = entry.changes;
  if (child?.kind !== "change") throw new Error("expected one nested ReceiptChange");
  return child.change;
}

function erc20Transfer(
  token: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
): Change {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function erc20Approval(
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
): Change {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Approval",
      args: { owner, spender },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function depositEvent(
  vault: `0x${string}`,
  sender: `0x${string}`,
  onBehalf: `0x${string}`,
  assets: bigint,
  shares: bigint,
): Change {
  return {
    kind: "event",
    address: vault,
    topics: encodeEventTopics({
      abi: MorphoVaultV2Abi,
      eventName: "Deposit",
      args: { sender, onBehalf },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [assets, shares]),
  };
}

function withdrawEvent(
  vault: `0x${string}`,
  sender: `0x${string}`,
  receiver: `0x${string}`,
  onBehalf: `0x${string}`,
  assets: bigint,
  shares: bigint,
): Change {
  return {
    kind: "event",
    address: vault,
    topics: encodeEventTopics({
      abi: MorphoVaultV2Abi,
      eventName: "Withdraw",
      args: { sender, receiver, onBehalf },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [assets, shares]),
  };
}

function accrueInterest(
  vault: `0x${string}`,
  previousTotalAssets: bigint,
  newTotalAssets: bigint,
): Change {
  return {
    kind: "event",
    address: vault,
    topics: encodeEventTopics({
      abi: MorphoVaultV2Abi,
      eventName: "AccrueInterest",
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [previousTotalAssets, newTotalAssets, 0n, 0n],
    ),
  };
}

function removeAdapterEvent(vault: `0x${string}`, adapter: `0x${string}`): Change {
  return {
    kind: "event",
    address: vault,
    topics: encodeEventTopics({
      abi: [parseAbiItem("event RemoveAdapter(address indexed adapter)")],
      eventName: "RemoveAdapter",
      args: { adapter },
    }) as readonly Hex[],
    data: "0x",
  };
}
