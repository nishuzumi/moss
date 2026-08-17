import { type Change, verifyReceiptCoverage } from "@themoss/core";
import { ERC20Abi, type ERC20Outcome } from "@themoss/erc";
import {
  type Address,
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
} from "viem";
import { describe, expect, it } from "vitest";
import {
  PendleMarketAbi,
  PendleRouterAbi,
  PendleStandardizedYieldAbi,
  PendleYieldTokenAbi,
} from "../src/abis/pendle.js";
import { PENDLE_ROUTER_ADDRESS } from "../src/addresses.js";
import { PendleSwapReceiptError, parsePendleSwapReceipt } from "../src/swap-receipt.js";

const MARKET = getAddress("0x1111111111111111111111111111111111111111");
const SY = getAddress("0x2222222222222222222222222222222222222222");
const PT = getAddress("0x3333333333333333333333333333333333333333");
const YT = getAddress("0x4444444444444444444444444444444444444444");
const UNDERLYING = getAddress("0x5555555555555555555555555555555555555555");
const CALLER = getAddress("0x7777777777777777777777777777777777777777");
const RECEIVER = getAddress("0x8888888888888888888888888888888888888888");
const ROUTER = getAddress(PENDLE_ROUTER_ADDRESS);
const FOREIGN = getAddress("0x9999999999999999999999999999999999999999");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");

function event(
  emitter: Address,
  abi: readonly unknown[],
  eventName: string,
  indexedArgs: Record<string, unknown>,
  dataTypes: readonly { name: string; type: string }[] = [],
  dataValues: readonly unknown[] = [],
): Change {
  const topics = encodeEventTopics({
    abi,
    eventName,
    args: indexedArgs,
  } as never);
  return Object.freeze({
    kind: "event",
    address: emitter,
    topics: Object.freeze(topics as `0x${string}`[]),
    data: encodeAbiParameters(dataTypes as never, dataValues as never),
  });
}

function swapPtAndToken(
  netPtToAccount: bigint,
  netTokenToAccount: bigint,
  netSyInterm = netPtToAccount > 0n ? 999_000n : 991_000n,
  emitter: Address = ROUTER,
): Change {
  const topics = encodeEventTopics({
    abi: PendleRouterAbi,
    eventName: "SwapPtAndToken",
    args: { caller: CALLER, market: MARKET, token: UNDERLYING },
  });
  const data = encodeAbiParameters(
    [
      { name: "receiver", type: "address" },
      { name: "netPtToAccount", type: "int256" },
      { name: "netTokenToAccount", type: "int256" },
      { name: "netSyInterm", type: "uint256" },
    ],
    [RECEIVER, netPtToAccount, netTokenToAccount, netSyInterm],
  );
  return Object.freeze({
    kind: "event",
    address: emitter,
    topics: Object.freeze(topics as `0x${string}`[]),
    data,
  });
}

const marketSwap = (
  pt: bigint,
  sy: bigint,
  emitter: Address = MARKET,
  receiver: Address = RECEIVER,
) =>
  event(
    emitter,
    PendleMarketAbi,
    "Swap",
    { caller: ROUTER, receiver },
    [
      { name: "netPtOut", type: "int256" },
      { name: "netSyOut", type: "int256" },
      { name: "netSyFee", type: "uint256" },
      { name: "netSyToReserve", type: "uint256" },
    ],
    [pt, sy, 1n, 0n],
  );
const marketRate = () =>
  event(
    MARKET,
    PendleMarketAbi,
    "UpdateImpliedRate",
    { timestamp: 1n },
    [{ name: "lnLastImpliedRate", type: "uint256" }],
    [1n],
  );
const syDeposit = (
  token: Address = UNDERLYING,
  amount = 1_000_000n,
  emitter: Address = SY,
  amountSy = 999_000n,
) =>
  event(
    emitter,
    PendleStandardizedYieldAbi,
    "Deposit",
    { caller: ROUTER, receiver: MARKET, tokenIn: token },
    [
      { name: "amountDeposited", type: "uint256" },
      { name: "amountSyOut", type: "uint256" },
    ],
    [amount, amountSy],
  );
