import {
  type CapabilityNode,
  type Change,
  createRuntime,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator, type SimulateOutcome } from "@themoss/simulator";
import {
  type Address,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  formatUnits,
  getAddress,
  toEventSelector,
  toEventSignature,
  toFunctionSelector,
  toFunctionSignature,
} from "viem";
import { describe, expect, it } from "vitest";
import { AavePoolAbi, AaveScaledTokenAbi } from "../src/abis/aave.js";
import {
  AAVE_POOL_ADDRESS,
  AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS,
  AAVE_POOL_IMPLEMENTATION_ADDRESS,
  AAVE_RESERVES,
  Aave,
  type AaveAccountData,
  type AaveReserve,
} from "../src/index.js";
import { POOL_FUNCTIONS_USED, type PoolEventUsed } from "./surface.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const OTHER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");
const UNLISTED = getAddress("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
const STUB_TREASURY = getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

/**
 * Seed accounts for the live role search below. Simulation is read-only and Moss
 * never signs, so naming a real account costs nothing and needs no key, but no
 * account we do not control keeps a position: the one the live withdraw was
 * pinned to had its aUSDC drained to zero on chain between 2026-08-01 and
 * 2026-08-04, which turned the suite red with no commit behind it and nothing in
 * the repository to fix. So these are candidates a role search starts from
 * rather than fixtures any test depends on. A role that outlives all of them
 * fails by name rather than by revert.
 */
const LIVE_CANDIDATES = [
  getAddress("0xa7b6296945906D190Fc0ddFDc0fa1Da03382B891"),
  getAddress("0xa6B08DacBc644EeEA9143EFc8a07fBcA9F0e4F72"),
] as const;

/**
 * What every live role asks of a reserve: a thousand of its base units. That is
 * a thousandth of a six-decimal reserve and dust in an eighteen-decimal one, so
 * a role can be played by an account holding almost nothing, while staying well
 * clear of the amount that rounds to zero.
 */
const ROLE_UNITS = 1_000n;

/**
 * The reserves the borrow role limits its search to: the two six-decimal dollar
 * stablecoins this market quotes at about a dollar each. Scoping the search here
 * is what lets `canBorrow` value ROLE_UNITS without an oracle. Every reserve it
 * can settle on is a dollar stablecoin, so pricing a token at a dollar never
 * misprices a volatile reserve, which a fixed base-currency gate did by ignoring
 * both the reserve and the amount. The oracle read that would price any reserve
 * is not vendored here. ADR 0007 forbids hand-writing an ABI to add one, so the
 * fixture stays on the dollar surface it already tests.
 */
const BORROW_STABLECOINS = ["USDC", "USDT0"] as const;

/**
 * How much more borrowing power the borrow role asks for than ROLE_UNITS is
 * strictly worth. The value can drift between the read and the borrow, so the
 * role wants a small cushion over the amount rather than exactly it.
 */
const ROLE_BORROW_MARGIN = 2n;

const USDC = reserveFor("USDC");
const USDT0 = reserveFor("USDT0");
/** A liquidity index taken from a real Monad trace, in ray. */
const INDEX = 1_001_671_124_511_161_758_483_196_403n;

function reserveFor(symbol: string): AaveReserve {
  const reserve = AAVE_RESERVES.find((entry) => entry.symbol === symbol);
  if (!reserve) throw new Error(`the address book no longer lists ${symbol}`);
  return reserve;
}

function offlineRegistry() {
  const runtime: MossRuntime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };
  return new Registry(runtime).use(Aave);
}

async function capabilityFor(
  method: "supply" | "withdraw" | "borrow" | "repay",
  params: Record<string, unknown>,
  account: Address = ACCOUNT,
) {
  const capability = await offlineRegistry().action("aave", method, account, params);
  if (capability.kind !== "capability") throw new Error("expected a Capability");
  return capability;
}

// --- Change fixtures, shaped exactly like the traces this adapter simulates ---

function poolSupply(reserve: AaveReserve, user: Address, onBehalfOf: Address, amount: bigint) {
  return {
    kind: "event",
    address: AAVE_POOL_ADDRESS,
    topics: encodeEventTopics({
      abi: AavePoolAbi,
      eventName: "Supply",
      args: { reserve: reserve.underlying, onBehalfOf, referralCode: 0 },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [user, amount]),
  } satisfies Change;
}

function poolWithdraw(reserve: AaveReserve, user: Address, to: Address, amount: bigint) {
  return {
    kind: "event",
    address: AAVE_POOL_ADDRESS,
    topics: encodeEventTopics({
      abi: AavePoolAbi,
      eventName: "Withdraw",
      args: { reserve: reserve.underlying, user, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  } satisfies Change;
}

function poolBorrow(
  reserve: AaveReserve,
  user: Address,
  onBehalfOf: Address,
  amount: bigint,
  interestRateMode = 2,
) {
  return {
    kind: "event",
    address: AAVE_POOL_ADDRESS,
    topics: encodeEventTopics({
      abi: AavePoolAbi,
      eventName: "Borrow",
      args: { reserve: reserve.underlying, onBehalfOf, referralCode: 0 },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }, { type: "uint8" }, { type: "uint256" }],
      [user, amount, interestRateMode, 36_669_230_592_558_996_100_227_567n],
    ),
  } satisfies Change;
}

function poolRepay(
  reserve: AaveReserve,
  user: Address,
  repayer: Address,
  amount: bigint,
  useATokens = false,
) {
  return {
    kind: "event",
    address: AAVE_POOL_ADDRESS,
    topics: encodeEventTopics({
      abi: AavePoolAbi,
      eventName: "Repay",
      args: { reserve: reserve.underlying, user, repayer },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "bool" }], [amount, useATokens]),
  } satisfies Change;
}

function poolRatesUpdated(reserve: AaveReserve) {
  return {
    kind: "event",
    address: AAVE_POOL_ADDRESS,
    topics: encodeEventTopics({
      abi: AavePoolAbi,
      eventName: "ReserveDataUpdated",
      args: { reserve: reserve.underlying },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      [23_455_889_043_532_674_173_894_415n, 0n, 34_034_034_558_403_462_868_347_260n, INDEX, INDEX],
    ),
  } satisfies Change;
}

function poolCollateral(reserve: AaveReserve, user: Address, enabled: boolean) {
  return {
    kind: "event",
    address: AAVE_POOL_ADDRESS,
    topics: encodeEventTopics({
      abi: AavePoolAbi,
      eventName: enabled ? "ReserveUsedAsCollateralEnabled" : "ReserveUsedAsCollateralDisabled",
      args: { reserve: reserve.underlying, user },
    }) as readonly Hex[],
    data: "0x",
  } satisfies Change;
}

function positionMint(
  token: Address,
  caller: Address,
  onBehalfOf: Address,
  value: bigint,
  balanceIncrease: bigint,
) {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: AaveScaledTokenAbi,
      eventName: "Mint",
      args: { caller, onBehalfOf },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [value, balanceIncrease, INDEX],
    ),
  } satisfies Change;
}

function positionBurn(
  token: Address,
  from: Address,
  target: Address,
  value: bigint,
  balanceIncrease: bigint,
) {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: AaveScaledTokenAbi,
      eventName: "Burn",
      args: { from, target },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [value, balanceIncrease, INDEX],
    ),
  } satisfies Change;
}

function erc20Transfer(token: Address, from: Address, to: Address, value: bigint) {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  } satisfies Change;
}

function erc20Approval(token: Address, owner: Address, spender: Address, value: bigint) {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Approval",
      args: { owner, spender },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  } satisfies Change;
}

/**
 * The USDT0 supply this adapter simulated on Monad mainnet, Change for Change,
 * including the two optional records a supply can carry: the Approval a
 * USDT-style token emits when its allowance is spent, and the collateral flag
 * on a first supply of that reserve.
 */
