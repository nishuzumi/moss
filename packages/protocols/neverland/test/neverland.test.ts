import {
  type Change,
  createRuntime,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type ReceiptChange,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi, WETH9Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { WMON_ADDRESS } from "@themoss/system";
import {
  type Abi,
  type AbiParameter,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
} from "viem";
import { describe, expect, it } from "vitest";
import {
  NeverlandATokenAbi,
  NeverlandPoolAbi,
  NeverlandRewardsAbi,
  PriceObservedAbi,
  WrappedTokenGatewayAbi,
} from "../src/abis/neverland.js";
import {
  NEVERLAND_GATEWAY_ADDRESS,
  NEVERLAND_POOL_ADDRESS,
  NEVERLAND_REWARDS_CONTROLLER,
  Neverland,
  type NeverlandOutcome,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");
// Real Neverland mainnet reserves and nTokens (docs.neverland.money/smart-contracts).
const USDC = getAddress("0x754704Bc059F8C67012fEd69BC8A327a5aafb603");
const NUSDC = getAddress("0x38648958836eA88b368b4ac23b86Ad44B0fe7508");
const NWMON = getAddress("0xD0fd2Cf7F6CEff4F96B1161F5E995D5843326154");
const ORACLE = getAddress("0x94bbA11004B9877d13bb5E1aE29319b6f7bDEdD4");
const DEBT_USDC = getAddress("0x3333333333333333333333333333333333333333");
const DEBT_WMON = getAddress("0x4444444444444444444444444444444444444444");

function reserveData(aToken: `0x${string}`, debtToken: `0x${string}`) {
  return {
    configuration: 0n,
    liquidityIndex: 10n ** 27n,
    currentLiquidityRate: 1n,
    variableBorrowIndex: 10n ** 27n,
    currentVariableBorrowRate: 2n,
    currentStableBorrowRate: 0n,
    lastUpdateTimestamp: 1,
    id: 0,
    aTokenAddress: aToken,
    stableDebtTokenAddress: ZERO,
    variableDebtTokenAddress: debtToken,
    interestRateStrategyAddress: ZERO,
    accruedToTreasury: 0n,
    unbacked: 0n,
    isolationModeTotalDebt: 0n,
  };
}

const client = {
  readContract: async ({
    address,
    functionName,
    args,
  }: {
    address: `0x${string}`;
    functionName: string;
    args?: readonly unknown[];
  }) => {
    if (functionName === "decimals") return address.toLowerCase() === USDC.toLowerCase() ? 6 : 18;
    if (functionName === "symbol")
      return address.toLowerCase() === USDC.toLowerCase() ? "USDC" : "WMON";
    if (functionName === "name") return "Mock Token";
    if (functionName === "balanceOf") {
      const token = address.toLowerCase();
      if (token === NUSDC.toLowerCase()) return 1_000_000n;
      if (token === DEBT_USDC.toLowerCase()) return 500_000n;
      return 0n;
    }
    if (functionName === "getReserveData") {
      const asset = String(args?.[0]).toLowerCase();
      if (asset === USDC.toLowerCase()) return reserveData(NUSDC, DEBT_USDC);
      if (asset === WMON_ADDRESS.toLowerCase()) return reserveData(NWMON, DEBT_WMON);
      throw new Error(`unknown reserve ${asset}`);
    }
    if (functionName === "getReservesList") return [USDC, WMON_ADDRESS];
    if (functionName === "getUserAccountData") {
      return [1_000_000n, 500_000n, 400_000n, 8_000n, 7_500n, 1_100_000_000_000_000_000n];
    }
    throw new Error(`unexpected read ${functionName}`);
  },
};

const runtime = { rpcUrl: "http://offline", client: client as unknown as MossRuntime["client"] };

function offlineRegistry() {
  return new Registry(runtime).use(Neverland);
}

function eventChange(
  abi: Abi,
  address: `0x${string}`,
  eventName: string,
  args: Record<string, unknown>,
  dataTypes: readonly AbiParameter[],
  dataValues: readonly unknown[],
): Change {
  return {
    kind: "event",
    address,
    topics: encodeEventTopics({ abi, eventName, args }) as readonly Hex[],
    data: dataTypes.length > 0 ? encodeAbiParameters(dataTypes, dataValues) : ("0x" as const),
  };
}

function erc20Transfer(
  token: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
) {
  return eventChange(ERC20Abi, token, "Transfer", { from, to }, [{ type: "uint256" }], [value]);
}

function priceObserved(
  emitter: `0x${string}`,
  asset: `0x${string}`,
  action: number,
  user: `0x${string}` = ACCOUNT,
): Change {
  return eventChange(
    PriceObservedAbi,
    emitter,
    "PriceObserved",
    { asset, oracle: ORACLE, user },
    [
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint8" },
      { type: "bool" },
      { type: "uint256" },
    ],
    [99_980_000n, 100_000_000n, action, true, 1_753_400_000n],
  );
}

function supplyEvent(amount: bigint): Change {
  return eventChange(
    NeverlandPoolAbi,
    NEVERLAND_POOL_ADDRESS,
    "Supply",
    { reserve: USDC, onBehalfOf: ACCOUNT, referralCode: 0 },
    [{ type: "address" }, { type: "uint256" }],
    [ACCOUNT, amount],
  );
}

function reserveDataUpdated(reserve: `0x${string}` = USDC): Change {
  return eventChange(
    NeverlandPoolAbi,
    NEVERLAND_POOL_ADDRESS,
    "ReserveDataUpdated",
    { reserve },
    [
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [1n, 0n, 2n, 10n ** 27n, 10n ** 27n],
  );
}

function firstChange(item: ReceiptChange | ReceiptResult): Change {
  if (item.kind === "change") return item.change;
  const [first] = item.changes;
  if (!first) throw new Error("empty nested receipt");
  return firstChange(first);
}

describe("Neverland", () => {
  it("registers its exported Protocol and builds an approve+supply tree", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [approval, supply] = flattenCapabilityTree(capability);
    if (!approval || !supply) throw new Error("expected approve and supply transactions");
    expect(approval.transaction.to).toBe(USDC);
    const approvalCall = decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data });
    expect(approvalCall).toMatchObject({
      functionName: "approve",
      args: [NEVERLAND_POOL_ADDRESS, 1_000_000n],
    });
    expect(supply.transaction.to).toBe(NEVERLAND_POOL_ADDRESS);
    const supplyCall = decodeFunctionData({ abi: NeverlandPoolAbi, data: supply.transaction.data });
    expect(supplyCall).toMatchObject({
      functionName: "supply",
      args: [USDC, 1_000_000n, ACCOUNT, 0],
    });
  });

  it("builds a native supply as one payable gateway transaction", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supplyNative", ACCOUNT, {
      amount: "0.5",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const nodes = flattenCapabilityTree(capability);
    expect(nodes).toHaveLength(1);
    const [deposit] = nodes;
    if (!deposit) throw new Error("expected a gateway transaction");
    expect(deposit.transaction).toMatchObject({
      to: NEVERLAND_GATEWAY_ADDRESS,
      value: "0x6f05b59d3b20000",
    });
    const call = decodeFunctionData({
      abi: WrappedTokenGatewayAbi,
      data: deposit.transaction.data,
    });
    expect(call).toMatchObject({
      functionName: "depositETH",
      args: [NEVERLAND_POOL_ADDRESS, ACCOUNT, 0],
    });
  });

  it("resolves the nToken on-chain for a native withdraw", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "withdrawNative", ACCOUNT, {
      amount: "0.25",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const [approval, withdraw] = flattenCapabilityTree(capability);
    if (!approval || !withdraw) throw new Error("expected approve and withdraw transactions");
    expect(approval.transaction.to).toBe(NWMON);
    const approvalCall = decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data });
    expect(approvalCall).toMatchObject({
      functionName: "approve",
      args: [NEVERLAND_GATEWAY_ADDRESS, 250_000_000_000_000_000n],
    });
    expect(withdraw.transaction.to).toBe(NEVERLAND_GATEWAY_ADDRESS);
  });

  it("builds variable-rate borrow and repay transactions", async () => {
    const registry = offlineRegistry();
    const borrow = await registry.action("neverland", "borrow", ACCOUNT, {
      asset: USDC,
      amount: "2",
    });
    if (borrow.kind !== "capability") throw new Error("expected capability");
    const borrowNodes = flattenCapabilityTree(borrow);
    expect(borrowNodes).toHaveLength(1);
    const [borrowTx] = borrowNodes;
    if (!borrowTx) throw new Error("expected a borrow transaction");
    const borrowCall = decodeFunctionData({
      abi: NeverlandPoolAbi,
      data: borrowTx.transaction.data,
    });
    expect(borrowCall).toMatchObject({
      functionName: "borrow",
      args: [USDC, 2_000_000n, 2n, 0, ACCOUNT],
    });

    const repay = await registry.action("neverland", "repay", ACCOUNT, {
      asset: USDC,
      amount: "2",
    });
    if (repay.kind !== "capability") throw new Error("expected capability");
    const repayNodes = flattenCapabilityTree(repay);
    expect(repayNodes).toHaveLength(2);
    const repayTx = repayNodes[1];
    if (!repayTx) throw new Error("expected a repay transaction");
    const repayCall = decodeFunctionData({
      abi: NeverlandPoolAbi,
      data: repayTx.transaction.data,
    });
    expect(repayCall).toMatchObject({
      functionName: "repay",
      args: [USDC, 2_000_000n, 2n, ACCOUNT],
    });
  });

  it("reads reserves, account data, and per-reserve positions", async () => {
    const registry = offlineRegistry();
    const reserves = await registry.action("neverland", "reserves", ACCOUNT, {});
    if (reserves.kind !== "query") throw new Error("expected query");
    expect(reserves.data).toMatchObject([
      { asset: USDC, symbol: "USDC", decimals: 6, nToken: NUSDC },
      { asset: WMON_ADDRESS, symbol: "WMON", decimals: 18, nToken: NWMON },
    ]);

    const account = await registry.action("neverland", "accountData", ACCOUNT, { user: ACCOUNT });
    if (account.kind !== "query") throw new Error("expected query");
    expect(account.data).toMatchObject({
      user: ACCOUNT,
      totalCollateralBase: "1000000",
      totalDebtBase: "500000",
      healthFactor: "1100000000000000000",
    });

    const position = await registry.action("neverland", "accountReserve", ACCOUNT, {
      asset: USDC,
      user: ACCOUNT,
    });
    if (position.kind !== "query") throw new Error("expected query");
    expect(position.data).toMatchObject({
      nToken: NUSDC,
      nTokenBalance: "1000000",
      variableDebtToken: DEBT_USDC,
      variableDebtBalance: "500000",
    });
  });

  it("parses a supply Receipt with its price observation and exact coverage", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      erc20Transfer(USDC, ACCOUNT, NUSDC, 1_000_000n),
      priceObserved(NUSDC, USDC, 1),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
      reserveDataUpdated(),
      supplyEvent(1_000_000n),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "supply",
      protocol: "neverland",
      asset: USDC,
      amount: "1000000",
      user: ACCOUNT,
      onBehalfOf: ACCOUNT,
      priceObservations: [
        {
          event: "PriceObserved",
          emitter: NUSDC,
          asset: USDC,
          price: "99980000",
          baseUnit: "100000000",
          oracle: ORACLE,
          action: 1,
          ok: true,
          user: ACCOUNT,
          timestamp: "1753400000",
        },
      ],
      rewardObservations: [],
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
    expect(receipt.changes[3]).toMatchObject({
      kind: "change",
      data: { event: "ReserveDataUpdated", reserve: USDC, liquidityRate: "1" },
    });
  });

  it("parses a native supply Receipt across WMON and native Changes", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supplyNative", ACCOUNT, {
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: NEVERLAND_GATEWAY_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;
    const deposit = eventChange(
      ERC20Abi,
      WMON_ADDRESS,
      "Transfer",
      { from: NEVERLAND_GATEWAY_ADDRESS, to: NWMON },
      [{ type: "uint256" }],
      [10n ** 18n],
    );
    const wmonDeposit = eventChange(
      WETH9Abi,
      WMON_ADDRESS,
      "Deposit",
      { dst: NEVERLAND_GATEWAY_ADDRESS },
      [{ type: "uint256" }],
      [10n ** 18n],
    );
    const changes = [
      native,
      wmonDeposit,
      deposit,
      priceObserved(NWMON, WMON_ADDRESS, 1),
      erc20Transfer(NWMON, ZERO, ACCOUNT, 10n ** 18n),
      supplyWmonEvent(10n ** 18n),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "supplyNative",
      protocol: "neverland",
      asset: WMON_ADDRESS,
      amount: "1000000000000000000",
      onBehalfOf: ACCOUNT,
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
    expect(receipt.changes[1]).toMatchObject({
      kind: "change",
      data: { event: "Deposit", account: NEVERLAND_GATEWAY_ADDRESS },
    });
  });

  it("parses withdraw, borrow, and repay Receipts with optional observations", async () => {
    const registry = offlineRegistry();

    const withdraw = await registry.action("neverland", "withdraw", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (withdraw.kind !== "capability") throw new Error("expected capability");
    const withdrawChanges = [
      erc20Transfer(NUSDC, ACCOUNT, ZERO, 1_000_000n),
      priceObserved(NUSDC, USDC, 7),
      erc20Transfer(USDC, NUSDC, ACCOUNT, 1_000_000n),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "Withdraw",
        { reserve: USDC, user: ACCOUNT, to: ACCOUNT },
        [{ type: "uint256" }],
        [1_000_000n],
      ),
    ] as const;
    const withdrawReceipt = registry.parseReceipt(withdraw, withdrawChanges);
    expect(withdrawReceipt.outcome).toMatchObject({
      operation: "withdraw",
      asset: USDC,
      amount: "1000000",
      to: ACCOUNT,
    });
    expect(withdrawReceipt.changes.map(firstChange)).toEqual(withdrawChanges);

    const borrow = await registry.action("neverland", "borrow", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (borrow.kind !== "capability") throw new Error("expected capability");
    const borrowChanges = [
      erc20Transfer(DEBT_USDC, ZERO, ACCOUNT, 1_000_000n),
      erc20Transfer(USDC, NUSDC, ACCOUNT, 1_000_000n),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "Borrow",
        { reserve: USDC, onBehalfOf: ACCOUNT, referralCode: 0 },
        [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [ACCOUNT, 1_000_000n, 2n, 20_000_000_000_000_000_000_000_000n],
      ),
    ] as const;
    const borrowReceipt = registry.parseReceipt(borrow, borrowChanges);
    expect(borrowReceipt.outcome).toEqual({
      operation: "borrow",
      protocol: "neverland",
      asset: USDC,
      amount: "1000000",
      user: ACCOUNT,
      onBehalfOf: ACCOUNT,
      priceObservations: [],
      rewardObservations: [],
    });
    expect(borrowReceipt.changes.map(firstChange)).toEqual(borrowChanges);

    const repay = await registry.action("neverland", "repay", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (repay.kind !== "capability") throw new Error("expected capability");
    const repayChanges = [
      erc20Transfer(USDC, ACCOUNT, NUSDC, 1_000_000n),
      erc20Transfer(DEBT_USDC, ACCOUNT, ZERO, 1_000_000n),
      priceObserved(DEBT_USDC, USDC, 3),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "Repay",
        { reserve: USDC, user: ACCOUNT, repayer: ACCOUNT },
        [{ type: "uint256" }, { type: "bool" }],
        [1_000_000n, false],
      ),
    ] as const;
    const repayReceipt = registry.parseReceipt(repay, repayChanges);
    expect(repayReceipt.outcome).toMatchObject({
      operation: "repay",
      asset: USDC,
      amount: "1000000",
      repayer: ACCOUNT,
    });
    expect(repayReceipt.changes.map(firstChange)).toEqual(repayChanges);
  });

  it("rejects a Receipt missing its Pool event", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(() =>
      registry.parseReceipt(capability, [erc20Transfer(USDC, ACCOUNT, NUSDC, 1_000_000n)]),
    ).toThrow("requires a Supply event");
  });

  it("rejects duplicated Pool events", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(() =>
      registry.parseReceipt(capability, [supplyEvent(1_000_000n), supplyEvent(1_000_000n)]),
    ).toThrow("multiple Supply events");
  });

  it("rejects a Pool event that does not match the capability", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const borrowEvent = eventChange(
      NeverlandPoolAbi,
      NEVERLAND_POOL_ADDRESS,
      "Borrow",
      { reserve: USDC, onBehalfOf: ACCOUNT, referralCode: 0 },
      [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [ACCOUNT, 1_000_000n, 2n, 1n],
    );
    expect(() => registry.parseReceipt(capability, [borrowEvent])).toThrow(
      "Neverland pool emitted Borrow",
    );
  });

  it("rejects an observation tagged with another action", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(() =>
      registry.parseReceipt(capability, [priceObserved(NUSDC, USDC, 2), supplyEvent(1_000_000n)]),
    ).toThrow("unexpected PriceObserved action 2");
  });

  it("rejects events it cannot place", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    // A WMON-shaped Deposit emitted by an unrelated contract is not evidence.
    const foreign = eventChange(
      WETH9Abi,
      getAddress("0x9999999999999999999999999999999999999999"),
      "Deposit",
      { dst: NEVERLAND_GATEWAY_ADDRESS },
      [{ type: "uint256" }],
      [1n],
    );
    expect(() => registry.parseReceipt(capability, [foreign, supplyEvent(1_000_000n)])).toThrow(
      "unsupported ERC-20 event",
    );
  });

  it("rejects a reserve update for an unrelated reserve", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(() =>
      registry.parseReceipt(capability, [
        reserveDataUpdated(WMON_ADDRESS),
        supplyEvent(1_000_000n),
      ]),
    ).toThrow("unrelated reserve");
  });

  it("parses Receipts regardless of Change order", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
      priceObserved(NUSDC, USDC, 1),
      erc20Transfer(USDC, ACCOUNT, NUSDC, 1_000_000n),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({ operation: "supply", amount: "1000000" });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("parses a withdrawNative Receipt with PriceObserved and WMON unwinding", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "withdrawNative", ACCOUNT, {
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      erc20Transfer(NWMON, ACCOUNT, NEVERLAND_GATEWAY_ADDRESS, 1_000_000n),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "ReserveDataUpdated",
        { reserve: WMON_ADDRESS },
        [
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        [1n, 0n, 2n, 10n ** 27n, 10n ** 27n],
      ),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "Withdraw",
        { reserve: WMON_ADDRESS, user: NEVERLAND_GATEWAY_ADDRESS, to: ACCOUNT },
        [{ type: "uint256" }],
        [1_000_000n],
      ),
      priceObserved(NWMON, WMON_ADDRESS, 7),
      eventChange(
        NeverlandRewardsAbi,
        NEVERLAND_REWARDS_CONTROLLER,
        "Accrued",
        {
          asset: WMON_ADDRESS,
          reward: WMON_ADDRESS,
          user: ACCOUNT,
        },
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [1n, 1n, 100n],
      ),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "ReserveUsedAsCollateralDisabled",
        {
          reserve: WMON_ADDRESS,
          user: ACCOUNT,
        },
        [],
        [],
      ),
      erc20Transfer(WMON_ADDRESS, NEVERLAND_GATEWAY_ADDRESS, ACCOUNT, 1_000_000n),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "withdrawNative",
      amount: "1000000",
      to: ACCOUNT,
    });
    const withdrawOutcome = receipt.outcome as NeverlandOutcome;
    expect(withdrawOutcome.rewardObservations).toHaveLength(1);
    expect(withdrawOutcome.rewardObservations[0]).toMatchObject({
      event: "Accrued",
      reward: WMON_ADDRESS,
      rewardsAccrued: "100",
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("includes Accrued reward observations in a supply Receipt", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      erc20Transfer(USDC, ACCOUNT, NUSDC, 1_000_000n),
      priceObserved(NUSDC, USDC, 1),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
      eventChange(
        NeverlandRewardsAbi,
        NEVERLAND_REWARDS_CONTROLLER,
        "Accrued",
        {
          asset: USDC,
          reward: USDC,
          user: ACCOUNT,
        },
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [1n, 1n, 500n],
      ),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    const supplyOutcome = receipt.outcome as NeverlandOutcome;
    expect(supplyOutcome.rewardObservations).toHaveLength(1);
    expect(supplyOutcome.rewardObservations[0]?.rewardsAccrued).toBe("500");
  });

  it("preserves a distinct onBehalfOf actor in supply Receipt", async () => {
    const registry = offlineRegistry();
    const ALICE = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
      onBehalfOf: ALICE,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "Supply",
        { reserve: USDC, onBehalfOf: ALICE, referralCode: 0 },
        [{ type: "address" }, { type: "uint256" }],
        [ACCOUNT, 1_000_000n],
      ),
      priceObserved(NUSDC, USDC, 1, ALICE),
      erc20Transfer(NUSDC, ZERO, ALICE, 1_000_000n),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "supply",
      onBehalfOf: ALICE,
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("rejects PriceObserved evidence for a user outside the operation", async () => {
    const registry = offlineRegistry();
    const ALICE = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      priceObserved(NUSDC, USDC, 1, ALICE),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
    ] as const;
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      /PriceObserved user .* does not match operation actor/,
    );
  });

  it("rejects Accrued reward evidence for a user outside the operation", async () => {
    const registry = offlineRegistry();
    const ALICE = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      priceObserved(NUSDC, USDC, 1),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
      eventChange(
        NeverlandRewardsAbi,
        NEVERLAND_REWARDS_CONTROLLER,
        "Accrued",
        {
          asset: USDC,
          reward: USDC,
          user: ALICE,
        },
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [1n, 1n, 500n],
      ),
    ] as const;
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      /Accrued user .* does not match operation actor/,
    );
  });

  it("rejects a reserve-token Mint that does not involve the operation actor", async () => {
    const registry = offlineRegistry();
    const ALICE = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      priceObserved(NUSDC, USDC, 1),
      eventChange(
        NeverlandATokenAbi,
        NUSDC,
        "Mint",
        { caller: NEVERLAND_POOL_ADDRESS, onBehalfOf: ALICE },
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [1_000_000n, 0n, 10n ** 27n],
      ),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
    ] as const;
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      /reserve-token Mint does not involve operation actor/,
    );
  });

  it("rejects a reserve-token Mint emitted by a foreign contract", async () => {
    const registry = offlineRegistry();
    const FOREIGN = getAddress("0xffffffffffffffffffffffffffffffffffffffff");
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      priceObserved(NUSDC, USDC, 1),
      eventChange(
        NeverlandATokenAbi,
        FOREIGN,
        "Mint",
        { caller: NEVERLAND_POOL_ADDRESS, onBehalfOf: ACCOUNT },
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [1_000_000n, 0n, 10n ** 27n],
      ),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
    ] as const;
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      /reserve-token Mint emitted by .* is not the operation's reserve token/,
    );
  });

  it("rejects a PriceObserved emitted by a foreign contract", async () => {
    const registry = offlineRegistry();
    const FOREIGN = getAddress("0xffffffffffffffffffffffffffffffffffffffff");
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      priceObserved(FOREIGN, USDC, 1),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
    ] as const;
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      /PriceObserved emitted by .* is not the operation's reserve token/,
    );
  });

  it("rejects a collateral toggle for an unrelated reserve", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "ReserveUsedAsCollateralEnabled",
        { reserve: WMON_ADDRESS, user: ACCOUNT },
        [],
        [],
      ),
    ] as const;
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      "Neverland supply ReserveUsedAsCollateralEnabled for unrelated reserve",
    );
  });

  it("rejects a collateral toggle for an unrelated user", async () => {
    const registry = offlineRegistry();
    const ALICE = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "ReserveUsedAsCollateralEnabled",
        { reserve: USDC, user: ALICE },
        [],
        [],
      ),
    ] as const;
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      "Neverland supply ReserveUsedAsCollateralEnabled user",
    );
  });

  it("rejects Accrued reward evidence for an unrelated reserve", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("neverland", "supply", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      supplyEvent(1_000_000n),
      erc20Transfer(NUSDC, ZERO, ACCOUNT, 1_000_000n),
      eventChange(
        NeverlandRewardsAbi,
        NEVERLAND_REWARDS_CONTROLLER,
        "Accrued",
        { asset: WMON_ADDRESS, reward: USDC, user: ACCOUNT },
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [1n, 1n, 1500n],
      ),
    ] as const;
    expect(() => registry.parseReceipt(capability, changes)).toThrow(
      "Neverland supply Accrued asset",
    );
  });

  it("preserves the user and onBehalfOf on a borrow with differing roles", async () => {
    const registry = offlineRegistry();
    const ALICE = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const capability = await registry.action("neverland", "borrow", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      erc20Transfer(DEBT_USDC, ZERO, ALICE, 1_000_000n),
      erc20Transfer(USDC, NUSDC, ALICE, 1_000_000n),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "Borrow",
        { reserve: USDC, onBehalfOf: ALICE, referralCode: 0 },
        [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [ACCOUNT, 1_000_000n, 2n, 1n],
      ),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "borrow",
      user: ACCOUNT,
      onBehalfOf: ALICE,
    });
  });

  it("preserves the user and receiver on a withdraw with differing roles", async () => {
    const registry = offlineRegistry();
    const ALICE = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const capability = await registry.action("neverland", "withdraw", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      erc20Transfer(NUSDC, ACCOUNT, ZERO, 1_000_000n),
      priceObserved(NUSDC, USDC, 7, ALICE),
      erc20Transfer(USDC, NUSDC, ALICE, 1_000_000n),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "Withdraw",
        { reserve: USDC, user: ACCOUNT, to: ALICE },
        [{ type: "uint256" }],
        [1_000_000n],
      ),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "withdraw",
      user: ACCOUNT,
      to: ALICE,
    });
  });

  it("preserves the debtor and repayer on a repay with differing roles", async () => {
    const registry = offlineRegistry();
    const ALICE = getAddress("0x1111111111111111111111111111111111111111");
    const capability = await registry.action("neverland", "repay", ACCOUNT, {
      asset: USDC,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const changes = [
      erc20Transfer(DEBT_USDC, ALICE, ZERO, 1_000_000n),
      eventChange(
        NeverlandPoolAbi,
        NEVERLAND_POOL_ADDRESS,
        "Repay",
        { reserve: USDC, user: ALICE, repayer: ACCOUNT, useATokens: false },
        [{ type: "uint256" }, { type: "bool" }],
        [1_000_000n, false],
      ),
    ] as const;
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "repay",
      user: ALICE,
      repayer: ACCOUNT,
    });
  });
});

