import {
  type CapabilityNode,
  type Change,
  createRuntime,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { WMON, WMON_ADDRESS } from "@themoss/system";
import {
  type Abi,
  type AbiEvent,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  parseUnits,
  zeroAddress,
} from "viem";
import { describe, expect, it } from "vitest";
import {
  EthereumVaultConnectorAbi,
  EULER_ESCROWED_COLLATERAL_PERSPECTIVE_ADDRESS,
  EULER_EVC_ADDRESS,
  EULER_GOVERNED_PERSPECTIVE_ADDRESS,
  EULER_VAULT_FACTORY_ADDRESS,
  Euler,
  EVaultAbi,
  GenericFactoryAbi,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const WMON_VAULT = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
const USDC_VAULT = getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
const UNVERIFIED_VAULT = getAddress("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
const FOREIGN_EVC_VAULT = getAddress("0xffffffffffffffffffffffffffffffffffffffff");
const MOCK_WMON = getAddress("0x1111111111111111111111111111111111111111");
const MOCK_USDC = getAddress("0x2222222222222222222222222222222222222222");
const DEBT_TOKEN = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");

/**
 * Live vaults used by the Monad end-to-end tests. Both belong to K3 Capital's
 * isolated shMON-WMON-USDC market and are verified by Euler's on-chain governed
 * perspective; the USDC vault accepts the WMON vault as collateral, which is
 * what makes a borrow reachable in one simulated flow.
 * https://github.com/euler-xyz/euler-labels/blob/master/143/products.json
 */
const LIVE_WMON_VAULT = getAddress("0x7B4BcAEAC5Eb67ae947903F24BBa660eE06A5231");
const LIVE_USDC_VAULT = getAddress("0x5792753b66Eb5213E416755546abBcC1AEF1008A");
const LIVE_USDC = getAddress("0x754704Bc059F8C67012fEd69BC8A327a5aafb603");

// --- offline fixtures ------------------------------------------------------

type VaultFixture = {
  address: `0x${string}`;
  asset: `0x${string}`;
  assetDecimals: number;
  symbol: string;
  governed: boolean;
  escrowed: boolean;
  evc: `0x${string}`;
  isProxy: boolean;
  cash: bigint;
  maxDeposit: bigint;
  acceptedCollateral: Record<string, number>;
};

const vaultFixture = (over: Partial<VaultFixture> & { address: `0x${string}` }): VaultFixture => ({
  asset: MOCK_WMON,
  assetDecimals: 18,
  symbol: "eWMON-1",
  governed: true,
  escrowed: false,
  evc: EULER_EVC_ADDRESS as `0x${string}`,
  isProxy: true,
  cash: parseUnits("1000", 18),
  maxDeposit: parseUnits("1000000", 18),
  acceptedCollateral: {},
  ...over,
});

const VAULTS: readonly VaultFixture[] = [
  vaultFixture({ address: WMON_VAULT, acceptedCollateral: { [USDC_VAULT.toLowerCase()]: 7900 } }),
  vaultFixture({
    address: USDC_VAULT,
    asset: MOCK_USDC,
    assetDecimals: 6,
    symbol: "eUSDC-1",
    cash: parseUnits("50000", 6),
    maxDeposit: parseUnits("1000000", 6),
    acceptedCollateral: { [WMON_VAULT.toLowerCase()]: 7900 },
  }),
  vaultFixture({ address: UNVERIFIED_VAULT, governed: false, escrowed: false }),
  vaultFixture({
    address: FOREIGN_EVC_VAULT,
    evc: getAddress("0x9999999999999999999999999999999999999999"),
  }),
];

function offlineRegistry(
  options: { enabledCollaterals?: readonly string[]; enabledControllers?: readonly string[] } = {},
) {
  const byAddress = new Map(VAULTS.map((entry) => [entry.address.toLowerCase(), entry]));
  const collaterals = options.enabledCollaterals ?? [];
  const controllers = options.enabledControllers ?? [];

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
      const target = address.toLowerCase();

      if (target === EULER_VAULT_FACTORY_ADDRESS.toLowerCase()) {
        if (functionName === "isProxy") {
          return byAddress.get(String(args[0]).toLowerCase())?.isProxy ?? false;
        }
        throw new Error(`unexpected factory read ${functionName}`);
      }
      if (target === EULER_GOVERNED_PERSPECTIVE_ADDRESS.toLowerCase()) {
        if (functionName === "isVerified") {
          return byAddress.get(String(args[0]).toLowerCase())?.governed ?? false;
        }
        if (functionName === "verifiedArray") return VAULTS.map(({ address: a }) => a);
        throw new Error(`unexpected governed read ${functionName}`);
      }
      if (target === EULER_ESCROWED_COLLATERAL_PERSPECTIVE_ADDRESS.toLowerCase()) {
        if (functionName === "isVerified") {
          return byAddress.get(String(args[0]).toLowerCase())?.escrowed ?? false;
        }
        throw new Error(`unexpected escrowed read ${functionName}`);
      }
      if (target === EULER_EVC_ADDRESS.toLowerCase()) {
        if (functionName === "isControllerEnabled") {
          return controllers.includes(String(args[1]).toLowerCase());
        }
        if (functionName === "isCollateralEnabled") {
          return collaterals.includes(String(args[1]).toLowerCase());
        }
        if (functionName === "getCollaterals") return collaterals.map((a) => getAddress(a));
        throw new Error(`unexpected EVC read ${functionName}`);
      }
      if (target === MOCK_WMON.toLowerCase()) return 18;
      if (target === MOCK_USDC.toLowerCase()) return 6;

      const vault = byAddress.get(target);
      if (!vault) throw new Error(`unexpected read on ${address}`);
      switch (functionName) {
        case "EVC":
          return vault.evc;
        case "asset":
          return vault.asset;
        case "symbol":
          return vault.symbol;
        case "name":
          return `EVK Vault ${vault.symbol}`;
        case "cash":
          return vault.cash;
        case "maxDeposit":
          return vault.maxDeposit;
        case "LTVBorrow":
          return vault.acceptedCollateral[String(args[0]).toLowerCase()] ?? 0;
        default:
          throw new Error(`unexpected vault read ${functionName}`);
      }
    },
  };

  const runtime = { rpcUrl: "http://offline", client } as unknown as MossRuntime;
  return { registry: new Registry(runtime).use(Euler), runtime };
}

function eventChange(
  abi: Abi,
  address: `0x${string}`,
  eventName: string,
  args: Record<string, unknown>,
): Change {
  const topics = encodeEventTopics({ abi, eventName, args } as never);
  const item = abi.find(
    (entry): entry is AbiEvent => entry.type === "event" && entry.name === eventName,
  );
  if (!item) throw new Error(`no ${eventName} in the test ABI`);
  const unindexed = item.inputs.filter((input) => !input.indexed);
  return {
    kind: "event",
    address,
    topics: topics as Hex[],
    data: encodeAbiParameters(
      unindexed,
      unindexed.map((input) => args[input.name ?? ""]),
    ),
  };
}

/** The exact ordered Changes a real Euler deposit produces, verified against
 * Monad mainnet: EVC call context, underlying pull, share mint, Deposit,
 * vault status, EVC status check. */
function supplyChanges(assets: bigint, shares: bigint): Change[] {
  return [
    eventChange(EthereumVaultConnectorAbi, EULER_EVC_ADDRESS as `0x${string}`, "CallWithContext", {
      caller: WMON_VAULT,
      onBehalfOfAddressPrefix: `0x${ACCOUNT.slice(2, 40)}` as Hex,
      onBehalfOfAccount: ACCOUNT,
      targetContract: WMON_VAULT,
      selector: "0x6e553f65",
    }),
    eventChange(ERC20Abi, MOCK_WMON, "Transfer", {
      from: ACCOUNT,
      to: WMON_VAULT,
      value: assets,
    }),
    eventChange(EVaultAbi, WMON_VAULT, "Transfer", {
      from: zeroAddress,
      to: ACCOUNT,
      value: shares,
    }),
    eventChange(EVaultAbi, WMON_VAULT, "Deposit", {
      sender: ACCOUNT,
      owner: ACCOUNT,
      assets,
      shares,
    }),
    eventChange(EVaultAbi, WMON_VAULT, "VaultStatus", {
      totalShares: shares,
      totalBorrows: 0n,
      accumulatedFees: 0n,
      cash: assets,
      interestAccumulator: 10n ** 27n,
      interestRate: 0n,
      timestamp: 1_785_081_108n,
    }),
    eventChange(EthereumVaultConnectorAbi, EULER_EVC_ADDRESS as `0x${string}`, "VaultStatusCheck", {
      vault: WMON_VAULT,
    }),
  ];
}

// --- offline tests ---------------------------------------------------------

describe("Euler", () => {
  it("exposes lending coordinates with the two-part parameter contract", () => {
    const { registry } = offlineRegistry();

    expect(
      registry
        .discover({ category: "lending" })
        .map(({ protocol, method }) => `${protocol}.${method}`),
    ).toEqual([
      // Declared dependencies register before their dependent.
      "euler-vault-connector.enableCollateral",
      "euler-vault-connector.enableController",
      "euler-vault-connector.collaterals",
      "euler-vault-connector.controllers",
      "euler.supply",
      "euler.withdraw",
      "euler.borrow",
      "euler.repay",
      "euler.markets",
      "euler.vault",
      "euler.position",
    ]);
    expect(registry.discover({ verb: "borrow" }).map(({ protocol }) => protocol)).toEqual([
      "euler",
    ]);

    const [supply] = registry.load([{ protocol: "euler", method: "supply" }]);
    expect(supply).toMatchObject({
      verb: "supply",
      category: "lending",
      risk: ["fundOut", "approval"],
    });
    expect(supply?.params.vault).toMatchObject({
      description: expect.stringContaining("verified against the Euler factory"),
      type: { description: expect.stringContaining("20-byte EVM address") },
    });
    expect(supply?.params.amount?.description).toContain("display units");

    // The danger is in the closed risk set, not the long-tail tags: borrowing
    // records repayment obligations and hands the debt vault control of this
    // account's collateral; enabling a controller lets that vault seize it.
    const [borrow] = registry.load([{ protocol: "euler", method: "borrow" }]);
    expect(borrow).toMatchObject({ risk: ["approval", "debt", "liquidation"] });
    const [enableController] = registry.load([
      { protocol: "euler-vault-connector", method: "enableController" },
    ]);
    expect(enableController).toMatchObject({ risk: ["approval", "liquidation"] });
  });

  it("builds supply as an approval plus exactly one direct deposit", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("euler", "supply", ACCOUNT, {
      vault: WMON_VAULT,
      amount: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    expect(capability.children[0]).toMatchObject({
      kind: "capability",
      protocol: "erc20",
      method: "approve",
    });
    const [approval, deposit] = flattenCapabilityTree(capability);
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval?.transaction.data ?? "0x" })).toEqual(
      {
        functionName: "approve",
        args: [WMON_VAULT, parseUnits("1.5", 18)],
      },
    );
    expect(deposit?.transaction.to).toBe(WMON_VAULT);
    expect(decodeFunctionData({ abi: EVaultAbi, data: deposit?.transaction.data ?? "0x" })).toEqual(
      {
        functionName: "deposit",
        args: [parseUnits("1.5", 18), ACCOUNT],
      },
    );
    // Underlying decimals drive the conversion, not the vault's own.
    const usdc = await registry.action("euler", "supply", ACCOUNT, {
      vault: USDC_VAULT,
      amount: "1.5",
    });
    if (usdc.kind !== "capability") throw new Error("expected Capability");
    expect(flattenCapabilityTree(usdc)[1]?.transaction.data).toContain(
      parseUnits("1.5", 6).toString(16),
    );
  });

  it("refuses vaults the chain does not vouch for", async () => {
    const { registry } = offlineRegistry();

    await expect(
      registry.action("euler", "supply", ACCOUNT, { vault: UNVERIFIED_VAULT, amount: "1" }),
    ).rejects.toThrow("verified by neither the governed nor the escrowed-collateral perspective");
    await expect(
      registry.action("euler", "supply", ACCOUNT, { vault: FOREIGN_EVC_VAULT, amount: "1" }),
    ).rejects.toThrow("not the pinned one");
    await expect(
      registry.action("euler", "supply", ACCOUNT, {
        vault: getAddress("0x0707070707070707070707070707070707070707"),
        amount: "1",
      }),
    ).rejects.toThrow();
  });

  it("adds only the Vault Connector steps the account still needs", async () => {
    const fresh = offlineRegistry();
    const borrow = await fresh.registry.action("euler", "borrow", ACCOUNT, {
      vault: USDC_VAULT,
      amount: "100",
      collateral: WMON_VAULT,
    });
    if (borrow.kind !== "capability") throw new Error("expected Capability");
    expect(
      borrow.children.map((child) =>
        child.kind === "capability" ? `${child.protocol}.${child.method}` : "transaction",
      ),
    ).toEqual([
      "euler-vault-connector.enableCollateral",
      "euler-vault-connector.enableController",
      "transaction",
    ]);
    expect(flattenCapabilityTree(borrow)).toHaveLength(3);

    const ready = offlineRegistry({
      enabledCollaterals: [WMON_VAULT.toLowerCase()],
      enabledControllers: [USDC_VAULT.toLowerCase()],
    });
    const direct = await ready.registry.action("euler", "borrow", ACCOUNT, {
      vault: USDC_VAULT,
      amount: "100",
      collateral: WMON_VAULT,
    });
    if (direct.kind !== "capability") throw new Error("expected Capability");
    expect(flattenCapabilityTree(direct)).toHaveLength(1);
    expect(
      decodeFunctionData({
        abi: EVaultAbi,
        data: flattenCapabilityTree(direct)[0]?.transaction.data ?? "0x",
      }),
    ).toEqual({ functionName: "borrow", args: [parseUnits("100", 6), ACCOUNT] });
  });

  it("rejects borrows the vault or the account cannot support", async () => {
    const { registry } = offlineRegistry();

    await expect(
      registry.action("euler", "borrow", ACCOUNT, {
        vault: USDC_VAULT,
        amount: "100",
        collateral: UNVERIFIED_VAULT,
      }),
    ).rejects.toThrow("verified by neither");
    await expect(
      registry.action("euler", "borrow", ACCOUNT, { vault: USDC_VAULT, amount: "100" }),
    ).rejects.toThrow("no collateral enabled");
    await expect(
      registry.action("euler", "borrow", ACCOUNT, {
        vault: USDC_VAULT,
        amount: "999999",
        collateral: WMON_VAULT,
      }),
    ).rejects.toThrow("borrowable cash");

    const noLtv = offlineRegistry();
    await expect(
      noLtv.registry.action("euler", "borrow", ACCOUNT, {
        vault: USDC_VAULT,
        amount: "1",
        collateral: FOREIGN_EVC_VAULT,
      }),
    ).rejects.toThrow("not the pinned one");
  });

  it("parses a supply into a typed Outcome covering every Change in order", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("euler", "supply", ACCOUNT, {
      vault: WMON_VAULT,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    const assets = parseUnits("1", 18);
    const shares = parseUnits("0.92", 18);
    const changes = supplyChanges(assets, shares);
    const receipt = registry.parseReceipt(capability, changes);

    expect(receipt.protocol).toBe("euler");
    expect(receipt.outcome).toEqual({
      operation: "supply",
      vault: WMON_VAULT,
      asset: MOCK_WMON,
      sender: ACCOUNT,
      owner: ACCOUNT,
      assets: assets.toString(),
      shares: shares.toString(),
    });
    // Exact original Change objects, in order — including the one delegated to
    // the ERC-20 parser, which nests rather than flattens.
    const leaves = receipt.changes.map((entry) =>
      entry.kind === "change"
        ? entry.change
        : entry.changes[0]?.kind === "change"
          ? entry.changes[0].change
          : undefined,
    );
    expect(leaves).toEqual(changes);
    expect(receipt.changes[1]).toMatchObject({ kind: "receipt", protocol: "erc20" });
    expect(receipt.changes[2]).toMatchObject({ text: expect.stringContaining("Euler Share Mint") });
    // The Vault Connector is a declared Package label on the dependency that
    // parses its Changes, so its address renders as a name rather than hex.
    expect(receipt.changes[0]).toMatchObject({
      kind: "receipt",
      protocol: "euler-vault-connector",
      changes: [{ text: expect.stringContaining("Package(Euler Vault Connector:EVC)") }],
    });
  });

  it("refuses to state an Outcome its Changes do not support", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("euler", "supply", ACCOUNT, {
      vault: WMON_VAULT,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const assets = parseUnits("1", 18);
    const shares = parseUnits("0.92", 18);

    const withoutDeposit = supplyChanges(assets, shares).filter((_, index) => index !== 3);
    expect(() => registry.parseReceipt(capability, withoutDeposit)).toThrow(
      "requires a Deposit event",
    );

    const mismatched = supplyChanges(assets, shares);
    mismatched[1] = eventChange(ERC20Abi, MOCK_WMON, "Transfer", {
      from: ACCOUNT,
      to: WMON_VAULT,
      value: assets - 1n,
    });
    expect(() => registry.parseReceipt(capability, mismatched)).toThrow(
      "requires an underlying transfer into the vault",
    );

    const foreign = supplyChanges(assets, shares);
    foreign.push(
      eventChange(EVaultAbi, WMON_VAULT, "Liquidate", {
        liquidator: ACCOUNT,
        violator: ACCOUNT,
        collateral: USDC_VAULT,
        repayAssets: 1n,
        yieldBalance: 1n,
      }),
    );
    expect(() => registry.parseReceipt(capability, foreign)).toThrow(
      "emitted Liquidate during an Euler supply",
    );

    const native = supplyChanges(assets, shares);
    native.push({ kind: "nativeTransfer", from: ACCOUNT, to: WMON_VAULT, value: "1" });
    expect(() => registry.parseReceipt(capability, native)).toThrow("moved native MON");
  });

  it("identifies the underlying and the debt token by their role in a borrow", async () => {
    const { registry } = offlineRegistry({
      enabledCollaterals: [WMON_VAULT.toLowerCase()],
      enabledControllers: [USDC_VAULT.toLowerCase()],
    });
    const capability = await registry.action("euler", "borrow", ACCOUNT, {
      vault: USDC_VAULT,
      amount: "100",
      collateral: WMON_VAULT,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    const assets = parseUnits("100", 6);
    // The real ordering on Monad: connector context, the vault's own Borrow,
    // the debt-token mint, the underlying payout, then the status checks.
    const changes: Change[] = [
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "CallWithContext",
        {
          caller: USDC_VAULT,
          onBehalfOfAddressPrefix: `0x${ACCOUNT.slice(2, 40)}` as Hex,
          onBehalfOfAccount: ACCOUNT,
          targetContract: USDC_VAULT,
          selector: "0x4b3fd148",
        },
      ),
      eventChange(EVaultAbi, USDC_VAULT, "Borrow", { account: ACCOUNT, assets }),
      eventChange(ERC20Abi, DEBT_TOKEN, "Transfer", {
        from: zeroAddress,
        to: ACCOUNT,
        value: assets,
      }),
      eventChange(ERC20Abi, MOCK_USDC, "Transfer", {
        from: USDC_VAULT,
        to: ACCOUNT,
        value: assets,
      }),
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "AccountStatusCheck",
        { account: ACCOUNT, controller: USDC_VAULT },
      ),
    ];

    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "borrow",
      vault: USDC_VAULT,
      // Neither of these came from a parameter: the asset is whatever the vault
      // paid out, the debt token is whatever minted a matching balance.
      asset: MOCK_USDC,
      debtToken: DEBT_TOKEN,
      account: ACCOUNT,
      receiver: ACCOUNT,
      assets: assets.toString(),
    });

    const withoutDebtMint = changes.filter((_, index) => index !== 2);
    expect(() => registry.parseReceipt(capability, withoutDebtMint)).toThrow(
      "requires a debt-token mint matching the borrowed amount",
    );

    const shortPayout = [...changes];
    shortPayout[3] = eventChange(ERC20Abi, MOCK_USDC, "Transfer", {
      from: USDC_VAULT,
      to: ACCOUNT,
      value: assets - 1n,
    });
    expect(() => registry.parseReceipt(capability, shortPayout)).toThrow(
      "requires an underlying transfer out of the vault",
    );
  });

  it("refuses an ambiguous trace instead of guessing the asset or debt token", async () => {
    const { registry } = offlineRegistry({
      enabledCollaterals: [WMON_VAULT.toLowerCase()],
      enabledControllers: [USDC_VAULT.toLowerCase()],
    });

    // A decoy Transfer that moves exactly the reported amount and sits ahead of
    // the real movement costs an attacker one event, so an ambiguous trace must
    // fail loudly rather than let the Receipt name the decoy. The decoy token
    // is deliberately not one the vault ever touches.
    const decoy = getAddress("0x9999999999999999999999999999999999999999");

    const borrow = await registry.action("euler", "borrow", ACCOUNT, {
      vault: USDC_VAULT,
      amount: "100",
      collateral: WMON_VAULT,
    });
    if (borrow.kind !== "capability") throw new Error("expected Capability");
    const assets = parseUnits("100", 6);

    const decoyPayout = [
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "CallWithContext",
        {
          caller: USDC_VAULT,
          onBehalfOfAddressPrefix: `0x${ACCOUNT.slice(2, 40)}` as Hex,
          onBehalfOfAccount: ACCOUNT,
          targetContract: USDC_VAULT,
          selector: "0x4b3fd148",
        },
      ),
      eventChange(EVaultAbi, USDC_VAULT, "Borrow", { account: ACCOUNT, assets }),
      // Decoy payout: same amount, sits ahead of the real one.
      eventChange(ERC20Abi, decoy, "Transfer", {
        from: USDC_VAULT,
        to: ACCOUNT,
        value: assets,
      }),
      eventChange(ERC20Abi, MOCK_USDC, "Transfer", {
        from: USDC_VAULT,
        to: ACCOUNT,
        value: assets,
      }),
      eventChange(ERC20Abi, DEBT_TOKEN, "Transfer", {
        from: zeroAddress,
        to: ACCOUNT,
        value: assets,
      }),
    ];
    expect(() => registry.parseReceipt(borrow, decoyPayout)).toThrow(
      "transfers out of the vault match the reported",
    );

    // Decoy debt mint: keep the payout unique, add a second mint from zero.
    const decoyDebtMint = [
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "CallWithContext",
        {
          caller: USDC_VAULT,
          onBehalfOfAddressPrefix: `0x${ACCOUNT.slice(2, 40)}` as Hex,
          onBehalfOfAccount: ACCOUNT,
          targetContract: USDC_VAULT,
          selector: "0x4b3fd148",
        },
      ),
      eventChange(EVaultAbi, USDC_VAULT, "Borrow", { account: ACCOUNT, assets }),
      // Decoy mint: same amount, sits ahead of the real one.
      eventChange(ERC20Abi, decoy, "Transfer", {
        from: zeroAddress,
        to: ACCOUNT,
        value: assets,
      }),
      eventChange(ERC20Abi, DEBT_TOKEN, "Transfer", {
        from: zeroAddress,
        to: ACCOUNT,
        value: assets,
      }),
      eventChange(ERC20Abi, MOCK_USDC, "Transfer", {
        from: USDC_VAULT,
        to: ACCOUNT,
        value: assets,
      }),
    ];
    expect(() => registry.parseReceipt(borrow, decoyDebtMint)).toThrow(
      "debt-token mints match the reported",
    );

    const supply = await registry.action("euler", "supply", ACCOUNT, {
      vault: USDC_VAULT,
      amount: "100",
    });
    if (supply.kind !== "capability") throw new Error("expected Capability");

    const decoyInflow = [
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "CallWithContext",
        {
          caller: USDC_VAULT,
          onBehalfOfAddressPrefix: `0x${ACCOUNT.slice(2, 40)}` as Hex,
          onBehalfOfAccount: ACCOUNT,
          targetContract: USDC_VAULT,
          selector: "0x6e553f65",
        },
      ),
      // Decoy inflow: same amount, sits ahead of the real one.
      eventChange(ERC20Abi, decoy, "Transfer", {
        from: ACCOUNT,
        to: USDC_VAULT,
        value: assets,
      }),
      eventChange(ERC20Abi, MOCK_USDC, "Transfer", {
        from: ACCOUNT,
        to: USDC_VAULT,
        value: assets,
      }),
      eventChange(EVaultAbi, USDC_VAULT, "Transfer", {
        from: zeroAddress,
        to: ACCOUNT,
        value: assets,
      }),
      eventChange(EVaultAbi, USDC_VAULT, "Deposit", {
        sender: ACCOUNT,
        owner: ACCOUNT,
        assets,
        shares: assets,
      }),
    ];
    expect(() => registry.parseReceipt(supply, decoyInflow)).toThrow(
      "transfers into the vault match the reported",
    );

    const repay = await registry.action("euler", "repay", ACCOUNT, {
      vault: USDC_VAULT,
      amount: "100",
    });
    if (repay.kind !== "capability") throw new Error("expected Capability");

    const decoyDebtBurn = [
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "CallWithContext",
        {
          caller: USDC_VAULT,
          onBehalfOfAddressPrefix: `0x${ACCOUNT.slice(2, 40)}` as Hex,
          onBehalfOfAccount: ACCOUNT,
          targetContract: USDC_VAULT,
          selector: "0x3384d308",
        },
      ),
      // Decoy burn: same amount, sits ahead of the real one.
      eventChange(ERC20Abi, decoy, "Transfer", {
        from: ACCOUNT,
        to: zeroAddress,
        value: assets,
      }),
      eventChange(ERC20Abi, DEBT_TOKEN, "Transfer", {
        from: ACCOUNT,
        to: zeroAddress,
        value: assets,
      }),
      eventChange(ERC20Abi, MOCK_USDC, "Transfer", {
        from: ACCOUNT,
        to: USDC_VAULT,
        value: assets,
      }),
      eventChange(EVaultAbi, USDC_VAULT, "Repay", { account: ACCOUNT, assets }),
    ];
    expect(() => registry.parseReceipt(repay, decoyDebtBurn)).toThrow(
      "debt-token burns match the reported",
    );
  });

  it("parses Vault Connector enablement, including a first-touch owner registration", async () => {
    const { registry } = offlineRegistry();
    const capability = await registry.action("euler-vault-connector", "enableCollateral", ACCOUNT, {
      vault: WMON_VAULT,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    const changes: Change[] = [
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "OwnerRegistered",
        {
          addressPrefix: `0x${ACCOUNT.slice(2, 40)}` as Hex,
          owner: ACCOUNT,
        },
      ),
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "CollateralStatus",
        { account: ACCOUNT, collateral: WMON_VAULT, enabled: true },
      ),
    ];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "enableCollateral",
      account: ACCOUNT,
      vault: WMON_VAULT,
      enabled: true,
    });
    expect(receipt.changes).toHaveLength(2);

    const disabled: Change[] = [
      eventChange(
        EthereumVaultConnectorAbi,
        EULER_EVC_ADDRESS as `0x${string}`,
        "CollateralStatus",
        { account: ACCOUNT, collateral: WMON_VAULT, enabled: false },
      ),
    ];
    expect(() => registry.parseReceipt(capability, disabled)).toThrow(
      "reported the vault as disabled",
    );
  });
});

