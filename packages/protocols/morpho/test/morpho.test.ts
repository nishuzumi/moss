import {
  type Change,
  createRuntime,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Protocol,
  Registry,
  RISK_LABELS,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import {
  type Abi,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
} from "viem";
import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_CURVE_IRM_ADDRESS,
  AdaptiveCurveIrmAbi,
  GROVE_STEAKHOUSE_AUSD_VAULT,
  METAMORPHO_V1_1_FACTORY_ADDRESS,
  MetaMorphoEventsAbi,
  MetaMorphoV1_1Abi,
  MetaMorphoV1_1FactoryAbi,
  MORPHO_BLUE_ADDRESS,
  Morpho,
  MorphoBlueAbi,
  type MorphoVaultFlowOutcome,
} from "../src/index.js";

const OWNER = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const OTHER = getAddress("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
const VAULT = getAddress("0x32841A8511D5c2c5b253f45668780B99139e476D");
const ASSET = getAddress("0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a");
const NOT_A_VAULT = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
/** An ERC-20 that is not the vault's asset: the decoy in the ambiguity fixtures. */
const DECOY_TOKEN = getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
const ZERO = "0x0000000000000000000000000000000000000000" as const;
const MARKET_ID = "0x2127fa3d2cfb96224b742395311b26b0e428539d335ba1bd63f763b12fdbe287" as const;

const ASSETS = 1_000_000n;
const SHARES = 979_106_230_239_639_317n;

// ── Offline registry ─────────────────────────────────────────────────────

function offlineRegistry(reads: Record<string, unknown> = {}) {
  const answers: Record<string, unknown> = {
    isMetaMorpho: true,
    asset: ASSET,
    decimals: 6,
    maxDeposit: 10n ** 24n,
    maxWithdraw: 5_000_000n,
    balanceOf: SHARES,
    convertToAssets: ASSETS,
    symbol: "AUSD",
    name: "Grove x Steakhouse High Yield AUSD",
    totalAssets: 363_127_772_191n,
    fee: 0n,
    owner: OWNER,
    curator: OWNER,
    guardian: OWNER,
    timelock: 1_209_600n,
    ...reads,
  };
  return new Registry({
    rpcUrl: "http://offline",
    client: {
      readContract: async ({
        functionName,
        args,
      }: {
        functionName: string;
        args?: readonly unknown[];
      }) => {
        if (functionName === "isMetaMorpho") {
          const candidate = String(args?.[0] ?? "").toLowerCase();
          return answers.isMetaMorpho === false ? false : candidate !== NOT_A_VAULT.toLowerCase();
        }
        if (!(functionName in answers)) throw new Error(`unexpected read ${functionName}`);
        return answers[functionName];
      },
    } as unknown as MossRuntime["client"],
  }).use(Morpho);
}

// ── Change builders ──────────────────────────────────────────────────────

function event(
  abi: Abi | readonly unknown[],
  address: string,
  eventName: string,
  args: Record<string, unknown>,
): Change {
  const entry = (abi as readonly { type: string; name?: string; inputs?: AbiInput[] }[]).find(
    (item) => item.type === "event" && item.name === eventName,
  );
  if (!entry?.inputs) throw new Error(`fixture ABI has no event ${eventName}`);
  const nonIndexed = entry.inputs.filter((input) => !input.indexed);
  return {
    kind: "event",
    address: address as `0x${string}`,
    topics: encodeEventTopics({
      abi: abi as Abi,
      eventName,
      args,
    }) as readonly Hex[],
    data: encodeAbiParameters(
      nonIndexed,
      nonIndexed.map((input) => args[input.name]),
    ),
  };
}

interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
}

const transfer = (token: string, from: string, to: string, value: bigint) =>
  event(ERC20Abi, token, "Transfer", { from, to, value });

/** The same Changes with `extra` spliced in immediately before `index`. */
const insertBefore = (changes: Change[], index: number, extra: Change): Change[] =>
  changes.flatMap((change, at) => (at === index ? [extra, change] : [change]));

/** The same Changes with the one at `index` repeated straight after itself. */
const repeatAt = (changes: Change[], index: number): Change[] =>
  changes.flatMap((change, at) => (at === index ? [change, { ...change }] : [change]));