const syRedeem = (
  token: Address = UNDERLYING,
  amount = 990_561n,
  emitter: Address = SY,
  amountSy = 991_000n,
) =>
  event(
    emitter,
    PendleStandardizedYieldAbi,
    "Redeem",
    { caller: ROUTER, receiver: RECEIVER, tokenOut: token },
    [
      { name: "amountSyToRedeem", type: "uint256" },
      { name: "amountTokenOut", type: "uint256" },
    ],
    [amountSy, amount],
  );
const ytIndex = (emitter: Address = YT) =>
  event(emitter, PendleYieldTokenAbi, "NewInterestIndex", { newIndex: 1n });
const transfer = (emitter: Address, from: Address, to: Address, value: bigint) =>
  event(emitter, ERC20Abi, "Transfer", { from, to }, [{ name: "value", type: "uint256" }], [value]);
const approval = (emitter: Address, owner: Address, spender: Address, value: bigint) =>
  event(
    emitter,
    ERC20Abi,
    "Approval",
    { owner, spender },
    [{ name: "value", type: "uint256" }],
    [value],
  );

function buySequence(): Change[] {
  return [
    transfer(UNDERLYING, CALLER, ROUTER, 1_000_000n),
    transfer(UNDERLYING, ROUTER, SY, 1_000_000n),
    transfer(SY, ZERO, MARKET, 999_000n),
    syDeposit(),
    ytIndex(),
    ytIndex(),
    transfer(PT, MARKET, RECEIVER, 1_009_082n),
    transfer(SY, MARKET, ROUTER, 999_000n),
    marketRate(),
    marketSwap(1_009_082n, -999_000n),
    swapPtAndToken(1_009_082n, -1_000_000n),
  ];
}

function sellSequence(): Change[] {
  return [
    approval(PT, ROUTER, MARKET, 0n),
    transfer(PT, CALLER, MARKET, 1_000_000n),
    ytIndex(),
    transfer(SY, MARKET, SY, 991_000n),
    marketRate(),
    marketSwap(-1_000_000n, 991_000n, MARKET, SY),
    transfer(SY, SY, ZERO, 991_000n),
    transfer(UNDERLYING, SY, RECEIVER, 990_561n),
    syRedeem(),
    swapPtAndToken(-1_000_000n, 990_561n),
  ];
}

function parseERC20(changes: readonly Change[]) {
  const outcomes: ERC20Outcome[] = changes.map((change) => {
    if (change.kind !== "event") throw new Error("expected ERC-20 event");
    const decoded = decodeEventLog({
      abi: ERC20Abi,
      topics: change.topics as [`0x${string}`, ...`0x${string}`[]],
      data: change.data,
      strict: true,
    });
    if (decoded.eventName === "Transfer") {
      return {
        operation: "transfer",
        token: change.address,
        from: decoded.args.from,
        to: decoded.args.to,
        amount: decoded.args.value.toString(),
      };
    }
    if (decoded.eventName === "Approval") {
      return {
        operation: "approve",
        token: change.address,
        owner: decoded.args.owner,
        spender: decoded.args.spender,
        amount: decoded.args.value.toString(),
      };
    }
    throw new Error("unsupported ERC-20 event");
  });
  return {
    kind: "receipt" as const,
    outcome: outcomes,
    text: "ERC-20 evidence",
    changes: changes.map((change, index) => ({
      kind: "change" as const,
      change,
      data: outcomes[index] ?? {},
      text: "ERC-20 evidence",
    })),
  };
}