// --- Monad mainnet ---------------------------------------------------------

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Euler mainnet", () => {
  it("has deployed bytecode for every pinned singleton", { timeout: 60_000 }, async () => {
    const { client } = await createRuntime();
    for (const address of [
      EULER_EVC_ADDRESS,
      EULER_VAULT_FACTORY_ADDRESS,
      EULER_GOVERNED_PERSPECTIVE_ADDRESS,
      EULER_ESCROWED_COLLATERAL_PERSPECTIVE_ADDRESS,
    ]) {
      expect((await client.getCode({ address }))?.length, address).toBeGreaterThan(2);
    }
    const factoryImplementation = await client.readContract({
      address: EULER_VAULT_FACTORY_ADDRESS,
      abi: GenericFactoryAbi,
      functionName: "implementation",
    });
    expect((await client.getCode({ address: factoryImplementation }))?.length).toBeGreaterThan(2);
  });

  it("reads the live vaults it is about to act on", { timeout: 120_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Euler);

    const vault = await registry.action("euler", "vault", ACCOUNT, { vault: LIVE_WMON_VAULT });
    if (vault.kind !== "query") throw new Error("expected query");
    expect(vault.data).toMatchObject({
      vault: LIVE_WMON_VAULT,
      asset: WMON_ADDRESS,
      assetDecimals: 18,
      perspective: "governed",
    });
    expect(
      (vault.data as { acceptedCollateral: { vault: string }[] }).acceptedCollateral.length,
    ).toBeGreaterThan(0);

    const borrowSide = await registry.action("euler", "vault", ACCOUNT, { vault: LIVE_USDC_VAULT });
    if (borrowSide.kind !== "query") throw new Error("expected query");
    expect(borrowSide.data).toMatchObject({ asset: LIVE_USDC, assetDecimals: 6 });
    expect(
      (borrowSide.data as { acceptedCollateral: { vault: string }[] }).acceptedCollateral.map(
        ({ vault: v }) => getAddress(v),
      ),
    ).toContain(LIVE_WMON_VAULT);

    const position = await registry.action("euler", "position", ACCOUNT, {
      vault: LIVE_WMON_VAULT,
      owner: ACCOUNT,
    });
    if (position.kind !== "query") throw new Error("expected query");
    expect(position.data).toMatchObject({ shares: "0", debt: "0", controllerEnabled: false });
  });

  it("simulates wrap into supply into withdraw with zero Warnings", {
    timeout: 240_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(WMON, Euler);

    const wrap = await registry.action("wmon", "wrap", ACCOUNT, { amount: "1" });
    const supply = await registry.action("euler", "supply", ACCOUNT, {
      vault: LIVE_WMON_VAULT,
      amount: "1",
    });
    const withdraw = await registry.action("euler", "withdraw", ACCOUNT, {
      vault: LIVE_WMON_VAULT,
      amount: "0.5",
    });
    if (
      wrap.kind !== "capability" ||
      supply.kind !== "capability" ||
      withdraw.kind !== "capability"
    ) {
      throw new Error("expected Capabilities");
    }
    const capability = {
      ...withdraw,
      children: [wrap, supply, ...withdraw.children],
    } satisfies CapabilityNode;
    expect(() => registry.validateCapabilityTree(capability)).not.toThrow();

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results.every(({ warnings }) => warnings.length === 0)).toBe(true);
    expect(outcome.results.map(({ protocol, method }) => `${protocol}.${method}`)).toEqual([
      "wmon.wrap",
      "erc20.approve",
      "euler.supply",
      "euler.withdraw",
    ]);
    expect(outcome.results[2]?.receipt?.outcome).toMatchObject({
      operation: "supply",
      vault: LIVE_WMON_VAULT.toLowerCase(),
      asset: WMON_ADDRESS.toLowerCase(),
      owner: ACCOUNT,
      assets: parseUnits("1", 18).toString(),
    });
    expect(outcome.results[3]?.receipt?.outcome).toMatchObject({
      operation: "withdraw",
      receiver: ACCOUNT,
      assets: parseUnits("0.5", 18).toString(),
    });
  });

  it("simulates a collateralised borrow and repay with zero Warnings", {
    timeout: 300_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(WMON, Euler);
    const collateral = "5000";
    const borrowed = "1";

    const wrap = await registry.action("wmon", "wrap", ACCOUNT, { amount: collateral });
    const supply = await registry.action("euler", "supply", ACCOUNT, {
      vault: LIVE_WMON_VAULT,
      amount: collateral,
    });
    const borrow = await registry.action("euler", "borrow", ACCOUNT, {
      vault: LIVE_USDC_VAULT,
      amount: borrowed,
      collateral: LIVE_WMON_VAULT,
    });
    const repay = await registry.action("euler", "repay", ACCOUNT, {
      vault: LIVE_USDC_VAULT,
      amount: "0.5",
    });
    if (
      wrap.kind !== "capability" ||
      supply.kind !== "capability" ||
      borrow.kind !== "capability" ||
      repay.kind !== "capability"
    ) {
      throw new Error("expected Capabilities");
    }
    const capability = {
      ...repay,
      children: [wrap, supply, borrow, ...repay.children],
    } satisfies CapabilityNode;

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results.every(({ warnings }) => warnings.length === 0)).toBe(true);
    expect(outcome.results.map(({ protocol, method }) => `${protocol}.${method}`)).toEqual([
      "wmon.wrap",
      "erc20.approve",
      "euler.supply",
      "euler-vault-connector.enableCollateral",
      "euler-vault-connector.enableController",
      "euler.borrow",
      "erc20.approve",
      "euler.repay",
    ]);
    // Addresses decoded from event arguments keep their checksum; addresses
    // taken from a Change's emitter are lowercase, as the trace supplies them.
    expect(outcome.results[3]?.receipt?.outcome).toMatchObject({
      operation: "enableCollateral",
      vault: LIVE_WMON_VAULT,
      enabled: true,
    });
    expect(outcome.results[5]?.receipt?.outcome).toMatchObject({
      operation: "borrow",
      vault: LIVE_USDC_VAULT.toLowerCase(),
      asset: LIVE_USDC.toLowerCase(),
      account: ACCOUNT,
      receiver: ACCOUNT,
      assets: parseUnits(borrowed, 6).toString(),
    });
    expect(outcome.results[7]?.receipt?.outcome).toMatchObject({
      operation: "repay",
      account: ACCOUNT,
      assets: parseUnits("0.5", 6).toString(),
    });
  });
});