/** The Change list a real 1 AUSD deposit produces, in trace order. */
function supplyChanges(): Change[] {
  return [
    event(MetaMorphoEventsAbi, VAULT, "UpdateLastTotalAssets", {
      updatedTotalAssets: 363_127_972_191n,
    }),
    event(MetaMorphoEventsAbi, VAULT, "UpdateLostAssets", { newLostAssets: 0n }),
    event(MetaMorphoEventsAbi, VAULT, "AccrueInterest", {
      newTotalAssets: 363_127_972_191n,
      feeShares: 0n,
    }),
    transfer(VAULT, ZERO, OWNER, SHARES),
    event(MetaMorphoV1_1Abi, VAULT, "Deposit", {
      sender: OWNER,
      owner: OWNER,
      assets: ASSETS,
      shares: SHARES,
    }),
    event(MetaMorphoEventsAbi, VAULT, "UpdateLastTotalAssets", {
      updatedTotalAssets: 363_128_972_191n,
    }),
    transfer(ASSET, OWNER, VAULT, ASSETS),
    event(MorphoBlueAbi, MORPHO_BLUE_ADDRESS, "AccrueInterest", {
      id: MARKET_ID,
      prevBorrowRate: 1_928_436_063n,
      interest: 4_131_745n,
      feeShares: 0n,
    }),
    event(AdaptiveCurveIrmAbi, ADAPTIVE_CURVE_IRM_ADDRESS, "BorrowRateUpdate", {
      id: MARKET_ID,
      avgBorrowRate: 1_928_436_063n,
      rateAtTarget: 1_081_100_606n,
    }),
    marketEvent("Supply", { caller: VAULT, onBehalf: VAULT }),
    transfer(ASSET, VAULT, MORPHO_BLUE_ADDRESS, ASSETS),
  ];
}

function withdrawChanges(): Change[] {
  return [
    event(MetaMorphoEventsAbi, VAULT, "UpdateLastTotalAssets", {
      updatedTotalAssets: 363_128_972_191n,
    }),
    event(MetaMorphoEventsAbi, VAULT, "UpdateLostAssets", { newLostAssets: 0n }),
    transfer(VAULT, OWNER, ZERO, SHARES),
    event(MetaMorphoV1_1Abi, VAULT, "Withdraw", {
      sender: OWNER,
      receiver: OWNER,
      owner: OWNER,
      assets: ASSETS,
      shares: SHARES,
    }),
    marketEvent("Withdraw", { caller: VAULT, onBehalf: VAULT, receiver: VAULT }),
    transfer(ASSET, MORPHO_BLUE_ADDRESS, VAULT, ASSETS),
    transfer(ASSET, VAULT, OWNER, ASSETS),
  ];
}

function leafChanges(entry: unknown, into: Change[] = []): Change[] {
  if (typeof entry !== "object" || entry === null) return into;
  const node = entry as Record<string, unknown>;
  if (node.kind === "receipt" && Array.isArray(node.changes)) {
    for (const child of node.changes) leafChanges(child, into);
    return into;
  }
  if (node.kind === "change") into.push(node.change as Change);
  return into;
}

async function buildSupply(registry = offlineRegistry()) {
  const capability = await registry.action("morpho", "supply", OWNER, {
    vault: VAULT,
    amount: "1",
  });
  if (capability.kind !== "capability") throw new Error("expected a Capability");
  return { registry, capability };
}

async function buildWithdraw(registry = offlineRegistry()) {
  const capability = await registry.action("morpho", "withdraw", OWNER, {
    vault: VAULT,
    amount: "1",
  });
  if (capability.kind !== "capability") throw new Error("expected a Capability");
  return { registry, capability };
}

/** A Morpho Blue market event with the fixture's market and amounts. */
function marketEvent(name: "Supply" | "Withdraw", args: Record<string, unknown>): Change {
  return event(MorphoBlueAbi, MORPHO_BLUE_ADDRESS, name, {
    id: MARKET_ID,
    assets: ASSETS,
    shares: 977_598_996_901n,
    ...args,
  });
}

// ── Vault provenance ─────────────────────────────────────────────────────

