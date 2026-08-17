import {
  type Change,
  type JsonSafeValue,
  type ReceiptChange,
  type ReceiptResult,
  toJsonSafe,
} from "@themoss/core";
import { ERC20Abi, type ERC20Outcome } from "@themoss/erc";
import { type AbiEvent, decodeEventLog, toEventSelector } from "viem";
import {
  PendleMarketAbi,
  PendleRouterAbi,
  PendleStandardizedYieldAbi,
  PendleYieldTokenAbi,
} from "./abis/pendle.js";
import { PENDLE_ROUTER_ADDRESS } from "./addresses.js";
import type { PendleSwapDirection, PendleSwapOutcome } from "./types.js";

export class PendleSwapReceiptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PendleSwapReceiptError";
  }
}

function selector(abi: readonly unknown[], name: string): `0x${string}` {
  const item = (abi as AbiEvent[]).find((entry) => entry.type === "event" && entry.name === name);
  if (!item) throw new Error(`Pendle ABI is missing event ${name}`);
  return toEventSelector(item);
}

const SWAP_PT_AND_TOKEN = selector(PendleRouterAbi, "SwapPtAndToken");
const MARKET_SWAP = selector(PendleMarketAbi, "Swap");
const UPDATE_IMPLIED_RATE = selector(PendleMarketAbi, "UpdateImpliedRate");
const SY_DEPOSIT = selector(PendleStandardizedYieldAbi, "Deposit");
const SY_REDEEM = selector(PendleStandardizedYieldAbi, "Redeem");
const YT_NEW_INTEREST_INDEX = selector(PendleYieldTokenAbi, "NewInterestIndex");
const ERC20_TRANSFER = selector(ERC20Abi, "Transfer");
const ERC20_APPROVAL = selector(ERC20Abi, "Approval");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Market-scoped events must originate from the market decoded out of SwapPtAndToken, so a foreign
// contract cannot inject market evidence by reusing the signature.
const MARKET_EVENTS: ReadonlySet<string> = new Set([MARKET_SWAP, UPDATE_IMPLIED_RATE]);
const ERC20_EVENTS: ReadonlySet<string> = new Set([ERC20_TRANSFER, ERC20_APPROVAL]);

// Every event a v1 simple-route PT swap may emit; anything else is foreign and rejected.
const RECOGNIZED_EVENTS: ReadonlyMap<string, string> = new Map([
  [SWAP_PT_AND_TOKEN, "Router.SwapPtAndToken"],
  [MARKET_SWAP, "Market.Swap"],
  [UPDATE_IMPLIED_RATE, "Market.UpdateImpliedRate"],
  [SY_DEPOSIT, "SY.Deposit"],
  [SY_REDEEM, "SY.Redeem"],
  [YT_NEW_INTEREST_INDEX, "NewInterestIndex-compatible"],
  [ERC20_TRANSFER, "ERC20.Transfer"],
  [ERC20_APPROVAL, "ERC20.Approval"],
]);

type ERC20ReceiptParser = (changes: readonly Change[]) => ReceiptResult<readonly ERC20Outcome[]>;
type ERC20TransferOutcome = Extract<ERC20Outcome, { operation: "transfer" }>;

interface MarketSwapEvidence {
  netSyOut: bigint;
  netSyFee: bigint;
  receiver: string;
}

interface SyEvidence {
  emitter: string;
  amountSy: bigint;
}

interface RouterSwapEvidence {
  outcome: PendleSwapOutcome;
  netSyInterm: bigint;
}

/**
 * Parses a Pendle PT swap trace into a typed outcome, retaining every Change in original order.
 *
 * The outcome comes solely from the single `SwapPtAndToken` event emitted by the Pendle Router, so
 * a foreign contract cannot author a Pendle outcome by copying the signature. Market-scoped events
 * must originate from the market that event decodes to. SY identity is established from the
 * underlying, SY-token, Market.Swap, and Deposit/Redeem address-and-amount flow. NewInterestIndex
 * carries no market or token identity, so it is retained only as an unattributed signature-compatible
 * event rather than being claimed as authenticated YT evidence. Any unrecognized event, native
 * transfer, foreign-emitted authoritative or market event, or a missing/duplicate
 * `SwapPtAndToken` is rejected — the parser never infers or skips a Change.
 */