describe("Pendle swap Receipt parser", () => {
  it("parses a full buy-PT trace into a typed outcome covering every Change in order", () => {
    const changes = buySequence();
    const receipt = parsePendleSwapReceipt(changes, parseERC20);

    expect(receipt.outcome).toEqual({
      operation: "swap",
      protocol: "pendle",
      direction: "buy-pt",
      market: MARKET,
      token: UNDERLYING,
      caller: CALLER,
      receiver: RECEIVER,
      amountIn: "1000000",
      amountOut: "1009082",
    });
    expect(receipt.changes).toHaveLength(changes.length);
    expect(receipt.changes[0]).toMatchObject({
      kind: "receipt",
      outcome: [{ operation: "transfer" }],
    });
    expect(receipt.changes.at(-1)).toMatchObject({ kind: "change", change: changes.at(-1) });
    expect(() => verifyReceiptCoverage(changes, receipt)).not.toThrow();
  });

  it("parses a full sell-PT trace into a typed outcome", () => {
    const changes = sellSequence();
    const receipt = parsePendleSwapReceipt(changes, parseERC20);

    expect(receipt.outcome).toMatchObject({
      direction: "sell-pt",
      amountIn: "1000000",
      amountOut: "990561",
      token: UNDERLYING,
    });
    expect(() => verifyReceiptCoverage(changes, receipt)).not.toThrow();
  });

  it("rejects a trace without the Router SwapPtAndToken event", () => {
    const changes = buySequence().slice(0, -1);
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(PendleSwapReceiptError);
  });

  it("rejects a trace with more than one SwapPtAndToken event", () => {
    const changes = [...buySequence(), swapPtAndToken(1n, -1n)];
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(/one SwapPtAndToken/);
  });

  it("rejects an unrecognized event", () => {
    const foreign = Object.freeze({
      kind: "event" as const,
      address: MARKET,
      topics: Object.freeze([`0x${"ab".repeat(32)}` as const]),
      data: "0x" as const,
    });
    expect(() => parsePendleSwapReceipt([foreign, swapPtAndToken(1n, -1n)], parseERC20)).toThrow(
      PendleSwapReceiptError,
    );
  });

  it("rejects a SwapPtAndToken not emitted by the Pendle Router", () => {
    const forged = swapPtAndToken(1_009_082n, -1_000_000n, 999_000n, FOREIGN);
    expect(() => parsePendleSwapReceipt([forged], parseERC20)).toThrow(/not the Pendle Router/);
  });

  it("rejects a forged SwapPtAndToken even when a genuine one is present", () => {
    const forged = swapPtAndToken(1n, -1n, 999_000n, FOREIGN);
    expect(() => parsePendleSwapReceipt([forged, ...buySequence()], parseERC20)).toThrow(
      /not the Pendle Router/,
    );
  });

  it("rejects a Market event not emitted by the decoded market", () => {
    const changes = [
      marketSwap(1_009_082n, -999_000n, FOREIGN),
      swapPtAndToken(1_009_082n, -1_000_000n),
    ];
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(/not the swap market/);
  });

  it.each([
    ["netPtToAccount zero", 0n, -1n],
    ["netTokenToAccount zero", 1n, 0n],
    ["both positive", 1n, 1n],
    ["both negative", -1n, -1n],
  ])("rejects SwapPtAndToken amounts that are not non-zero opposite signs: %s", (_name, pt, token) => {
    expect(() => parsePendleSwapReceipt([swapPtAndToken(pt, token)], parseERC20)).toThrow(
      /opposite signs/,
    );
  });

  it("rejects an unexpected native transfer", () => {
    const native: Change = Object.freeze({
      kind: "nativeTransfer",
      from: CALLER,
      to: RECEIVER,
      value: "1",
    });
    expect(() => parsePendleSwapReceipt([native, swapPtAndToken(1n, -1n)], parseERC20)).toThrow(
      PendleSwapReceiptError,
    );
  });

  it("rejects malformed recognized event data", () => {
    const changes = buySequence();
    const deposit = changes[3];
    if (deposit?.kind !== "event") throw new Error("expected SY.Deposit event fixture");
    const malformed = {
      ...deposit,
      data: "0x" as const,
    };
    changes[3] = malformed;
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(/malformed SY.Deposit/);
  });

  it("does not attribute NewInterestIndex-compatible events to a YT identity", () => {
    const changes = buySequence();
    changes[4] = ytIndex(FOREIGN);
    changes[5] = ytIndex(FOREIGN);

    const receipt = parsePendleSwapReceipt(changes, parseERC20);
    expect(receipt.changes[4]).toMatchObject({
      kind: "change",
      data: {
        event: "NewInterestIndex-compatible",
        emitter: FOREIGN,
        attribution: "unverified",
      },
      text: `Unattributed NewInterestIndex-compatible event @ ${FOREIGN}`,
    });
  });

  it("rejects an SY event emitter that is not the SY token in the transfer flow", () => {
    const changes = buySequence();
    changes[3] = syDeposit(UNDERLYING, 1_000_000n, FOREIGN);
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(
      /SY event emitter is not authenticated/,
    );
  });

  it("rejects a self-consistent foreign SY Transfer and Deposit without the Router input flow", () => {
    const changes = buySequence();
    changes[2] = transfer(FOREIGN, ZERO, MARKET, 999_000n);
    changes[3] = syDeposit(UNDERLYING, 1_000_000n, FOREIGN);
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(
      /SY event emitter is not authenticated by the underlying and Market transfer flow/,
    );
  });

  it("rejects a sell SY event emitter that does not match the Market.Swap receiver", () => {
    const changes = sellSequence();
    changes[8] = syRedeem(UNDERLYING, 990_561n, FOREIGN);
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(
      /SY event emitter is not authenticated by the underlying and Market transfer flow/,
    );
  });

  it("rejects a buy Market.Swap receiver that does not match the Router outcome", () => {
    const changes = buySequence();
    changes[9] = marketSwap(1_009_082n, -999_000n, MARKET, FOREIGN);
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(
      /Market\.Swap receiver does not match the Router buy-PT outcome receiver/,
    );
  });

  it("rejects SY quantities that do not cover the authenticated Market.Swap flow", () => {
    const buy = buySequence();
    buy[3] = syDeposit(UNDERLYING, 1_000_000n, SY, 998_999n);
    buy[10] = swapPtAndToken(1_009_082n, -1_000_000n, 998_999n);
    expect(() => parsePendleSwapReceipt(buy, parseERC20)).toThrow(
      /SY event emitter is not authenticated by the underlying and Market transfer flow/,
    );

    const excessiveBuy = buySequence();
    excessiveBuy[2] = transfer(SY, ZERO, MARKET, 999_002n);
    excessiveBuy[3] = syDeposit(UNDERLYING, 1_000_000n, SY, 999_002n);
    excessiveBuy[10] = swapPtAndToken(1_009_082n, -1_000_000n, 999_002n);
    expect(() => parsePendleSwapReceipt(excessiveBuy, parseERC20)).toThrow(
      /SY event emitter is not authenticated by the underlying and Market transfer flow/,
    );

    const sell = sellSequence();
    sell[8] = syRedeem(UNDERLYING, 990_561n, SY, 990_999n);
    sell[9] = swapPtAndToken(-1_000_000n, 990_561n, 990_999n);
    expect(() => parsePendleSwapReceipt(sell, parseERC20)).toThrow(
      /SY event emitter is not authenticated by the underlying and Market transfer flow/,
    );
  });

  it("rejects a buy Router netSyInterm that does not match SY.Deposit", () => {
    const changes = buySequence();
    changes[10] = swapPtAndToken(1_009_082n, -1_000_000n, 998_999n);

    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(
      /Router netSyInterm does not match the authenticated SY amount/,
    );
  });

  it("rejects a sell Router netSyInterm that does not match SY.Redeem", () => {
    const changes = sellSequence();
    changes[9] = swapPtAndToken(-1_000_000n, 990_561n, 990_999n);

    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(
      /Router netSyInterm does not match the authenticated SY amount/,
    );
  });

  it("rejects transfer evidence whose actor or asset does not match the Router outcome", () => {
    const changes = buySequence();
    changes[0] = transfer(UNDERLYING, FOREIGN, ROUTER, 1_000_000n);
    expect(() => parsePendleSwapReceipt(changes, parseERC20)).toThrow(
      /transfer assets, actors, or amounts/,
    );
  });
});