describe("Morpho vault provenance", () => {
  it("refuses a vault the MetaMorpho factory did not create", async () => {
    await expect(
      offlineRegistry().action("morpho", "supply", OWNER, { vault: NOT_A_VAULT, amount: "1" }),
    ).rejects.toThrow("is not a Morpho vault");
  });

  it("refuses to read a position on a vault the factory did not create", async () => {
    await expect(
      offlineRegistry().action("morpho", "position", OWNER, {
        vault: NOT_A_VAULT,
        owner: OWNER,
      }),
    ).rejects.toThrow("is not a Morpho vault");
  });

  it("refuses a supply larger than the vault's remaining capacity", async () => {
    await expect(
      offlineRegistry({ maxDeposit: 500_000n }).action("morpho", "supply", OWNER, {
        vault: VAULT,
        amount: "1",
      }),
    ).rejects.toThrow("accepts at most 0.5");
  });

  it("refuses a withdrawal beyond shares or market liquidity", async () => {
    await expect(
      offlineRegistry({ maxWithdraw: 250_000n }).action("morpho", "withdraw", OWNER, {
        vault: VAULT,
        amount: "1",
      }),
    ).rejects.toThrow("can withdraw at most 0.25");
  });

  it("rejects a malformed vault address before any RPC", async () => {
    await expect(
      offlineRegistry().action("morpho", "supply", OWNER, { vault: "not-an-address", amount: "1" }),
    ).rejects.toThrow("invalid parameters");
  });
});

// ── Capability trees ─────────────────────────────────────────────────────