export function parsePendleSwapReceipt(
  changes: readonly Change[],
  parseERC20: ERC20ReceiptParser,
): ReceiptResult<PendleSwapOutcome> {
  const { outcome, netSyInterm } = authenticateOutcome(changes);
  let marketSwapCount = 0;
  let marketRateCount = 0;
  let marketSwapEvidence: MarketSwapEvidence | undefined;
  let syEvidence: SyEvidence | undefined;
  let interestIndexCount = 0;
  let directionEventCount = 0;
  const erc20Outcomes: ERC20Outcome[] = [];

  const leaves: (ReceiptChange | ReceiptResult<JsonSafeValue>)[] = changes.map((change) => {
    if (change.kind === "nativeTransfer") {
      throw new PendleSwapReceiptError(
        `unexpected native transfer from ${change.from} to ${change.to} in a Pendle PT swap`,
      );
    }
    const topic0 = change.topics[0];
    const name = topic0 ? RECOGNIZED_EVENTS.get(topic0) : undefined;
    if (!topic0 || !name) {
      throw new PendleSwapReceiptError(
        `unexpected event ${topic0 ?? "(anonymous)"} emitted by ${change.address}`,
      );
    }
    if (ERC20_EVENTS.has(topic0)) {
      const receipt = parseERC20([change]);
      const [erc20Outcome] = receipt.outcome;
      if (!erc20Outcome || receipt.outcome.length !== 1) {
        throw new PendleSwapReceiptError("ERC-20 evidence parser did not return one outcome");
      }
      erc20Outcomes.push(erc20Outcome);
      return receipt;
    }
    if (topic0 === SWAP_PT_AND_TOKEN) {
      return { kind: "change", change, data: outcome, text: describe(outcome) };
    }
    if (MARKET_EVENTS.has(topic0) && !sameAddress(change.address, outcome.market)) {
      throw new PendleSwapReceiptError(
        `${name} emitted by ${change.address}, not the swap market ${outcome.market} decoded from SwapPtAndToken`,
      );
    }
    const decoded = decodePendleEvent(change, topic0);
    if (topic0 === MARKET_SWAP) {
      marketSwapCount += 1;
      marketSwapEvidence = validateMarketSwap(decoded.args, outcome);
    } else if (topic0 === UPDATE_IMPLIED_RATE) {
      marketRateCount += 1;
    } else if (topic0 === SY_DEPOSIT || topic0 === SY_REDEEM) {
      syEvidence = validateSyEvent(topic0, change.address, decoded.args, outcome);
      directionEventCount += 1;
    } else if (topic0 === YT_NEW_INTEREST_INDEX) {
      interestIndexCount += 1;
      return {
        kind: "change",
        change,
        data: toJsonSafe({
          event: "NewInterestIndex-compatible",
          emitter: change.address,
          attribution: "unverified",
          args: decoded.args,
        }),
        text: `Unattributed NewInterestIndex-compatible event @ ${change.address}`,
      };
    }
    return {
      kind: "change",
      change,
      data: toJsonSafe({ event: name, emitter: change.address, args: decoded.args }),
      text: `${name} @ ${change.address}`,
    };
  });

  if (marketSwapCount !== 1) {
    throw new PendleSwapReceiptError(
      `Pendle swap Receipt requires exactly one authenticated Market.Swap event, got ${marketSwapCount}`,
    );
  }
  if (marketRateCount !== 1) {
    throw new PendleSwapReceiptError(
      `Pendle swap Receipt requires exactly one authenticated Market.UpdateImpliedRate event, got ${marketRateCount}`,
    );
  }
  if (directionEventCount !== 1) {
    throw new PendleSwapReceiptError(
      `Pendle ${outcome.direction} Receipt requires exactly one matching SY event, got ${directionEventCount}`,
    );
  }
  if (!marketSwapEvidence) {
    throw new PendleSwapReceiptError("Pendle swap Receipt is missing Market.Swap evidence");
  }
  if (!syEvidence) {
    throw new PendleSwapReceiptError("Pendle swap Receipt is missing an SY event");
  }
  const { pt, transfers } = validateTransferAnchors(erc20Outcomes, outcome);
  authenticateSyFlow(transfers, outcome, pt, netSyInterm, marketSwapEvidence, syEvidence);
  if (interestIndexCount === 0) {
    throw new PendleSwapReceiptError(
      "Pendle swap Receipt is missing a NewInterestIndex-compatible event",
    );
  }

  return { kind: "receipt", outcome, text: describe(outcome), changes: leaves };
}