function supplyChanges(): Change[] {
  return [
    poolRatesUpdated(USDT0),
    erc20Transfer(USDT0.underlying, ACCOUNT, USDT0.aToken, 1_000_000n),
    erc20Approval(USDT0.underlying, ACCOUNT, AAVE_POOL_ADDRESS, 0n),
    erc20Transfer(USDT0.aToken, ZERO, ACCOUNT, 999_999n),
    positionMint(USDT0.aToken, ACCOUNT, ACCOUNT, 999_999n, 0n),
    poolCollateral(USDT0, ACCOUNT, true),
    poolSupply(USDT0, ACCOUNT, ACCOUNT, 1_000_000n),
  ];
}

function withdrawChanges(): Change[] {
  return [
    poolRatesUpdated(USDC),
    erc20Transfer(USDC.aToken, ACCOUNT, ZERO, 996_381n),
    positionBurn(USDC.aToken, ACCOUNT, ACCOUNT, 996_381n, 3_619n),
    erc20Transfer(USDC.underlying, USDC.aToken, ACCOUNT, 1_000_000n),
    poolWithdraw(USDC, ACCOUNT, ACCOUNT, 1_000_000n),
  ];
}

function borrowChanges(interestRateMode = 2): Change[] {
  return [
    erc20Transfer(USDC.variableDebtToken, ZERO, ACCOUNT, 1_000_001n),
    positionMint(USDC.variableDebtToken, ACCOUNT, ACCOUNT, 1_000_001n, 0n),
    poolRatesUpdated(USDC),
    erc20Transfer(USDC.underlying, USDC.aToken, ACCOUNT, 1_000_000n),
    poolBorrow(USDC, ACCOUNT, ACCOUNT, 1_000_000n, interestRateMode),
  ];
}

function repayChanges(useATokens = false): Change[] {
  return [
    erc20Transfer(USDC.variableDebtToken, ACCOUNT, ZERO, 999n),
    positionBurn(USDC.variableDebtToken, ACCOUNT, ZERO, 999n, 1n),
    poolRatesUpdated(USDC),
    erc20Transfer(USDC.underlying, ACCOUNT, USDC.aToken, 1_000n),
    poolRepay(USDC, ACCOUNT, ACCOUNT, 1_000n, useATokens),
  ];
}

/** One Change swapped out of a fixture trace, leaving the rest untouched. */
function replace(changes: Change[], index: number, change: Change): Change[] {
  return changes.map((original, at) => (at === index ? change : original));
}

/** One extra Change spliced into a fixture trace, pushing the rest along. */
function insert(changes: Change[], index: number, change: Change): Change[] {
  return [...changes.slice(0, index), change, ...changes.slice(index)];
}

/** One Change dropped out of a fixture trace. */
function drop(changes: Change[], index: number): Change[] {
  return changes.filter((_, at) => at !== index);
}

/** Two Changes exchanged, for an order a real trace can only have one way. */
function swap(changes: Change[], left: number, right: number): Change[] {
  return changes.map((change, at) => {
    if (at === left) return changes[right] as Change;
    if (at === right) return changes[left] as Change;
    return change;
  });
}

/** A supply trace carries its collateral flag at index 5. */
function supplyWithFlag(flag: Change): Change[] {
  return replace(supplyChanges(), 5, flag);
}

/**
 * A full withdraw disables the reserve as collateral. Aave moved that emission
 * from before the aToken burn to after it between v3.3 and v3.6, so the parser
 * binds the flag's reserve and account rather than its position in the trace;
 * this fixture puts it last, just before the Pool event.
 */
function withdrawWithFlag(flag: Change): Change[] {
  const changes = withdrawChanges();
  return [...changes.slice(0, 4), flag, ...changes.slice(4)];
}

function firstChange(entry: ReceiptResult["changes"][number]): Change {
  if (entry.kind === "change") return entry.change;
  const [child] = entry.changes;
  if (child?.kind !== "change") throw new Error("expected one nested ReceiptChange");
  return child.change;
}

async function parse(
  method: "supply" | "withdraw" | "borrow" | "repay",
  params: Record<string, unknown>,
  changes: readonly Change[],
) {
  const registry = offlineRegistry();
  const capability = await registry.action("aave", method, ACCOUNT, params);
  if (capability.kind !== "capability") throw new Error("expected a Capability");
  return registry.parseReceipt(capability, changes);
}