describe("Morpho capability trees", () => {
  it("supply owns one direct deposit and nests the ERC-20 approval", async () => {
    const { capability } = await buildSupply();
    const transactions = flattenCapabilityTree(capability);
    expect(transactions.length).toBe(2);

    const approval = transactions[0];
    const deposit = transactions[1];
    if (!approval || !deposit) throw new Error("missing transactions");
    expect(approval.capability.protocol).toBe("erc20");
    expect(approval.transaction.to.toLowerCase()).toBe(ASSET.toLowerCase());
    expect(deposit.capability.protocol).toBe("morpho");
    expect(deposit.transaction.to.toLowerCase()).toBe(VAULT.toLowerCase());
    expect(capability.children.filter((child) => child.kind === "transaction").length).toBe(1);

    const approve = decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data });
    expect(approve.functionName).toBe("approve");
    expect(approve.args).toEqual([VAULT, ASSETS]);

    const decoded = decodeFunctionData({ abi: MetaMorphoV1_1Abi, data: deposit.transaction.data });
    expect(decoded.functionName).toBe("deposit");
    expect(decoded.args).toEqual([ASSETS, OWNER]);
    expect(deposit.transaction.value).toBe("0x0");
  });

  it("withdraw owns one direct transaction and needs no approval", async () => {
    const capability = await offlineRegistry().action("morpho", "withdraw", OWNER, {
      vault: VAULT,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");
    const transactions = flattenCapabilityTree(capability);
    expect(transactions.length).toBe(1);

    const withdrawal = transactions[0];
    if (!withdrawal) throw new Error("missing transaction");
    const decoded = decodeFunctionData({
      abi: MetaMorphoV1_1Abi,
      data: withdrawal.transaction.data,
    });
    expect(decoded.functionName).toBe("withdraw");
    expect(decoded.args).toEqual([ASSETS, OWNER, OWNER]);
  });

  it("parses the amount with the asset's decimals, not the vault's", async () => {
    const registry = offlineRegistry({ decimals: 18 });
    const capability = await registry.action("morpho", "supply", OWNER, {
      vault: VAULT,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");
    const deposit = flattenCapabilityTree(capability).at(-1);
    if (!deposit) throw new Error("missing transaction");
    const decoded = decodeFunctionData({ abi: MetaMorphoV1_1Abi, data: deposit.transaction.data });
    expect(decoded.args).toEqual([10n ** 18n, OWNER]);
  });
});

// ── Queries ──────────────────────────────────────────────────────────────

describe("Morpho queries", () => {
  it("reports a position in both shares and assets", async () => {
    const result = await offlineRegistry().action("morpho", "position", OWNER, {
      vault: VAULT,
      owner: OWNER,
    });
    if (result.kind !== "query") throw new Error("expected a Query");
    expect(result.data).toMatchObject({
      vault: VAULT,
      owner: OWNER,
      shares: SHARES.toString(),
      asset: ASSET,
      assetDecimals: 6,
      assets: ASSETS.toString(),
      withdrawable: "5000000",
    });
  });

  it("exposes the curation surface an Agent needs to judge a vault", async () => {
    const result = await offlineRegistry({ fee: 10n ** 17n }).action("morpho", "vaultInfo", OWNER, {
      vault: VAULT,
    });
    if (result.kind !== "query") throw new Error("expected a Query");
    expect(result.data).toMatchObject({
      vault: VAULT,
      asset: ASSET,
      feeBps: 1000,
      curator: OWNER,
      guardian: OWNER,
      timelockSeconds: "1209600",
    });
  });

  // maxDeposit is receiver-scoped under ERC-4626, so the capacity is reported
  // against the account it was read for rather than as a vault-global cap.
  it("names the account its deposit capacity was read for", async () => {
    const result = await offlineRegistry().action("morpho", "vaultInfo", OWNER, { vault: VAULT });
    if (result.kind !== "query") throw new Error("expected a Query");
    expect(result.data).toMatchObject({
      depositCapacityAccount: OWNER,
      depositCapacityForAccount: (10n ** 24n).toString(),
    });
    expect(result.data).not.toHaveProperty("depositCapacity");
  });
});

// ── Registry metadata ────────────────────────────────────────────────────

describe("Morpho registry metadata", () => {
  it("discovers the Capabilities under the lending category and closed verbs", () => {
    const found = offlineRegistry().discover({ protocol: "morpho" });
    expect(
      found
        .filter((entry) => entry.kind === "capability")
        .map((entry) => entry.verb)
        .sort(),
    ).toEqual(["supply", "withdraw"]);
    expect(found.every((entry) => entry.category === "lending")).toBe(true);
  });

  it("labels both Capabilities from Core's closed risk set and neither with debt", () => {
    const loaded = offlineRegistry().load([
      { protocol: "morpho", method: "supply" },
      { protocol: "morpho", method: "withdraw" },
    ]);
    expect(loaded.map((entry) => entry.risk)).toEqual([["fundOut", "approval"], ["fundOut"]]);
    for (const entry of loaded) {
      for (const label of entry.risk) expect(RISK_LABELS).toContain(label);
      // `debt` names a Capability that adds a repayment obligation. A vault
      // depositor lends: the vault borrows in Morpho Blue markets on its own
      // behalf, never on the depositor's, so neither Capability carries it.
      expect(entry.risk).not.toContain("debt");
    }
  });

  it("keeps the reusable type description separate from the field purpose", () => {
    const [supply] = offlineRegistry().load([{ protocol: "morpho", method: "supply" }]);
    if (!supply) throw new Error("supply was not registered");
    const vault = supply.params.vault;
    expect(vault?.description).toContain("canonical Morpho factory");
    expect(JSON.stringify(vault?.type)).toContain("20-byte EVM address");
  });

  it("rejects a Protocol whose declared dependency is not injectable", () => {
    @Protocol({
      name: "broken-morpho-consumer",
      category: "lending",
      description: "Declares Morpho but never receives it.",
      contracts: {},
      protocols: { morpho: Morpho },
    })
    class BrokenConsumer {
      declare morpho: never;
    }

    expect(() =>
      new Registry({ rpcUrl: "http://offline" } as unknown as MossRuntime).use(BrokenConsumer),
    ).toThrow();
  });

  it("rejects a Capability whose named Receipt parser does not exist", async () => {
    const { registry, capability } = await buildSupply();
    expect(() =>
      registry.parseReceipt({ ...capability, method: "vaultInfo" }, supplyChanges()),
    ).toThrow();
  });
});

// ── Receipts ─────────────────────────────────────────────────────────────

describe("Morpho supply Receipt", () => {
  it("covers every Change in order and reports the evidenced outcome", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges();
    const receipt = registry.parseReceipt(capability, changes);

    expect(leafChanges(receipt)).toEqual(changes);
    expect(receipt.outcome).toEqual({
      operation: "supply",
      vault: VAULT,
      owner: OWNER,
      receiver: OWNER,
      assets: ASSETS.toString(),
      shares: SHARES.toString(),
    });
    expect(receipt.protocol).toBe("morpho");
  });

  it("owns the selected asset candidate but delegates the other ERC-20 evidence", async () => {
    const { registry, capability } = await buildSupply();
    const receipt = registry.parseReceipt(capability, supplyChanges());
    // The share mint and the vault-to-Blue asset leg stay delegated to the
    // canonical ERC-20 parser, keeping its Protocol.
    const nested = receipt.changes.filter((entry) => entry.kind === "receipt");
    expect(nested.length).toBe(2);
    expect(nested.every((entry) => entry.protocol === "erc20")).toBe(true);
    // The one selected asset candidate is re-owned by Morpho at its leaf and
    // labeled an unauthenticated token, so the text MCP projects cannot read the
    // emitter as the confirmed underlying.
    const assetLeaf = receipt.changes.find(
      (entry) => entry.kind === "change" && entry.text.includes("Unauthenticated token"),
    );
    if (!assetLeaf) throw new Error("expected an owned asset-candidate leaf");
    expect(assetLeaf.text).toContain(ASSET);
    expect(assetLeaf.text).not.toMatch(/^ERC20 Transfer:/);
  });

  it("renders the Morpho Blue and IRM Package labels in Receipt text", async () => {
    const { registry, capability } = await buildSupply();
    const receipt = registry.parseReceipt(capability, supplyChanges());
    const texts = receipt.changes.map((entry) => entry.text).join("\n");
    expect(texts).toContain("Package(Morpho:Blue)");
    expect(texts).toContain("Package(Morpho:Irm)");
  });

  it("rejects a Morpho Blue event emitted by another address", async () => {
    const { registry, capability } = await buildSupply();
    const forged = supplyChanges().map((change) =>
      change.kind === "event" && change.address === MORPHO_BLUE_ADDRESS
        ? { ...change, address: NOT_A_VAULT }
        : change,
    );
    expect(() => registry.parseReceipt(capability, forged)).toThrow("Unexpected Change");
  });

  it("rejects market evidence that names another participant", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges().map((change, index) =>
      index === 9 ? marketEvent("Supply", { caller: VAULT, onBehalf: OTHER }) : change,
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      "Supply.onBehalf to name vault",
    );
  });

  it("rejects market evidence for the opposite direction", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges().map((change, index) =>
      index === 9
        ? marketEvent("Withdraw", { caller: VAULT, onBehalf: VAULT, receiver: VAULT })
        : change,
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      "received a Morpho Blue Withdraw",
    );
  });

  it("rejects a Deposit whose caller is not the account credited with shares", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges().map((change, index) =>
      index === 4
        ? event(MetaMorphoV1_1Abi, VAULT, "Deposit", {
            sender: OTHER,
            owner: OWNER,
            assets: ASSETS,
            shares: SHARES,
          })
        : change,
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow("to be the share owner");
  });

  it("rejects vault bookkeeping events from a second address", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges();
    changes.push(
      event(MetaMorphoEventsAbi, NOT_A_VAULT, "UpdateLastTotalAssets", { updatedTotalAssets: 1n }),
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      "requires MetaMorpho bookkeeping events",
    );
  });

  it("rejects a share mint that does not match the Deposit event", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges().map((change, index) =>
      index === 3 ? transfer(VAULT, ZERO, OWNER, SHARES + 1n) : change,
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow("shares minted to");
  });

  it("rejects an asset transfer that does not match the Deposit event", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges().map((change, index) =>
      index === 6 ? transfer(ASSET, OWNER, VAULT, ASSETS - 1n) : change,
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow("asset transfer into");
  });

  // A vault's asset is a permissionless parameter, so a Transfer with the right
  // endpoints and amount is not proof of which token moved. The parser collects
  // every candidate and refuses an ambiguous set instead of reporting the first
  // one it happens to see. Change 6 is the asset moving in, 3 the share mint.
  it("rejects a decoy token that matches the asset transfer shape", async () => {
    const { registry, capability } = await buildSupply();
    const changes = insertBefore(supplyChanges(), 6, transfer(DECOY_TOKEN, OWNER, VAULT, ASSETS));
    expect(() => registry.parseReceipt(capability, changes)).toThrow("exactly one asset movement");
    expect(() => registry.parseReceipt(capability, changes)).toThrow(DECOY_TOKEN);
  });

  it("rejects a duplicated asset transfer", async () => {
    const { registry, capability } = await buildSupply();
    expect(() => registry.parseReceipt(capability, repeatAt(supplyChanges(), 6))).toThrow(
      "exactly one asset movement",
    );
  });

  it("rejects a duplicated share mint", async () => {
    const { registry, capability } = await buildSupply();
    expect(() => registry.parseReceipt(capability, repeatAt(supplyChanges(), 3))).toThrow(
      "exactly one vault share movement",
    );
  });

  it("keeps a transfer that matches no candidate shape as ERC-20 evidence", async () => {
    const { registry, capability } = await buildSupply();
    const changes = [...supplyChanges(), transfer(DECOY_TOKEN, OTHER, VAULT, ASSETS)];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({ assets: ASSETS.toString(), vault: VAULT });
    expect(leafChanges(receipt)).toEqual(changes);
  });

  // The Outcome claims no token identity, so a silent underlying plus one
  // same-shape decoy cannot put the decoy in the Outcome or the root text.
  // Uniqueness is evidence that one movement happened, never proof of which
  // contract made it. The decoy is still surfaced as a leaf, labeled an
  // unauthenticated candidate; the recursive projection is asserted end to end
  // in the mcp-server tests. Change 6 is the asset moving in.
  it("names no token when only a decoy emits the asset movement", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges().map((change, index) =>
      index === 6 ? transfer(DECOY_TOKEN, OWNER, VAULT, ASSETS) : change,
    );
    const receipt = registry.parseReceipt(capability, changes);

    expect(receipt.outcome).not.toHaveProperty("asset");
    expect(Object.values(receipt.outcome as Record<string, unknown>)).not.toContain(DECOY_TOKEN);
    expect(receipt.text).not.toContain(DECOY_TOKEN);
    expect(receipt.text).toBe(
      `Morpho supply: ${ASSETS} assets into vault ${VAULT} for ${OWNER}, ${SHARES} shares`,
    );
    // The decoy is still preserved as ordinary ERC-20 evidence, in place.
    expect(leafChanges(receipt)).toEqual(changes);
  });

  it("rejects a missing ERC-4626 Deposit event", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges().filter((_, index) => index !== 4);
    expect(() => registry.parseReceipt(capability, changes)).toThrow("requires the vault's");
  });

  it("rejects a duplicated ERC-4626 Deposit event", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges();
    const deposit = changes[4];
    if (!deposit) throw new Error("fixture drift");
    changes.push(deposit);
    expect(() => registry.parseReceipt(capability, changes)).toThrow("multiple Deposit events");
  });

  it("rejects a withdrawal's evidence under the supply Receipt", async () => {
    const { registry, capability } = await buildSupply();
    expect(() => registry.parseReceipt(capability, withdrawChanges())).toThrow(
      "received an ERC-4626 Withdraw",
    );
  });

  it("rejects a native transfer, which a vault flow never produces", async () => {
    const { registry, capability } = await buildSupply();
    const changes: Change[] = [
      { kind: "nativeTransfer", from: OWNER, to: VAULT, value: "1" },
      ...supplyChanges(),
    ];
    expect(() => registry.parseReceipt(capability, changes)).toThrow("moved native MON");
  });

  it("rejects an event no Morpho or ERC-20 ABI explains", async () => {
    const { registry, capability } = await buildSupply();
    const changes = supplyChanges();
    changes.push({
      kind: "event",
      address: NOT_A_VAULT,
      topics: ["0x1111111111111111111111111111111111111111111111111111111111111111"],
      data: "0x",
    });
    expect(() => registry.parseReceipt(capability, changes)).toThrow();
  });
});