function decodePendleEvent(change: Extract<Change, { kind: "event" }>, topic0: string) {
  const abi =
    topic0 === SWAP_PT_AND_TOKEN
      ? PendleRouterAbi
      : MARKET_EVENTS.has(topic0)
        ? PendleMarketAbi
        : topic0 === SY_DEPOSIT || topic0 === SY_REDEEM
          ? PendleStandardizedYieldAbi
          : PendleYieldTokenAbi;
  try {
    return decodeEventLog({
      abi,
      topics: change.topics as [`0x${string}`, ...`0x${string}`[]],
      data: change.data,
      strict: true,
    });
  } catch (error) {
    throw new PendleSwapReceiptError(
      `malformed ${RECOGNIZED_EVENTS.get(topic0) ?? "Pendle"} event from ${change.address}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function validateMarketSwap(
  args: Record<string, unknown>,
  outcome: PendleSwapOutcome,
): MarketSwapEvidence {
  if (!sameAddressValue(args.caller, PENDLE_ROUTER_ADDRESS)) {
    throw new PendleSwapReceiptError("Market.Swap caller is not the Pendle Router");
  }
  const netPtOut = bigintArg(args.netPtOut, "Market.Swap netPtOut");
  const netSyOut = bigintArg(args.netSyOut, "Market.Swap netSyOut");
  const netSyFee = bigintArg(args.netSyFee, "Market.Swap netSyFee");
  const receiver = stringArg(args.receiver, "Market.Swap receiver");
  const expectedPt = BigInt(
    outcome.direction === "buy-pt" ? outcome.amountOut : `-${outcome.amountIn}`,
  );
  if (netPtOut !== expectedPt || netSyOut === 0n || netPtOut > 0n === netSyOut > 0n) {
    throw new PendleSwapReceiptError(
      "Market.Swap PT/SY amounts do not match the Router swap direction and PT amount",
    );
  }
  return { netSyOut, netSyFee, receiver };
}

function validateSyEvent(
  topic0: string,
  emitter: string,
  args: Record<string, unknown>,
  outcome: PendleSwapOutcome,
): SyEvidence {
  if (!sameAddressValue(args.caller, PENDLE_ROUTER_ADDRESS)) {
    throw new PendleSwapReceiptError("SY event caller is not the Pendle Router");
  }
  if (topic0 === SY_DEPOSIT) {
    if (outcome.direction !== "buy-pt") {
      throw new PendleSwapReceiptError("SY.Deposit is inconsistent with a sell-PT outcome");
    }
    const amountSy = bigintArg(args.amountSyOut, "SY.Deposit amountSyOut");
    if (
      !sameAddressValue(args.receiver, outcome.market) ||
      !sameAddressValue(args.tokenIn, outcome.token) ||
      bigintArg(args.amountDeposited, "SY.Deposit amountDeposited") !== BigInt(outcome.amountIn) ||
      amountSy <= 0n
    ) {
      throw new PendleSwapReceiptError(
        "SY.Deposit asset, receiver, or amount does not match the Router buy-PT outcome",
      );
    }
    return { emitter, amountSy };
  }
  if (outcome.direction !== "sell-pt") {
    throw new PendleSwapReceiptError("SY.Redeem is inconsistent with a buy-PT outcome");
  }
  if (
    !sameAddressValue(args.receiver, outcome.receiver) ||
    !sameAddressValue(args.tokenOut, outcome.token) ||
    bigintArg(args.amountTokenOut, "SY.Redeem amountTokenOut") !== BigInt(outcome.amountOut) ||
    bigintArg(args.amountSyToRedeem, "SY.Redeem amountSyToRedeem") <= 0n
  ) {
    throw new PendleSwapReceiptError(
      "SY.Redeem asset, receiver, or amount does not match the Router sell-PT outcome",
    );
  }
  return {
    emitter,
    amountSy: bigintArg(args.amountSyToRedeem, "SY.Redeem amountSyToRedeem"),
  };
}

function validateTransferAnchors(
  erc20Outcomes: readonly ERC20Outcome[],
  outcome: PendleSwapOutcome,
): { pt: string; transfers: readonly ERC20TransferOutcome[] } {
  const transfers = erc20Outcomes.filter(
    (entry): entry is ERC20TransferOutcome => entry.operation === "transfer",
  );
  const input = transfers.find(
    (entry) =>
      sameAddress(entry.from, outcome.caller) &&
      entry.amount === outcome.amountIn &&
      (outcome.direction === "buy-pt"
        ? sameAddress(entry.token, outcome.token)
        : !sameAddress(entry.token, outcome.token)),
  );
  const output = transfers.find(
    (entry) =>
      sameAddress(entry.to, outcome.receiver) &&
      entry.amount === outcome.amountOut &&
      (outcome.direction === "buy-pt"
        ? !sameAddress(entry.token, outcome.token)
        : sameAddress(entry.token, outcome.token)),
  );
  if (!input || !output || sameAddress(input.token, output.token)) {
    throw new PendleSwapReceiptError(
      "ERC-20 transfer assets, actors, or amounts do not prove the Router swap outcome",
    );
  }
  return {
    pt: outcome.direction === "buy-pt" ? output.token : input.token,
    transfers,
  };
}

function authenticateSyFlow(
  transfers: readonly ERC20TransferOutcome[],
  outcome: PendleSwapOutcome,
  pt: string,
  netSyInterm: bigint,
  marketSwap: MarketSwapEvidence,
  sy: SyEvidence,
): void {
  const distinct =
    !sameAddress(sy.emitter, outcome.token) &&
    !sameAddress(sy.emitter, pt) &&
    !sameAddress(sy.emitter, outcome.market) &&
    !sameAddress(sy.emitter, PENDLE_ROUTER_ADDRESS);
  const marketSyAmount =
    outcome.direction === "buy-pt" ? -marketSwap.netSyOut : marketSwap.netSyOut;
  if (outcome.direction === "buy-pt" && !sameAddress(marketSwap.receiver, outcome.receiver)) {
    throw new PendleSwapReceiptError(
      "Market.Swap receiver does not match the Router buy-PT outcome receiver",
    );
  }
  if (!distinct || marketSyAmount <= 0n) {
    throw new PendleSwapReceiptError(
      "SY event emitter is not authenticated by the underlying and Market transfer flow",
    );
  }
  if (netSyInterm !== sy.amountSy) {
    throw new PendleSwapReceiptError(
      "Router netSyInterm does not match the authenticated SY amount",
    );
  }

  const matches = (criteria: {
    token: string;
    from: string;
    to: string;
    amount: bigint | string;
  }) =>
    transfers.some(
      (entry) =>
        sameAddress(entry.token, criteria.token) &&
        sameAddress(entry.from, criteria.from) &&
        sameAddress(entry.to, criteria.to) &&
        entry.amount === criteria.amount.toString(),
    );

  const authenticated =
    outcome.direction === "buy-pt"
      ? sy.amountSy >= marketSyAmount &&
        sy.amountSy - marketSyAmount <= marketSwap.netSyFee &&
        matches({
          token: outcome.token,
          from: PENDLE_ROUTER_ADDRESS,
          to: sy.emitter,
          amount: outcome.amountIn,
        }) &&
        matches({
          token: sy.emitter,
          from: ZERO_ADDRESS,
          to: outcome.market,
          amount: sy.amountSy,
        })
      : matches({
          token: sy.emitter,
          from: outcome.market,
          to: sy.emitter,
          amount: marketSyAmount,
        }) &&
        sy.amountSy === marketSyAmount &&
        sameAddress(marketSwap.receiver, sy.emitter) &&
        matches({
          token: sy.emitter,
          from: sy.emitter,
          to: ZERO_ADDRESS,
          amount: sy.amountSy,
        }) &&
        matches({
          token: outcome.token,
          from: sy.emitter,
          to: outcome.receiver,
          amount: outcome.amountOut,
        });

  if (!authenticated) {
    throw new PendleSwapReceiptError(
      "SY event emitter is not authenticated by the underlying and Market transfer flow",
    );
  }
}

function sameAddressValue(value: unknown, expected: string): boolean {
  return typeof value === "string" && sameAddress(value, expected);
}

function bigintArg(value: unknown, label: string): bigint {
  if (typeof value !== "bigint") {
    throw new PendleSwapReceiptError(`${label} is malformed`);
  }
  return value;
}

function stringArg(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new PendleSwapReceiptError(`${label} is malformed`);
  }
  return value;
}

/**
 * Locates the single authoritative `SwapPtAndToken`, requiring it to come from the Pendle Router and
 * rejecting any Router-signature event emitted elsewhere before it can stand in as the outcome.
 */
function authenticateOutcome(changes: readonly Change[]): RouterSwapEvidence {
  let evidence: RouterSwapEvidence | undefined;
  for (const change of changes) {
    if (change.kind !== "event" || change.topics[0] !== SWAP_PT_AND_TOKEN) continue;
    if (!sameAddress(change.address, PENDLE_ROUTER_ADDRESS)) {
      throw new PendleSwapReceiptError(
        `SwapPtAndToken emitted by ${change.address}, not the Pendle Router ${PENDLE_ROUTER_ADDRESS}; refusing a forged outcome`,
      );
    }
    if (evidence) {
      throw new PendleSwapReceiptError("Pendle swap emitted more than one SwapPtAndToken");
    }
    evidence = toRouterSwapEvidence(change);
  }
  if (!evidence) {
    throw new PendleSwapReceiptError(
      "Pendle swap Receipt requires exactly one SwapPtAndToken event from the Router",
    );
  }
  return evidence;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function toRouterSwapEvidence(change: Extract<Change, { kind: "event" }>): RouterSwapEvidence {
  const decoded = decodeEventLog({
    abi: PendleRouterAbi,
    topics: change.topics as [`0x${string}`, ...`0x${string}`[]],
    data: change.data,
    strict: true,
  });
  if (decoded.eventName !== "SwapPtAndToken") {
    throw new PendleSwapReceiptError(`expected SwapPtAndToken, decoded ${decoded.eventName}`);
  }
  const { market, token, caller, receiver, netPtToAccount, netTokenToAccount, netSyInterm } =
    decoded.args;
  if (
    netPtToAccount === 0n ||
    netTokenToAccount === 0n ||
    netPtToAccount > 0n === netTokenToAccount > 0n
  ) {
    throw new PendleSwapReceiptError(
      `SwapPtAndToken netPtToAccount ${netPtToAccount} and netTokenToAccount ${netTokenToAccount} must be non-zero with opposite signs`,
    );
  }
  const direction: PendleSwapDirection = netPtToAccount > 0n ? "buy-pt" : "sell-pt";
  const amountIn = (direction === "buy-pt" ? -netTokenToAccount : -netPtToAccount).toString();
  const amountOut = (direction === "buy-pt" ? netPtToAccount : netTokenToAccount).toString();
  return {
    netSyInterm,
    outcome: {
      operation: "swap",
      protocol: "pendle",
      direction,
      market,
      token,
      caller,
      receiver,
      amountIn,
      amountOut,
    },
  };
}

function describe(outcome: PendleSwapOutcome): string {
  const [inLabel, outLabel] =
    outcome.direction === "buy-pt" ? [outcome.token, "PT"] : ["PT", outcome.token];
  return `Pendle ${outcome.direction}: ${outcome.amountIn} ${inLabel} -> ${outcome.amountOut} ${outLabel} in market ${outcome.market}`;
}