describe("Aave", () => {
  it("loads a reusable value type separately from each field's purpose", () => {
    const [supply, borrow, account] = offlineRegistry().load([
      { protocol: "aave", method: "supply" },
      { protocol: "aave", method: "borrow" },
      { protocol: "aave", method: "accountData" },
    ]);
    expect(supply).toMatchObject({ verb: "supply", category: "lending" });
    expect(supply?.risk).toEqual(["fundOut", "approval"]);
    expect(supply?.params.amount).toMatchObject({
      description: expect.stringContaining("deposit"),
      type: { description: expect.stringContaining("decimal string") },
    });
    expect(supply?.params.asset).toMatchObject({
      description: expect.stringContaining("deposited"),
      type: { description: expect.stringContaining("20-byte EVM address") },
    });
    expect(borrow).toMatchObject({ verb: "borrow" });
    // A borrow adds an obligation and moves nothing out, so it is `debt`, the
    // label Core defines for exactly that (#119), never `fundOut`. It also puts
    // the account's collateral within a liquidator's reach.
    expect(borrow?.risk).toEqual(["debt", "liquidation"]);
    // Aave takes an interestRateMode; the adapter deliberately does not, so an
    // Agent cannot pass the stable mode this deployment removed.
    expect(Object.keys(borrow?.params ?? {})).toEqual(["asset", "amount"]);
    expect(account?.kind).toBe("query");
  });

  /**
   * ADR 0003's amendment (#139) put `leverage` and `liquidation` in the closed
   * risk set, so the four writes are pinned as a set rather than one at a time.
   * `liquidation` goes on the two that move account health the wrong way: a
   * borrow creates the exposure a liquidator acts on and a withdraw removes the
   * buffer against it. A supply and a repay only move health up.
   */
  it("declares liquidation risk on the two writes that move account health", () => {
    const [supply, withdraw, borrow, repay] = offlineRegistry().load([
      { protocol: "aave", method: "supply" },
      { protocol: "aave", method: "withdraw" },
      { protocol: "aave", method: "borrow" },
      { protocol: "aave", method: "repay" },
    ]);
    expect(supply?.risk).toEqual(["fundOut", "approval"]);
    expect(withdraw?.risk).toEqual(["fundOut", "liquidation"]);
    expect(borrow?.risk).toEqual(["debt", "liquidation"]);
    expect(repay?.risk).toEqual(["fundOut", "approval"]);
    // Nothing here is leveraged: Aave lends under the reserve's LTV, so no
    // Capability puts exposure above the collateral posted.
    for (const loaded of [supply, withdraw, borrow, repay]) {
      expect(loaded?.risk).not.toContain("leverage");
    }
  });

  it("nests one exact-amount approval and owns one Pool supply transaction", async () => {
    const capability = await capabilityFor("supply", { asset: USDT0.underlying, amount: "1.5" });
    const [approval, supply] = flattenCapabilityTree(capability);
    if (!approval || !supply) throw new Error("missing Aave transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [AAVE_POOL_ADDRESS, 1_500_000n],
    });
    expect(approval.transaction.to).toBe(USDT0.underlying);
    expect(decodeFunctionData({ abi: AavePoolAbi, data: supply.transaction.data })).toEqual({
      functionName: "supply",
      args: [USDT0.underlying, 1_500_000n, ACCOUNT, 0],
    });
    expect(supply.transaction).toMatchObject({ to: AAVE_POOL_ADDRESS, value: "0x0" });
    expect(capability.children.filter((child) => child.kind === "transaction")).toHaveLength(1);
  });

  it("withdraws and borrows without an approval", async () => {
    const withdraw = await capabilityFor("withdraw", { asset: USDC.underlying, amount: "2" });
    const withdrawTransactions = flattenCapabilityTree(withdraw);
    expect(withdrawTransactions).toHaveLength(1);
    expect(
      decodeFunctionData({
        abi: AavePoolAbi,
        data: withdrawTransactions[0]?.transaction.data ?? "0x",
      }),
    ).toEqual({ functionName: "withdraw", args: [USDC.underlying, 2_000_000n, ACCOUNT] });

    const borrow = await capabilityFor("borrow", { asset: USDC.underlying, amount: "3" });
    const borrowTransactions = flattenCapabilityTree(borrow);
    expect(borrowTransactions).toHaveLength(1);
    // interestRateMode 2 is VARIABLE. Aave v3.2 removed the stable mode and
    // mode 1 reverts on this deployment, so it is a constant, not an input.
    expect(
      decodeFunctionData({
        abi: AavePoolAbi,
        data: borrowTransactions[0]?.transaction.data ?? "0x",
      }),
    ).toEqual({ functionName: "borrow", args: [USDC.underlying, 3_000_000n, 2n, 0, ACCOUNT] });
  });

  it("repays in kind behind one exact-amount approval", async () => {
    const capability = await capabilityFor("repay", { asset: USDC.underlying, amount: "0.001" });
    const [approval, repay] = flattenCapabilityTree(capability);
    if (!approval || !repay) throw new Error("missing Aave transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      args: [AAVE_POOL_ADDRESS, 1_000n],
    });
    expect(decodeFunctionData({ abi: AavePoolAbi, data: repay.transaction.data })).toEqual({
      functionName: "repay",
      args: [USDC.underlying, 1_000n, 2n, ACCOUNT],
    });
  });

  it("rejects an asset the market does not list and an amount that rounds away", async () => {
    await expect(capabilityFor("supply", { asset: UNLISTED, amount: "1" })).rejects.toThrow(
      "is not an Aave v3 reserve on Monad",
    );
    await expect(
      capabilityFor("supply", { asset: USDC.underlying, amount: "0.0000001" }),
    ).rejects.toThrow("rounds to zero");
    await expect(
      offlineRegistry().action("aave", "supply", ACCOUNT, {
        asset: USDC.underlying,
        amount: "1",
        interestRateMode: 1,
      }),
    ).rejects.toThrow("invalid parameters");
  });

  it("translates a real supply trace into a typed Outcome over the original Changes", async () => {
    const changes = supplyChanges();
    const receipt = await parse("supply", { asset: USDT0.underlying, amount: "1" }, changes);
    expect(receipt.protocol).toBe("aave");
    expect(receipt.outcome).toEqual({
      operation: "supply",
      protocol: "aave",
      asset: USDT0.underlying,
      symbol: "USDT0",
      amount: "1000000",
      user: ACCOUNT,
      onBehalfOf: ACCOUNT,
      position: {
        event: "Mint",
        token: USDT0.aToken,
        amount: "999999",
        balanceIncrease: "0",
        index: INDEX.toString(),
      },
      collateral: "enabled",
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
    expect(receipt.text).toContain("Aave Supply: 1000000");
    // Registry projects the Protocol's own Package labels over Receipt text.
    expect(receipt.changes[4]).toMatchObject({
      text: expect.stringContaining("Package(Aave:aUSDT0)"),
    });
  });

  it("translates a real withdraw trace, including the interest that accrued", async () => {
    const changes = withdrawChanges();
    const receipt = await parse("withdraw", { asset: USDC.underlying, amount: "1" }, changes);
    expect(receipt.outcome).toEqual({
      operation: "withdraw",
      protocol: "aave",
      asset: USDC.underlying,
      symbol: "USDC",
      amount: "1000000",
      user: ACCOUNT,
      to: ACCOUNT,
      position: {
        event: "Burn",
        token: USDC.aToken,
        amount: "996381",
        balanceIncrease: "3619",
        index: INDEX.toString(),
      },
      collateral: null,
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("translates a real borrow trace as an inflow with no outflow", async () => {
    const changes = borrowChanges();
    const receipt = await parse("borrow", { asset: USDC.underlying, amount: "1" }, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "borrow",
      asset: USDC.underlying,
      amount: "1000000",
      user: ACCOUNT,
      onBehalfOf: ACCOUNT,
      interestRateMode: "variable",
      position: { event: "Mint", token: USDC.variableDebtToken, amount: "1000001" },
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("translates a real repay trace", async () => {
    const changes = repayChanges();
    const receipt = await parse("repay", { asset: USDC.underlying, amount: "0.001" }, changes);
    expect(receipt.outcome).toMatchObject({
      operation: "repay",
      amount: "1000",
      user: ACCOUNT,
      repayer: ACCOUNT,
      interestRateMode: "variable",
      position: { event: "Burn", token: USDC.variableDebtToken, balanceIncrease: "1" },
    });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("accepts the Mint a withdraw emits when accrued interest exceeds the amount", async () => {
    // ScaledBalanceTokenBase._burnScaled mints the difference instead of
    // burning when balanceIncrease > amount, so a withdraw can show a Mint.
    const changes: Change[] = [
      poolRatesUpdated(USDC),
      erc20Transfer(USDC.aToken, ZERO, ACCOUNT, 500n),
      positionMint(USDC.aToken, ACCOUNT, ACCOUNT, 500n, 1_500n),
      erc20Transfer(USDC.underlying, USDC.aToken, ACCOUNT, 1_000n),
      poolWithdraw(USDC, ACCOUNT, ACCOUNT, 1_000n),
    ];
    const receipt = await parse("withdraw", { asset: USDC.underlying, amount: "0.001" }, changes);
    expect(receipt.outcome).toMatchObject({ position: { event: "Mint", balanceIncrease: "1500" } });
  });

  it("reads the collateral flag a full withdraw emits", async () => {
    const changes = withdrawWithFlag(poolCollateral(USDC, ACCOUNT, false));
    const receipt = await parse("withdraw", { asset: USDC.underlying, amount: "1" }, changes);
    expect(receipt.outcome).toMatchObject({ collateral: "disabled" });
    expect(receipt.changes.map(firstChange)).toEqual(changes);
  });

  it("binds a collateral flag to the operation's own reserve and account", async () => {
    const supplyCases: [string, Change[], string][] = [
      [
        // Reported on #157: a flag from another reserve for another account
        // used to parse as this supply's own collateral evidence.
        "another reserve and another account",
        supplyWithFlag(poolCollateral(USDC, OTHER, true)),
        "collateral flag for reserve",
      ],
      ["another reserve", supplyWithFlag(poolCollateral(USDC, ACCOUNT, true)), "not USDT0"],
      ["another account", supplyWithFlag(poolCollateral(USDT0, OTHER, true)), `not ${ACCOUNT}`],
      [
        "a supply that disabled collateral",
        supplyWithFlag(poolCollateral(USDT0, ACCOUNT, false)),
        "saw collateral disabled",
      ],
    ];
    for (const [name, changes, message] of supplyCases) {
      await expect(
        parse("supply", { asset: USDT0.underlying, amount: "1" }, changes),
        name,
      ).rejects.toThrow(message);
    }

    const withdrawCases: [string, Change[], string][] = [
      ["another reserve", withdrawWithFlag(poolCollateral(USDT0, ACCOUNT, false)), "not USDC"],
      ["another account", withdrawWithFlag(poolCollateral(USDC, OTHER, false)), `not ${ACCOUNT}`],
      [
        "a withdraw that enabled collateral",
        withdrawWithFlag(poolCollateral(USDC, ACCOUNT, true)),
        "saw collateral enabled",
      ],
    ];
    for (const [name, changes, message] of withdrawCases) {
      await expect(
        parse("withdraw", { asset: USDC.underlying, amount: "1" }, changes),
        name,
      ).rejects.toThrow(message);
    }
  });

  it("binds both accounts a scaled position event names", async () => {
    const supply = { asset: USDT0.underlying, amount: "1" };
    const usdc = { asset: USDC.underlying, amount: "1" };

    // Reported on #157: SupplyLogic mints the aToken with the supplier as
    // caller, so a Mint naming anyone else is not this supply's evidence.
    await expect(
      parse(
        "supply",
        supply,
        replace(supplyChanges(), 4, positionMint(USDT0.aToken, OTHER, ACCOUNT, 999_999n, 0n)),
      ),
    ).rejects.toThrow(`names caller ${OTHER}`);
    // A supply only ever mints, so a Burn is a shape it cannot produce.
    await expect(
      parse(
        "supply",
        supply,
        replace(supplyChanges(), 4, positionBurn(USDT0.aToken, ACCOUNT, ACCOUNT, 999_999n, 0n)),
      ),
    ).rejects.toThrow("expected a position Mint, saw Burn");
    // BorrowLogic mints the debt with the account receiving the asset as
    // caller, which is the Borrow event's own user.
    await expect(
      parse(
        "borrow",
        usdc,
        replace(
          borrowChanges(),
          1,
          positionMint(USDC.variableDebtToken, OTHER, ACCOUNT, 1_000_001n, 0n),
        ),
      ),
    ).rejects.toThrow(`names caller ${OTHER}`);
    // aToken.burn's target is the account that receives the underlying, which
    // is the Withdraw event's own `to`.
    await expect(
      parse(
        "withdraw",
        usdc,
        replace(withdrawChanges(), 2, positionBurn(USDC.aToken, ACCOUNT, OTHER, 996_381n, 3_619n)),
      ),
    ).rejects.toThrow(`names target ${OTHER}`);
    // VariableDebtToken.burn passes a zero target: clearing debt delivers no
    // underlying to anybody.
    await expect(
      parse(
        "repay",
        { asset: USDC.underlying, amount: "0.001" },
        replace(
          repayChanges(),
          1,
          positionBurn(USDC.variableDebtToken, ACCOUNT, ACCOUNT, 999n, 1n),
        ),
      ),
    ).rejects.toThrow(`names target ${ACCOUNT}`);
  });

  it("refuses a collateral flag on a borrow or a repay", async () => {
    // Aave changes collateral use on a borrow never, and on a repay only in
    // the aToken branch this Capability refuses.
    const borrow = borrowChanges();
    await expect(
      parse("borrow", { asset: USDC.underlying, amount: "1" }, [
        ...borrow.slice(0, 4),
        poolCollateral(USDC, ACCOUNT, true),
        ...borrow.slice(4),
      ]),
    ).rejects.toThrow("saw collateral enabled, which a borrow does not do");

    const repay = repayChanges();
    await expect(
      parse("repay", { asset: USDC.underlying, amount: "0.001" }, [
        ...repay.slice(0, 4),
        poolCollateral(USDC, ACCOUNT, false),
        ...repay.slice(4),
      ]),
    ).rejects.toThrow("saw collateral disabled, which a repay does not do");
  });

  it("refuses evidence that is missing, duplicated, misattributed or reordered", async () => {
    const supplyParams = { asset: USDT0.underlying, amount: "1" };
    const cases: [string, Change[], string][] = [
      [
        "no Pool event",
        supplyChanges().filter((_, index) => index !== 6),
        "requires the Pool Supply event",
      ],
      [
        "two Pool events",
        [...supplyChanges(), poolSupply(USDT0, ACCOUNT, ACCOUNT, 1_000_000n)],
        "multiple Pool Supply events",
      ],
      [
        "a second position event",
        [
          ...supplyChanges().slice(0, 5),
          positionMint(USDT0.aToken, ACCOUNT, ACCOUNT, 1n, 0n),
          ...supplyChanges().slice(5),
        ],
        "exactly one position Mint or Burn; saw 2",
      ],
      [
        "the wrong position token",
        supplyChanges().map((change, index) =>
          index === 4
            ? positionMint(USDT0.variableDebtToken, ACCOUNT, ACCOUNT, 999_999n, 0n)
            : change,
        ),
        "not USDT0's aToken",
      ],
      [
        "a position credited to someone else",
        supplyChanges().map((change, index) =>
          index === 4 ? positionMint(USDT0.aToken, ACCOUNT, OTHER, 999_999n, 0n) : change,
        ),
        "position event names",
      ],
      [
        "an underlying amount the Pool did not report",
        supplyChanges().map((change, index) =>
          index === 1 ? erc20Transfer(USDT0.underlying, ACCOUNT, USDT0.aToken, 999_999n) : change,
        ),
        "requires one USDT0 transfer of 1000000",
      ],
      [
        "the underlying sent somewhere else",
        supplyChanges().map((change, index) =>
          index === 1 ? erc20Transfer(USDT0.underlying, ACCOUNT, OTHER, 1_000_000n) : change,
        ),
        "requires one USDT0 transfer",
      ],
      [
        // Emitting a Transfer with any from, to and value costs an attacker
        // nothing, so an identical decoy placed ahead of the real funding
        // transfer must fail rather than resolve to whichever came first.
        "a decoy identical to the funding transfer",
        [
          supplyChanges()[0] as Change,
          erc20Transfer(USDT0.underlying, ACCOUNT, USDT0.aToken, 1_000_000n),
          ...supplyChanges().slice(1),
        ],
        "saw 2 USDT0 transfers; exactly one belongs to this operation",
      ],
      [
        "a decoy for the same amount from somebody else",
        [
          supplyChanges()[0] as Change,
          erc20Transfer(USDT0.underlying, OTHER, USDT0.aToken, 1_000_000n),
          ...supplyChanges().slice(1),
        ],
        "saw 2 USDT0 transfers",
      ],
      [
        "a foreign token movement",
        [
          ...supplyChanges().slice(0, 6),
          erc20Transfer(USDC.underlying, ACCOUNT, OTHER, 1n),
          ...supplyChanges().slice(6),
        ],
        "which is neither USDT0 nor its aToken",
      ],
      [
        "a native MON movement",
        [{ kind: "nativeTransfer", from: ACCOUNT, to: OTHER, value: "1" }, ...supplyChanges()],
        "moved native MON",
      ],
      [
        "another Pool event in its place",
        supplyChanges().map((change, index) =>
          index === 6 ? poolWithdraw(USDT0, ACCOUNT, ACCOUNT, 1_000_000n) : change,
        ),
        "emitted Withdraw during a supply",
      ],
      [
        "the mint before the funding transfer",
        [
          supplyChanges()[0] as Change,
          supplyChanges()[3] as Change,
          supplyChanges()[4] as Change,
          supplyChanges()[1] as Change,
          supplyChanges()[6] as Change,
        ],
        "in the wrong order",
      ],
      [
        "the Pool event before its own evidence",
        [supplyChanges()[6] as Change, ...supplyChanges().slice(0, 6)],
        "after the Pool event",
      ],
    ];
    for (const [name, changes, message] of cases) {
      await expect(parse("supply", supplyParams, changes), name).rejects.toThrow(message);
    }
  });

  it("binds a position-token mint to the account it credits", async () => {
    // Reported on the sibling Morpho adapter in #156: a Receipt that takes the
    // first ABI-compatible Transfer for a role accepts a decoy placed in front
    // of the real one. The position token's own mint and burn Transfer is the
    // movement that shape applies to here, so candidates are counted per role
    // and bound to the scaled event they belong to, in both directions.
    const supply = { asset: USDT0.underlying, amount: "1" };
    const cases: [string, Change[], string][] = [
      [
        "a duplicated aToken mint",
        insert(supplyChanges(), 3, erc20Transfer(USDT0.aToken, ZERO, ACCOUNT, 999_999n)),
        "saw 2 USDT0 aToken transfers; exactly one belongs to this operation",
      ],
      [
        "a decoy aToken mint credited elsewhere, ahead of the real one",
        insert(supplyChanges(), 3, erc20Transfer(USDT0.aToken, ZERO, OTHER, 999_999n)),
        "saw 2 USDT0 aToken transfers",
      ],
      [
        "the only aToken mint credited elsewhere",
        replace(supplyChanges(), 3, erc20Transfer(USDT0.aToken, ZERO, OTHER, 999_999n)),
        `requires one USDT0 aToken transfer of 999999 from ${ZERO} to ${ACCOUNT}`,
      ],
      [
        "an aToken mint for a value the position event did not report",
        replace(supplyChanges(), 3, erc20Transfer(USDT0.aToken, ZERO, ACCOUNT, 999_998n)),
        "requires one USDT0 aToken transfer of 999999",
      ],
      ["no aToken movement at all", drop(supplyChanges(), 3), "saw 0 USDT0 aToken transfers"],
      [
        "the aToken mint after its own Mint event",
        swap(supplyChanges(), 3, 4),
        "saw its aToken transfer after the position event",
      ],
    ];
    for (const [name, changes, message] of cases) {
      await expect(parse("supply", supply, changes), name).rejects.toThrow(message);
    }

    const usdc = { asset: USDC.underlying, amount: "1" };
    const debtMint = erc20Transfer(USDC.variableDebtToken, ZERO, ACCOUNT, 1_000_001n);
    await expect(parse("borrow", usdc, insert(borrowChanges(), 0, debtMint))).rejects.toThrow(
      "saw 2 USDC variableDebtToken transfers",
    );
    await expect(
      parse(
        "borrow",
        usdc,
        replace(borrowChanges(), 0, erc20Transfer(USDC.variableDebtToken, ZERO, OTHER, 1_000_001n)),
      ),
    ).rejects.toThrow(`requires one USDC variableDebtToken transfer of 1000001 from ${ZERO}`);
  });

  it("binds a position-token burn to the account it debits", async () => {
    const usdc = { asset: USDC.underlying, amount: "1" };
    const cases: [string, Change[], string][] = [
      [
        "a duplicated aToken burn",
        insert(withdrawChanges(), 1, erc20Transfer(USDC.aToken, ACCOUNT, ZERO, 996_381n)),
        "saw 2 USDC aToken transfers",
      ],
      [
        "a decoy aToken burn debited elsewhere, ahead of the real one",
        insert(withdrawChanges(), 1, erc20Transfer(USDC.aToken, OTHER, ZERO, 996_381n)),
        "saw 2 USDC aToken transfers",
      ],
      [
        "the only aToken burn debited elsewhere",
        replace(withdrawChanges(), 1, erc20Transfer(USDC.aToken, OTHER, ZERO, 996_381n)),
        `requires one USDC aToken transfer of 996381 from ${ACCOUNT} to ${ZERO}`,
      ],
      [
        "a duplicated payout of the underlying",
        insert(
          withdrawChanges(),
          3,
          erc20Transfer(USDC.underlying, USDC.aToken, ACCOUNT, 1_000_000n),
        ),
        "saw 2 USDC transfers",
      ],
      [
        "a decoy payout of the underlying to somebody else",
        insert(
          withdrawChanges(),
          3,
          erc20Transfer(USDC.underlying, USDC.aToken, OTHER, 1_000_000n),
        ),
        "saw 2 USDC transfers",
      ],
      [
        "a foreign token leaving alongside the payout",
        insert(withdrawChanges(), 3, erc20Transfer(USDT0.underlying, USDC.aToken, OTHER, 1n)),
        "which is neither USDC nor its aToken",
      ],
    ];
    for (const [name, changes, message] of cases) {
      await expect(parse("withdraw", usdc, changes), name).rejects.toThrow(message);
    }

    const repay = { asset: USDC.underlying, amount: "0.001" };
    const debtBurn = erc20Transfer(USDC.variableDebtToken, ACCOUNT, ZERO, 999n);
    await expect(parse("repay", repay, insert(repayChanges(), 0, debtBurn))).rejects.toThrow(
      "saw 2 USDC variableDebtToken transfers",
    );
    await expect(
      parse(
        "repay",
        repay,
        replace(repayChanges(), 0, erc20Transfer(USDC.variableDebtToken, OTHER, ZERO, 999n)),
      ),
    ).rejects.toThrow(`requires one USDC variableDebtToken transfer of 999 from ${ACCOUNT}`);
  });

  it("refuses an allowance and a rates update that belong to something else", async () => {
    const supply = { asset: USDT0.underlying, amount: "1" };
    const spent = erc20Approval(USDT0.underlying, ACCOUNT, AAVE_POOL_ADDRESS, 0n);
    const cases: [string, "supply" | "withdraw", Record<string, unknown>, Change[], string][] = [
      [
        // The only allowance a supply can leave behind is the one the Pool
        // itself just spent, so a second spender riding along in the same
        // transaction is an allowance the Receipt cannot account for.
        "an allowance granted to somebody else",
        "supply",
        supply,
        replace(
          supplyChanges(),
          2,
          erc20Approval(USDT0.underlying, ACCOUNT, OTHER, 2n ** 256n - 1n),
        ),
        `saw ${ACCOUNT} approve ${OTHER}`,
      ],
      [
        "an allowance granted by somebody else",
        "supply",
        supply,
        replace(supplyChanges(), 2, erc20Approval(USDT0.underlying, OTHER, AAVE_POOL_ADDRESS, 0n)),
        `saw ${OTHER} approve ${AAVE_POOL_ADDRESS}`,
      ],
      [
        "an allowance on the position token",
        "supply",
        supply,
        replace(supplyChanges(), 2, erc20Approval(USDT0.aToken, ACCOUNT, AAVE_POOL_ADDRESS, 0n)),
        `on ${USDT0.aToken}`,
      ],
      ["two allowances", "supply", supply, insert(supplyChanges(), 2, spent), "saw 2 allowance"],
      [
        // A withdraw hands the underlying out with a plain transfer, so it
        // spends no allowance and grants none.
        "an allowance inside a withdraw",
        "withdraw",
        { asset: USDC.underlying, amount: "1" },
        insert(
          withdrawChanges(),
          3,
          erc20Approval(USDC.underlying, ACCOUNT, AAVE_POOL_ADDRESS, 0n),
        ),
        "which a withdraw does not do",
      ],
      [
        "a rates update for another reserve",
        "supply",
        supply,
        replace(supplyChanges(), 0, poolRatesUpdated(USDC)),
        "rates update for reserve",
      ],
      [
        "two rates updates",
        "supply",
        supply,
        insert(supplyChanges(), 0, poolRatesUpdated(USDT0)),
        "saw 2 reserve rate updates",
      ],
    ];
    for (const [name, method, params, changes, message] of cases) {
      await expect(parse(method, params, changes), name).rejects.toThrow(message);
    }
  });

  it("refuses a rate mode and a repayment shape this Capability never produces", async () => {
    await expect(
      parse("borrow", { asset: USDC.underlying, amount: "1" }, borrowChanges(1)),
    ).rejects.toThrow("interest rate mode 1; only variable exists");
    await expect(
      parse("repay", { asset: USDC.underlying, amount: "0.001" }, repayChanges(true)),
    ).rejects.toThrow("aToken repayment");
  });

  it("refuses a Pool event naming a reserve the package does not list", async () => {
    const unlisted: AaveReserve = { ...USDC, underlying: UNLISTED };
    const changes: Change[] = [
      erc20Transfer(USDC.underlying, USDC.aToken, ACCOUNT, 1_000n),
      positionBurn(USDC.aToken, ACCOUNT, ACCOUNT, 1_000n, 0n),
      poolWithdraw(unlisted, ACCOUNT, ACCOUNT, 1_000n),
    ];
    await expect(
      parse("withdraw", { asset: USDC.underlying, amount: "0.001" }, changes),
    ).rejects.toThrow("which this package does not list");
  });

  it("names the live role it cannot fill instead of asserting on one balance", async () => {
    // The live suite pinned an account per role until one of them had its aUSDC
    // drained to zero on chain, which failed on a bare balance assertion with no
    // commit behind it. Roles are searched against chain state now, so a market
    // where nothing qualifies has to report the role, the reserves it tried and
    // what each of them lacked.
    await expect(
      resolveRoleOn(
        stubRuntime(() => 0n),
        "withdraw",
        [USDC, USDT0],
        holdsPosition,
      ),
    ).rejects.toThrow(
      `no live account can play the Aave withdraw role: tried 3 candidates against 2 of the market's ${AAVE_RESERVES.length} reserves: USDC: the reserve has 0 USDC left to pay out, not 1000; USDT0: the reserve has 0 USDT0 left to pay out, not 1000`,
    );

    // And a search settles on whichever candidate does hold the position, with
    // the amount in that reserve's own decimals rather than a fixed six.
    const holder = LIVE_CANDIDATES[1] as Address;
    const gho = reserveFor("GHO");
    const funded = stubRuntime((owner) =>
      owner === holder || owner === gho.aToken ? 10n ** 18n : 0n,
    );
    await expect(resolveRoleOn(funded, "withdraw", [gho], holdsPosition)).resolves.toMatchObject({
      account: holder,
      units: "1000",
      amount: "0.000000000000001",
    });
  });

  it("selects an account the fixed base-currency gate rejected but the amount clears", async () => {
    // The live borrow role gated on a flat two dollars of borrowing power. The
    // market candidate reports about 1.16 dollars (115850000 base units), far
    // more than ROLE_UNITS of USDC is worth (a tenth of a cent) yet under that
    // flat gate, so the role found nobody and both live borrow tests failed with
    // no adapter bug behind it. The check values the requested amount now, so an
    // account with 1.16 dollars of power qualifies for a purchase worth cents.
    const holder = LIVE_CANDIDATES[0] as Address;
    const funded = stubRuntime(
      (owner) => (owner === USDC.aToken ? 10n ** 6n : 0n),
      (owner) => (owner === holder ? 115_850_000n : 0n),
    );
    await expect(resolveRoleOn(funded, "borrow", [USDC], canBorrow)).resolves.toMatchObject({
      reserve: { symbol: "USDC" },
      account: holder,
      units: "1000",
      amount: "0.001",
    });

    // And an account below what the amount itself is worth is still refused, with
    // a reason that names the need the reserve and the amount set rather than a
    // fixed dollar figure. USDC of ROLE_UNITS needs 200000 base units here.
    const thin = stubRuntime(
      (owner) => (owner === USDC.aToken ? 10n ** 6n : 0n),
      () => 100_000n,
    );
    await expect(resolveRoleOn(thin, "borrow", [USDC], canBorrow)).rejects.toThrow(
      "not the 200000 that ROLE_UNITS USDC needs",
    );
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Aave mainnet", () => {
  it("verifies the official Monad deployment on chain", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    for (const address of [AAVE_POOL_ADDRESS, AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS]) {
      expect((await runtime.client.getCode({ address }))?.length, address).toBeGreaterThan(2);
    }
    // The provider and the Pool have to agree in both directions, and the
    // proxy still has to point at the implementation the address book records.
    const [pool, provider, implementation] = await Promise.all([
      runtime.client.readContract({
        address: AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS,
        abi: [
          {
            type: "function",
            name: "getPool",
            inputs: [],
            outputs: [{ type: "address" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "getPool",
      }),
      runtime.client.readContract({
        address: AAVE_POOL_ADDRESS,
        abi: AavePoolAbi,
        functionName: "ADDRESSES_PROVIDER",
      }),
      runtime.client.getStorageAt({
        address: AAVE_POOL_ADDRESS,
        // ERC-1967 implementation slot.
        slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
      }),
    ]);
    expect(getAddress(pool)).toBe(AAVE_POOL_ADDRESS);
    expect(getAddress(provider)).toBe(AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS);
    expect(getAddress(`0x${(implementation ?? "").slice(-40)}`)).toBe(
      AAVE_POOL_IMPLEMENTATION_ADDRESS,
    );
  });

  it("matches the Pool's own reserve list and token metadata", { timeout: 120_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Aave);
    const listed = await runtime.client.readContract({
      address: AAVE_POOL_ADDRESS,
      abi: AavePoolAbi,
      functionName: "getReservesList",
    });
    // Checksum with one argument: map would otherwise hand getAddress the
    // array index as an EIP-1191 chain id.
    expect([...listed].map((address) => getAddress(address)).sort()).toEqual(
      AAVE_RESERVES.map(({ underlying }) => underlying).sort(),
    );
    for (const reserve of AAVE_RESERVES) {
      const data = await registry.action("aave", "reserve", ACCOUNT, { asset: reserve.underlying });
      if (data.kind !== "query") throw new Error("expected a Query");
      // The Query itself fails when the Pool disagrees about either position
      // token, so reaching here proves both. Metadata is checked separately.
      expect(data.data, reserve.symbol).toMatchObject({
        asset: reserve.underlying,
        aToken: reserve.aToken,
        variableDebtToken: reserve.variableDebtToken,
      });
      const metadata = await registry.action("erc20", "metadata", ACCOUNT, {
        token: reserve.underlying,
      });
      if (metadata.kind !== "query") throw new Error("expected a Query");
      expect(metadata.data, reserve.symbol).toMatchObject({ decimals: reserve.decimals });
      // Aave v3.2 removed stable-rate borrowing and this deployment agrees, so
      // pinning the variable mode instead of exposing interestRateMode rests on
      // a deployment fact this suite checks rather than on a preference.
      const onChain = await runtime.client.readContract({
        address: AAVE_POOL_ADDRESS,
        abi: AavePoolAbi,
        functionName: "getReserveData",
        args: [reserve.underlying],
      });
      expect(getAddress(onChain.stableDebtTokenAddress), reserve.symbol).toBe(ZERO);
    }
  });

  it("finds the vendored calling surface in the deployed bytecode", {
    timeout: 60_000,
  }, async () => {
    const runtime = await createRuntime();
    const [supplyLogic, borrowLogic] = await Promise.all([
      runtime.client.readContract({
        address: AAVE_POOL_ADDRESS,
        abi: AavePoolAbi,
        functionName: "getSupplyLogic",
      }),
      runtime.client.readContract({
        address: AAVE_POOL_ADDRESS,
        abi: AavePoolAbi,
        functionName: "getBorrowLogic",
      }),
    ]);
    const code = async (address: Address) =>
      ((await runtime.client.getCode({ address })) ?? "").toLowerCase();
    const [implementation, supplyCode, borrowCode] = await Promise.all([
      code(AAVE_POOL_IMPLEMENTATION_ADDRESS),
      code(supplyLogic),
      code(borrowLogic),
    ]);

    for (const name of POOL_FUNCTIONS_USED) {
      const item = AavePoolAbi.find((entry) => entry.type === "function" && entry.name === name);
      if (!item) throw new Error(`the vendored ABI lost ${name}`);
      const selector = toFunctionSelector(toFunctionSignature(item)).slice(2);
      expect(implementation.includes(selector), name).toBe(true);
    }

    // Aave emits the Pool's own events from the logic libraries it
    // delegatecalls. solc pushes a topic with its leading zero bytes trimmed,
    // so compare against that minimal form. Every event a Receipt decodes needs
    // an emitting library here, which is what the satisfies clause enforces.
    const emitters = {
      Supply: supplyCode,
      Withdraw: supplyCode,
      ReserveUsedAsCollateralEnabled: supplyCode,
      ReserveUsedAsCollateralDisabled: supplyCode,
      ReserveDataUpdated: supplyCode,
      Borrow: borrowCode,
      Repay: borrowCode,
    } satisfies Record<PoolEventUsed, string>;
    for (const [name, library] of Object.entries(emitters)) {
      const item = AavePoolAbi.find((entry) => entry.type === "event" && entry.name === name);
      if (!item) throw new Error(`the vendored ABI lost ${name}`);
      const topic = toEventSelector(toEventSignature(item))
        .slice(2)
        .replace(/^(00)+/, "");
      expect(library.includes(topic), name).toBe(true);
    }
  });

  it("reads account health and reserve rates", { timeout: 60_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Aave);
    const live = liveState(runtime, registry);
    const { account } = await resolveRole(live, "account health", [USDC], holdsCollateral(live));
    const data = await registry.action("aave", "accountData", account, { user: account });
    if (data.kind !== "query") throw new Error("expected a Query");
    expect(data.data).toMatchObject({
      user: account,
      totalCollateralBase: expect.stringMatching(/^[1-9]\d*$/),
      ltv: expect.any(Number),
    });
    // Rates are a property of the reserve rather than of any account, so this
    // half stays on USDC and depends on nobody's balance.
    const reserve = await registry.action("aave", "reserve", account, { asset: USDC.underlying });
    if (reserve.kind !== "query") throw new Error("expected a Query");
    const rates = reserve.data as { supplyApr: string; supplyApy: string };
    expect(Number(rates.supplyApr)).toBeGreaterThan(0);
    // Per-second compounding puts the APY above the APR it is derived from.
    expect(Number(rates.supplyApy)).toBeGreaterThan(Number(rates.supplyApr));
  });

  it("simulates a supply into an exhaustive typed Receipt", { timeout: 180_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Aave);
    const live = liveState(runtime, registry);
    const role = await resolveRole(
      live,
      "supply",
      reservesPreferring("USDT0"),
      holdsUnderlying(live),
    );
    const outcome = await simulate(runtime, registry, "supply", role.account, {
      asset: role.reserve.underlying,
      amount: role.amount,
    });
    expect(outcome).toMatchObject({
      operation: "supply",
      protocol: "aave",
      asset: role.reserve.underlying,
      symbol: role.reserve.symbol,
      amount: role.units,
      user: role.account,
      onBehalfOf: role.account,
      position: { event: "Mint", token: role.reserve.aToken },
    });
  });

  it("simulates a withdraw into an exhaustive typed Receipt", { timeout: 180_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Aave);
    const live = liveState(runtime, registry);
    const role = await resolveRole(
      live,
      "withdraw",
      reservesPreferring("USDC"),
      holdsPosition(live),
    );
    const outcome = await simulate(runtime, registry, "withdraw", role.account, {
      asset: role.reserve.underlying,
      amount: role.amount,
    });
    expect(outcome).toMatchObject({
      operation: "withdraw",
      asset: role.reserve.underlying,
      amount: role.units,
      user: role.account,
      to: role.account,
      position: { token: role.reserve.aToken },
    });
  });

  it("simulates a borrow as a declared inflow with no outflow", { timeout: 180_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Aave);
    const live = liveState(runtime, registry);
    const role = await resolveRole(live, "borrow", borrowReserves("USDC"), canBorrow(live));
    const outcome = await simulate(runtime, registry, "borrow", role.account, {
      asset: role.reserve.underlying,
      amount: role.amount,
    });
    expect(outcome).toMatchObject({
      operation: "borrow",
      asset: role.reserve.underlying,
      amount: role.units,
      user: role.account,
      interestRateMode: "variable",
      position: { event: "Mint", token: role.reserve.variableDebtToken },
    });
  });

  /**
   * A repay needs one account that owes a reserve and still holds it. That is the
   * pair nobody keeps: the account this test used to name held 0.001607 USDC
   * against 0.048 owed, so one dust transfer would have taken the test with it.
   * The borrow that funds the repay is part of the tree instead, chained through
   * the simulator's state, so the repay clears a debt this run drew and spends
   * the asset the same run received. It needs no position of its own.
   */
  it("simulates a repay of the debt the same run drew", { timeout: 240_000 }, async () => {
    const runtime = await createRuntime();
    const registry = new Registry(runtime).use(Aave);
    const live = liveState(runtime, registry);
    const role = await resolveRole(live, "repay", borrowReserves("USDC"), canBorrow(live));
    const params = { asset: role.reserve.underlying, amount: role.amount };
    const [borrow, repay] = await Promise.all([
      registry.action("aave", "borrow", role.account, params),
      registry.action("aave", "repay", role.account, params),
    ]);
    if (borrow.kind !== "capability" || repay.kind !== "capability") {
      throw new Error("expected Capabilities");
    }
    const outcome = await simulateTree(runtime, registry, {
      ...repay,
      children: [borrow, ...repay.children],
    });
    expect(outcome.results.map((result) => `${result.protocol}.${result.method}`)).toEqual([
      "aave.borrow",
      "erc20.approve",
      "aave.repay",
    ]);
    expect(outcome.results.at(-1)?.receipt?.outcome).toMatchObject({
      operation: "repay",
      asset: role.reserve.underlying,
      amount: role.units,
      user: role.account,
      repayer: role.account,
      interestRateMode: "variable",
      position: { token: role.reserve.variableDebtToken },
    });
  });
});

/** The live reads a role search makes, each answered once and remembered. */
interface LiveState {
  /** An ERC-20 balance, read through the Query an Agent would call for it. */
  balance(token: Address, owner: Address): Promise<bigint>;
  /** An account's collateral, debt and borrowing power in the market. */
  account(user: Address): Promise<AaveAccountData>;
  /** A reserve's treasury, read off its own aToken rather than pinned here. */
  treasury(reserve: AaveReserve): Promise<Address>;
}

function liveState(runtime: MossRuntime, registry: Registry): LiveState {
  const answers = new Map<string, Promise<unknown>>();
  const once = <T>(key: string, read: () => Promise<T>): Promise<T> => {
    const known = answers.get(key) as Promise<T> | undefined;
    if (known) return known;
    const pending = read();
    answers.set(key, pending);
    return pending;
  };
  return {
    balance(token, owner) {
      return once(`balance:${token}:${owner}`, async () => {
        const result = await registry.action("erc20", "balanceOf", owner, { token, owner });
        if (result.kind !== "query") throw new Error("expected a balanceOf Query");
        return BigInt((result.data as { balance: string }).balance);
      });
    },
    account(user) {
      return once(`account:${user}`, async () => {
        const result = await registry.action("aave", "accountData", user, { user });
        if (result.kind !== "query") throw new Error("expected an accountData Query");
        return result.data as AaveAccountData;
      });
    },
    treasury(reserve) {
      return once(`treasury:${reserve.aToken}`, async () =>
        getAddress(
          await runtime.client.readContract({
            address: reserve.aToken,
            abi: AaveScaledTokenAbi,
            functionName: "RESERVE_TREASURY_ADDRESS",
          }),
        ),
      );
    },
  };
}

/** A reserve and an account that can play one live role, with its amount. */
interface LiveRole {
  reserve: AaveReserve;
  account: Address;
  /** `ROLE_UNITS` as the decimal string a Capability parameter takes. */
  amount: string;
  /** The same amount in base units, the way a Receipt reports it. */
  units: string;
}

/**
 * The first reserve and account that can play a role, searched against chain
 * state when the test runs instead of pinned in this file. Every reserve is
 * tried against the reserve's own treasury and then the seed candidates. `need`
 * answers with the reason a pair cannot play the role or with nothing when it
 * can, so a role no pair can play fails naming the role, the reserves it tried
 * and what each of them lacked rather than asserting on one balance.
 *
 * The treasury leads because protocol fees accrue to it, which makes it the one
 * holder no stranger can move. `aToken.RESERVE_TREASURY_ADDRESS()` is a read
 * rather than a constant, so nothing has to be committed on the day it fills up.
 * It is empty for now: on 2026-08-04 every reserve reported a zero treasury
 * balance while `getReserveData` reported 20784 USDC and 19107 USDT0 of
 * `accruedToTreasury`. A reserve's fee claim only becomes an aToken balance once
 * somebody calls the permissionless `mintToTreasury`, which Moss never does.
 */
async function resolveRole(
  live: LiveState,
  role: string,
  over: readonly AaveReserve[],
  need: (reserve: AaveReserve, account: Address) => Promise<string | undefined>,
): Promise<LiveRole> {
  const reasons: string[] = [];
  for (const reserve of over) {
    for (const account of [await live.treasury(reserve), ...LIVE_CANDIDATES]) {
      const missing = await need(reserve, account);
      if (!missing) {
        return {
          reserve,
          account,
          amount: formatUnits(ROLE_UNITS, reserve.decimals),
          units: ROLE_UNITS.toString(),
        };
      }
      const reason = `${reserve.symbol}: ${missing}`;
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }
  const shown = reasons.slice(0, 6).join("; ");
  const rest = reasons.length > 6 ? ` (+${reasons.length - 6} more)` : "";
  throw new Error(
    `no live account can play the Aave ${role} role: tried ${LIVE_CANDIDATES.length + 1} candidates against ${over.length} of the market's ${AAVE_RESERVES.length} reserves: ${shown}${rest}`,
  );
}

/** Every listed reserve, with the one a role would rather have tried first. */
function reservesPreferring(symbol: string): AaveReserve[] {
  return [...AAVE_RESERVES].sort(
    (left, right) => Number(right.symbol === symbol) - Number(left.symbol === symbol),
  );
}

/** The stablecoin reserves the borrow role searches, the named one tried first. */
function borrowReserves(prefer: string): AaveReserve[] {
  const stablecoins = new Set<string>(BORROW_STABLECOINS);
  return AAVE_RESERVES.filter((reserve) => stablecoins.has(reserve.symbol)).sort(
    (left, right) => Number(right.symbol === prefer) - Number(left.symbol === prefer),
  );
}

/**
 * What ROLE_UNITS of a reserve is worth in the market's eight-decimal base
 * currency, pricing the token at a dollar. That holds because `borrowReserves`
 * only offers dollar stablecoins. ROLE_UNITS of a six-decimal reserve is 0.001
 * of a token, so 100000 base units, a tenth of a cent. The value scales with the
 * reserve's decimals and with ROLE_UNITS, so the borrow check tracks the reserve
 * and the amount rather than a fixed constant.
 */
function borrowValueBase(reserve: AaveReserve): bigint {
  return (ROLE_UNITS * 100_000_000n) / 10n ** BigInt(reserve.decimals);
}

/** A runtime whose reads come from one balance function, to search a role offline. */
function stubRuntime(
  balance: (owner: Address) => bigint,
  borrowsBase: (owner: Address) => bigint = () => 0n,
): MossRuntime {
  const client = {
    readContract: async ({
      functionName,
      args,
    }: {
      functionName: string;
      args?: readonly unknown[];
    }) => {
      if (functionName === "RESERVE_TREASURY_ADDRESS") return STUB_TREASURY;
      if (functionName === "balanceOf") return balance(getAddress(String(args?.[0])));
      if (functionName === "decimals") return 18;
      if (functionName === "symbol") return "STUB";
      // getUserAccountData returns [collateral, debt, availableBorrows,
      // liquidationThreshold, ltv, healthFactor]; only borrowing power is
      // exercised here, so the rest reads back as zero.
      if (functionName === "getUserAccountData") {
        return [0n, 0n, borrowsBase(getAddress(String(args?.[0]))), 0n, 0n, 0n];
      }
      throw new Error(`unexpected read ${functionName}`);
    },
  } as unknown as MossRuntime["client"];
  return { rpcUrl: "http://offline", client };
}

/** One role search against one runtime, live or stubbed. */
function resolveRoleOn(
  runtime: MossRuntime,
  role: string,
  over: readonly AaveReserve[],
  need: (
    live: LiveState,
  ) => (reserve: AaveReserve, account: Address) => Promise<string | undefined>,
): Promise<LiveRole> {
  const live = liveState(runtime, new Registry(runtime).use(Aave));
  return resolveRole(live, role, over, need(live));
}

/** Holds enough of the underlying to supply it. */
const holdsUnderlying = (live: LiveState) => async (reserve: AaveReserve, account: Address) => {
  const held = await live.balance(reserve.underlying, account);
  return held >= ROLE_UNITS
    ? undefined
    : `${account} holds ${held} ${reserve.symbol}, not ${ROLE_UNITS}`;
};

/** Holds a position the reserve still has the liquidity to redeem. */
const holdsPosition = (live: LiveState) => async (reserve: AaveReserve, account: Address) => {
  const [position, liquidity] = await Promise.all([
    live.balance(reserve.aToken, account),
    live.balance(reserve.underlying, reserve.aToken),
  ]);
  if (liquidity < ROLE_UNITS) {
    return `the reserve has ${liquidity} ${reserve.symbol} left to pay out, not ${ROLE_UNITS}`;
  }
  return position >= ROLE_UNITS
    ? undefined
    : `${account} holds ${position} a${reserve.symbol}, not ${ROLE_UNITS}`;
};

/** Can draw ROLE_UNITS of the reserve, which needs liquidity to lend and borrowing power that covers what the amount is worth. */
const canBorrow = (live: LiveState) => async (reserve: AaveReserve, account: Address) => {
  const liquidity = await live.balance(reserve.underlying, reserve.aToken);
  if (liquidity < ROLE_UNITS) {
    return `the reserve has ${liquidity} ${reserve.symbol} left to lend, not ${ROLE_UNITS}`;
  }
  const need = borrowValueBase(reserve) * ROLE_BORROW_MARGIN;
  const { availableBorrowsBase } = await live.account(account);
  return BigInt(availableBorrowsBase) >= need
    ? undefined
    : `${account} can draw ${availableBorrowsBase} more in base currency, not the ${need} that ROLE_UNITS ${reserve.symbol} needs`;
};

/** Holds collateral, which is what an account-health read has to find. */
const holdsCollateral = (live: LiveState) => async (_reserve: AaveReserve, account: Address) => {
  const { totalCollateralBase } = await live.account(account);
  return BigInt(totalCollateralBase) > 0n
    ? undefined
    : `${account} holds no collateral in the market`;
};

/** Builds the tree, simulates it and returns the Outcome it ends on. */
async function simulate(
  runtime: MossRuntime,
  registry: Registry,
  method: string,
  account: Address,
  params: Record<string, unknown>,
) {
  const capability = await registry.action("aave", method, account, params);
  if (capability.kind !== "capability") throw new Error("expected a Capability");
  const outcome = await simulateTree(runtime, registry, capability);
  return outcome.results.at(-1)?.receipt?.outcome;
}

/** Simulates a prepared tree and asserts the whole flow came back clean. */
async function simulateTree(
  runtime: MossRuntime,
  registry: Registry,
  root: CapabilityNode,
): Promise<SimulateOutcome> {
  const outcome = await createTraceSimulator(runtime, {
    receipt: (node, changes) => registry.parseReceipt(node, changes),
  }).simulate(root);
  expect(outcome.halted).toBeUndefined();
  for (const result of outcome.results) expect(result.warnings).toEqual([]);
  return outcome;
}