describe("Morpho withdraw Receipt", () => {
  it("covers every Change in order and reports the evidenced outcome", async () => {
    const { registry, capability } = await buildWithdraw();
    const changes = withdrawChanges();
    const receipt = registry.parseReceipt(capability, changes);

    expect(leafChanges(receipt)).toEqual(changes);
    expect(receipt.outcome).toEqual({
      operation: "withdraw",
      vault: VAULT,
      owner: OWNER,
      receiver: OWNER,
      assets: ASSETS.toString(),
      shares: SHARES.toString(),
    });
  });

  it("rejects market evidence that returns the asset to another address", async () => {
    const { registry, capability } = await buildWithdraw();
    const changes = withdrawChanges().map((change, index) =>
      index === 4
        ? marketEvent("Withdraw", { caller: VAULT, onBehalf: VAULT, receiver: OTHER })
        : change,
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      "Withdraw.receiver to name vault",
    );
  });

  it("rejects a Withdraw whose caller does not own the shares it burned", async () => {
    const { registry, capability } = await buildWithdraw();
    const changes = withdrawChanges().map((change, index) =>
      index === 3
        ? event(MetaMorphoV1_1Abi, VAULT, "Withdraw", {
            sender: OTHER,
            receiver: OWNER,
            owner: OWNER,
            assets: ASSETS,
            shares: SHARES,
          })
        : change,
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow("to be the share owner");
  });

  it("rejects a receiver no asset transfer confirms", async () => {
    const { registry, capability } = await buildWithdraw();
    const changes = withdrawChanges().map((change, index) =>
      index === 3
        ? event(MetaMorphoV1_1Abi, VAULT, "Withdraw", {
            sender: OWNER,
            receiver: OTHER,
            owner: OWNER,
            assets: ASSETS,
            shares: SHARES,
          })
        : change,
    );
    expect(() => registry.parseReceipt(capability, changes)).toThrow("asset transfer out of");
  });

  // The receiver is free where the transfer proves it, because the Outcome
  // names it. Only identity the logs cannot confirm is refused.
  it("reports a receiver other than the owner when the transfer proves it", async () => {
    const { registry, capability } = await buildWithdraw();
    const changes = withdrawChanges().map((change, index) => {
      if (index === 3) {
        return event(MetaMorphoV1_1Abi, VAULT, "Withdraw", {
          sender: OWNER,
          receiver: OTHER,
          owner: OWNER,
          assets: ASSETS,
          shares: SHARES,
        });
      }
      return index === 6 ? transfer(ASSET, VAULT, OTHER, ASSETS) : change;
    });
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({ owner: OWNER, receiver: OTHER });
  });

  // The same candidate rule in the other direction. Change 6 is the asset
  // leaving the vault, 2 the share burn.
  it("rejects a decoy token that matches the asset transfer shape", async () => {
    const { registry, capability } = await buildWithdraw();
    const changes = insertBefore(withdrawChanges(), 6, transfer(DECOY_TOKEN, VAULT, OWNER, ASSETS));
    expect(() => registry.parseReceipt(capability, changes)).toThrow("exactly one asset movement");
    expect(() => registry.parseReceipt(capability, changes)).toThrow(DECOY_TOKEN);
  });

  it("rejects a duplicated asset transfer", async () => {
    const { registry, capability } = await buildWithdraw();
    expect(() => registry.parseReceipt(capability, repeatAt(withdrawChanges(), 6))).toThrow(
      "exactly one asset movement",
    );
  });

  it("rejects a duplicated share burn", async () => {
    const { registry, capability } = await buildWithdraw();
    expect(() => registry.parseReceipt(capability, repeatAt(withdrawChanges(), 2))).toThrow(
      "exactly one vault share movement",
    );
  });

  // The other direction of the same rule. Change 6 is the asset leaving the
  // vault for the receiver.
  it("names no token when only a decoy emits the asset movement", async () => {
    const { registry, capability } = await buildWithdraw();
    const changes = withdrawChanges().map((change, index) =>
      index === 6 ? transfer(DECOY_TOKEN, VAULT, OWNER, ASSETS) : change,
    );
    const receipt = registry.parseReceipt(capability, changes);

    expect(receipt.outcome).not.toHaveProperty("asset");
    expect(Object.values(receipt.outcome as Record<string, unknown>)).not.toContain(DECOY_TOKEN);
    expect(receipt.text).not.toContain(DECOY_TOKEN);
    expect(receipt.text).toBe(
      `Morpho withdraw: ${ASSETS} assets out of vault ${VAULT} for ${OWNER}, ${SHARES} shares`,
    );
    expect(leafChanges(receipt)).toEqual(changes);
  });
});

// ── Live Monad mainnet (read-only: Moss never signs or sends) ────────────

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Morpho mainnet", () => {
  it("has deployed bytecode and a factory wired to the registry's Morpho Blue", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    for (const address of [
      MORPHO_BLUE_ADDRESS,
      METAMORPHO_V1_1_FACTORY_ADDRESS,
      ADAPTIVE_CURVE_IRM_ADDRESS,
      GROVE_STEAKHOUSE_AUSD_VAULT,
    ]) {
      expect((await runtime.client.getCode({ address }))?.length ?? 0).toBeGreaterThan(2);
    }

    const [blue, created] = await Promise.all([
      runtime.client.readContract({
        address: METAMORPHO_V1_1_FACTORY_ADDRESS,
        abi: MetaMorphoV1_1FactoryAbi,
        functionName: "MORPHO",
      }),
      runtime.client.readContract({
        address: METAMORPHO_V1_1_FACTORY_ADDRESS,
        abi: MetaMorphoV1_1FactoryAbi,
        functionName: "isMetaMorpho",
        args: [GROVE_STEAKHOUSE_AUSD_VAULT],
      }),
    ]);
    expect(getAddress(blue)).toBe(getAddress(MORPHO_BLUE_ADDRESS));
    expect(created).toBe(true);
  });

  it("simulates a live supply into an exhaustive typed Receipt with no Warnings", {
    timeout: 180_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Morpho);
    // The simulator overrides only the sender's native balance, so the
    // sender has to hold the vault's asset for real. Morpho Blue custodies
    // every asset the vault has supplied into its markets, which makes it
    // the one address whose AUSD balance is guaranteed while the vault has
    // deposits. Nothing is signed or sent.
    const supplier = MORPHO_BLUE_ADDRESS;
    const capability = await registry.action("morpho", "supply", supplier, {
      vault: GROVE_STEAKHOUSE_AUSD_VAULT,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(outcome.halted).toBeUndefined();
    for (const result of outcome.results) expect(result.warnings).toEqual([]);
    const deposit = outcome.results.at(-1);
    expect(deposit?.protocol).toBe("morpho");
    const facts = deposit?.receipt?.outcome as MorphoVaultFlowOutcome | undefined;
    expect(facts?.operation).toBe("supply");
    expect(facts?.assets).toBe("1000000");
    // Receipt evidence keeps the trace's own casing; Moss never rewrites it.
    expect(facts?.vault.toLowerCase()).toBe(GROVE_STEAKHOUSE_AUSD_VAULT.toLowerCase());
    expect(facts?.owner.toLowerCase()).toBe(supplier.toLowerCase());
    // Exact coverage: every Change the trace produced is in the Receipt. The
    // floor keeps that from passing on an empty trace: a live deposit emits the
    // vault's bookkeeping, the share mint, the ERC-4626 Deposit, both asset
    // transfers and at least one Morpho Blue market event.
    const covered = leafChanges(deposit?.receipt).length;
    expect(covered).toBe(deposit?.changes?.length);
    expect(covered).toBeGreaterThanOrEqual(7);
  });

  it("reads a live position and the vault's terms", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Morpho);
    const info = await registry.action("morpho", "vaultInfo", MORPHO_BLUE_ADDRESS, {
      vault: GROVE_STEAKHOUSE_AUSD_VAULT,
    });
    if (info.kind !== "query") throw new Error("expected a Query");
    expect(info.data).toMatchObject({ assetSymbol: "AUSD", assetDecimals: 6 });
    expect(BigInt((info.data as { totalAssets: string }).totalAssets)).toBeGreaterThan(0n);

    const position = await registry.action("morpho", "position", MORPHO_BLUE_ADDRESS, {
      vault: GROVE_STEAKHOUSE_AUSD_VAULT,
      owner: MORPHO_BLUE_ADDRESS,
    });
    if (position.kind !== "query") throw new Error("expected a Query");
    expect(position.data).toMatchObject({ assetSymbol: "AUSD", shares: "0" });
  });
});