function supplyWmonEvent(amount: bigint): Change {
  return eventChange(
    NeverlandPoolAbi,
    NEVERLAND_POOL_ADDRESS,
    "Supply",
    { reserve: WMON_ADDRESS, onBehalfOf: ACCOUNT, referralCode: 0 },
    [{ type: "address" }, { type: "uint256" }],
    [ACCOUNT, amount],
  );
}

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Neverland mainnet", () => {
  it("has deployed Pool and Gateway bytecode and lists the WMON reserve", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    expect(
      (await runtime.client.getCode({ address: NEVERLAND_POOL_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
    expect(
      (await runtime.client.getCode({ address: NEVERLAND_GATEWAY_ADDRESS }))?.length,
    ).toBeGreaterThan(2);
    expect(
      (await runtime.client.getCode({ address: NEVERLAND_REWARDS_CONTROLLER }))?.length,
    ).toBeGreaterThan(2);
    const reserves = await new Registry(runtime)
      .use(Neverland)
      .action("neverland", "reserves", ACCOUNT, {});
    if (reserves.kind !== "query") throw new Error("expected query");
    expect(Array.isArray(reserves.data)).toBe(true);
    const wmon = (reserves.data as readonly { symbol: string }[]).find(
      (reserve) => reserve.symbol === "WMON",
    );
    expect(wmon).toMatchObject({
      asset: WMON_ADDRESS,
      decimals: 18,
      nToken: "0xD0fd2Cf7F6CEff4F96B1161F5E995D5843326154",
    });
  });

  it("reads live reserveData for USDC via the Query", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Neverland);
    const result = await registry.action("neverland", "reserveData", ACCOUNT, {
      asset: USDC,
    });
    if (result.kind !== "query") throw new Error("expected query");
    expect(result.data).toMatchObject({
      asset: USDC,
      nToken: NUSDC,
    });
    const data = result.data as {
      currentLiquidityRate: unknown;
      currentVariableBorrowRate: unknown;
    };
    expect(typeof data.currentLiquidityRate).toBe("string");
    expect(typeof data.currentVariableBorrowRate).toBe("string");
  });

  it("simulates a native supply into an exhaustive typed Receipt", {
    timeout: 180_000,
  }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Neverland);
    const capability = await registry.action("neverland", "supplyNative", ACCOUNT, {
      amount: "0.01",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "supplyNative",
      protocol: "neverland",
      asset: WMON_ADDRESS,
      amount: "10000000000000000",
      onBehalfOf: ACCOUNT,
    });
  });
});
