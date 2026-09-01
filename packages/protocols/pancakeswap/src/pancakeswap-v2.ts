/** PancakeSwap v2 swaps on Monad mainnet. */
import {
  type ActionCtx,
  type AddressValue,
  BasisPoints,
  Capability,
  type CapabilityResult,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  NATIVE,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  type TokenRef,
  TokenReference,
} from "@themoss/core";
import { ERC20, type ERC20Outcome, WETH9Abi } from "@themoss/erc";
import { WMON_ADDRESS } from "@themoss/system";
import { decodeEventLog, formatUnits, getAddress, parseUnits } from "viem";
import { pancakeV2PairAbi } from "./abis/v2-pair.js";
import { pancakeV2RouterAbi } from "./abis/v2-router.js";
import type { PancakeV2Quote, PancakeV2SwapOutcome, PreparedV2Swap } from "./types-v2.js";

/**
 * Official Monad mainnet deployment:
 * https://developer.pancakeswap.finance/contracts/v2/addresses
 * The live test verifies bytecode, factory(), and WETH().
 */
export const PANCAKESWAP_V2_ROUTER_ADDRESS = "0xB1Bc24c34e88f7D43D5923034E3a14B24DaACfF9" as const;
export const PANCAKESWAP_V2_FACTORY_ADDRESS = "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E" as const;
export const PANCAKESWAP_V2_PAIR_ABI_SOURCE_ADDRESS =
  "0x27aa322b3f8ba9d0041df99c33fe4f3cc135e054" as const;

const DEFAULT_SLIPPAGE_BPS = 50;
const DEADLINE_SECONDS = 20 * 60;
const OptionalHumanTokenAmount = PositiveDecimalString.optional().describe(
  'An optional positive base-10 decimal token amount, such as "1" or "1.5".',
);
const PancakeSlippage = BasisPoints.max(5_000)
  .default(DEFAULT_SLIPPAGE_BPS)
  .describe("An integer basis-point count from 0 through 5000; 1 bps equals 0.01%.");

const swapParams = {
  tokenIn: { type: TokenReference, description: "Asset offered to the swap." },
  tokenOut: { type: TokenReference, description: "Asset requested from the swap." },
  amountIn: {
    type: OptionalHumanTokenAmount,
    description: "Fixed input quantity; omit when amountOut is supplied.",
  },
  amountOut: {
    type: OptionalHumanTokenAmount,
    description: "Minimum output quantity; omit when amountIn is supplied.",
  },
  slippage: {
    type: PancakeSlippage,
    description: "Maximum adverse movement allowed between quoting and execution.",
  },
} satisfies ParamsSpec;

type InferredSwapParams = InferParams<typeof swapParams>;
type SwapParams = Omit<InferredSwapParams, "amountIn" | "amountOut" | "slippage"> &
  Partial<Pick<InferredSwapParams, "amountIn" | "amountOut" | "slippage">>;
type PancakeSwapParams = Pick<SwapParams, "tokenIn" | "tokenOut"> & {
  slippage?: InferredSwapParams["slippage"];
} & ({ amountIn: string; amountOut?: never } | { amountIn?: never; amountOut: string });

@Protocol({
  name: "pancakeswap-v2",
  category: "dex",
  description:
    "PancakeSwap v2 constant-product AMM swaps over direct or single-WMON-hop paths on Monad.",
  contracts: {
    router: { abi: pancakeV2RouterAbi, addr: PANCAKESWAP_V2_ROUTER_ADDRESS },
  },
  labels: {
    Router: PANCAKESWAP_V2_ROUTER_ADDRESS,
    Factory: PANCAKESWAP_V2_FACTORY_ADDRESS,
  },
  protocols: { erc20: ERC20 },
})
export class PancakeSwapV2 {
  declare router: Handle<typeof pancakeV2RouterAbi>;
  declare erc20: ProtocolRef<ERC20>;

  quote(params: PancakeSwapParams, ctx: ActionCtx): Promise<PancakeV2Quote>;
  @Query({
    intent: "Quote the best PancakeSwap v2 path",
    params: swapParams,
    tags: ["amm", "v2", "quote"],
  })
  async quote(params: SwapParams, _ctx: ActionCtx): Promise<PancakeV2Quote> {
    const prepared = await this.#prepareSwap(params);
    if (prepared.side === "amountIn") {
      return {
        amountSide: "amountIn",
        amountIn: formatUnits(prepared.estimatedAmountIn, prepared.inputDecimals),
        estimatedAmountOut: formatUnits(prepared.estimatedAmountOut, prepared.outputDecimals),
        minimumAmountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
        path: displayPath(prepared.path, params.tokenIn, params.tokenOut),
      };
    }
    return {
      amountSide: "amountOut",
      estimatedAmountIn: formatUnits(prepared.estimatedAmountIn, prepared.inputDecimals),
      maximumAmountIn: formatUnits(prepared.executionAmountIn, prepared.inputDecimals),
      minimumAmountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
      path: displayPath(prepared.path, params.tokenIn, params.tokenOut),
    };
  }

  swap(params: PancakeSwapParams, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<PancakeSwapV2, typeof swapParams>({
    intent: "Swap tokens through the best current PancakeSwap v2 path",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["amm", "v2"],
  })
  async swap(params: SwapParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const prepared = await this.#prepareSwap(params);
    const children = [];
    if (params.tokenIn !== NATIVE) {
      children.push(
        await this.erc20.approve({
          token: params.tokenIn,
          spender: this.router.address,
          amount: prepared.executionAmountIn.toString(),
        }),
      );
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);
    const args = [prepared.path, ctx.account, deadline] as const;
    if (prepared.side === "amountIn") {
      if (params.tokenIn === NATIVE) {
        children.push(
          this.router.swapExactETHForTokens([prepared.minimumAmountOut, ...args], {
            value: prepared.executionAmountIn,
          }),
        );
      } else if (params.tokenOut === NATIVE) {
        children.push(
          this.router.swapExactTokensForETH([
            prepared.executionAmountIn,
            prepared.minimumAmountOut,
            ...args,
          ]),
        );
      } else {
        children.push(
          this.router.swapExactTokensForTokens([
            prepared.executionAmountIn,
            prepared.minimumAmountOut,
            ...args,
          ]),
        );
      }
    } else if (params.tokenIn === NATIVE) {
      children.push(
        this.router.swapETHForExactTokens([prepared.minimumAmountOut, ...args], {
          value: prepared.executionAmountIn,
        }),
      );
    } else if (params.tokenOut === NATIVE) {
      children.push(
        this.router.swapTokensForExactETH([
          prepared.minimumAmountOut,
          prepared.executionAmountIn,
          ...args,
        ]),
      );
    } else {
      children.push(
        this.router.swapTokensForExactTokens([
          prepared.minimumAmountOut,
          prepared.executionAmountIn,
          ...args,
        ]),
      );
    }
    return children;
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<PancakeV2SwapOutcome> {
    const transfers: IndexedTransfer[] = [];
    const wethEvents: WethEvent[] = [];
    const pairEvents: PairEvent[] = [];
    const parsed = changes.map((change, changeIndex) => {
      if (change.kind === "event" && sameAddress(change.address, WMON_ADDRESS)) {
        const event = tryDecodeWethEvent(change);
        if (event?.eventName === "Deposit" || event?.eventName === "Withdrawal") {
          const data: WethEvent = {
            event: event.eventName,
            account: event.eventName === "Deposit" ? event.args.dst : event.args.src,
            amount: event.args.wad.toString(),
            changeIndex,
          };
          wethEvents.push(data);
          return {
            kind: "change" as const,
            change,
            data,
            text: `WMON ${data.event}: ${data.amount} for ${data.account}`,
          };
        }
      }

      if (change.kind === "event") {
        const event = tryDecodePairEvent(change);
        if (event?.eventName === "Sync") {
          const data: PairEvent = {
            event: "Sync",
            pair: change.address,
            reserve0: event.args.reserve0.toString(),
            reserve1: event.args.reserve1.toString(),
            changeIndex,
          };
          pairEvents.push(data);
          return {
            kind: "change" as const,
            change,
            data,
            text: `PancakeSwap Sync: reserves ${data.reserve0}/${data.reserve1} at ${data.pair}`,
          };
        }
        if (event?.eventName === "Swap") {
          if (!sameAddress(event.args.sender, PANCAKESWAP_V2_ROUTER_ADDRESS)) {
            throw new Error("PancakeSwap Pair Swap sender is not the Router");
          }
          const data: PairEvent = {
            event: "Swap",
            pair: change.address,
            sender: event.args.sender,
            to: event.args.to,
            amount0In: event.args.amount0In.toString(),
            amount1In: event.args.amount1In.toString(),
            amount0Out: event.args.amount0Out.toString(),
            amount1Out: event.args.amount1Out.toString(),
            changeIndex,
          };
          pairEvents.push(data);
          return {
            kind: "change" as const,
            change,
            data,
            text: `PancakeSwap Pair Swap: ${swapInput(data)} in and ${swapOutput(data)} out at ${data.pair}`,
          };
        }
        if (event?.eventName === "Mint" || event?.eventName === "Burn") {
          throw new Error(`Unexpected Change: PancakeSwap swap emitted Pair ${event.eventName}`);
        }
      }

      const receipt = this.erc20.changesReceipt([change]);
      for (const outcome of receipt.outcome) {
        if (outcome.operation === "transfer") transfers.push({ outcome, changeIndex });
      }
      return receipt;
    });

    const pairLegs = validatePairEvents(pairEvents);
    const legs = pairLegs.map(({ sync, swap }) => {
      const input = exactlyOne(
        transfers.filter(
          ({ outcome }) => outcome.token !== NATIVE && sameAddress(outcome.to, swap.pair),
        ),
        `input transfer to Pair ${swap.pair}`,
      );
      const output = exactlyOne(
        transfers.filter(
          ({ outcome }) => outcome.token !== NATIVE && sameAddress(outcome.from, swap.pair),
        ),
        `output transfer from Pair ${swap.pair}`,
      );
      if (input.outcome.amount !== swapInput(swap) || output.outcome.amount !== swapOutput(swap)) {
        throw new Error("PancakeSwap Receipt transfer amounts differ from Pair Swap evidence");
      }
      if (!sameAddress(output.outcome.to, swap.to)) {
        throw new Error("PancakeSwap Receipt Pair output recipient differs from Swap.to");
      }
      if (
        !(
          input.changeIndex < output.changeIndex &&
          output.changeIndex < sync.changeIndex &&
          sync.changeIndex < swap.changeIndex
        )
      ) {
        throw new Error("PancakeSwap Receipt Pair funding, output, Sync, and Swap are misordered");
      }
      return { input, output, swap };
    });
    for (let index = 0; index < legs.length - 1; index += 1) {
      const current = legs[index];
      const next = legs[index + 1];
      if (!current || !next) throw new Error("PancakeSwap Receipt has a missing Pair leg");
      if (
        current.output.changeIndex !== next.input.changeIndex ||
        !sameAddress(current.output.outcome.to, next.swap.pair) ||
        !sameAddress(current.output.outcome.token, WMON_ADDRESS)
      ) {
        throw new Error("PancakeSwap Receipt Pair legs are not linked by one WMON transfer");
      }
    }
    const firstLeg = legs[0];
    const lastLeg = legs.at(-1);
    if (!firstLeg || !lastLeg) throw new Error("PancakeSwap Receipt requires a Pair Swap");
    const input = firstLeg.input.outcome;
    const output = lastLeg.output.outcome;

    const deposits = wethEvents.filter((event) => event.event === "Deposit");
    const withdrawals = wethEvents.filter((event) => event.event === "Withdrawal");
    if (deposits.length > 1 || withdrawals.length > 1 || (deposits.length && withdrawals.length)) {
      throw new Error("PancakeSwap Receipt has an invalid WMON operation sequence");
    }

    let sender = input.from;
    let tokenIn: TokenRef = input.token;
    if (deposits[0]) {
      if (!sameAddress(input.token, WMON_ADDRESS) || deposits[0].amount !== input.amount) {
        throw new Error("PancakeSwap Receipt WMON deposit does not match Pair input");
      }
      if (!sameAddress(deposits[0].account, PANCAKESWAP_V2_ROUTER_ADDRESS)) {
        throw new Error("PancakeSwap Receipt WMON deposit account is not the Router");
      }
      const funding = exactlyOne(
        transfers.filter(
          ({ outcome }) =>
            outcome.token === NATIVE &&
            sameAddress(outcome.to, PANCAKESWAP_V2_ROUTER_ADDRESS) &&
            !sameAddress(outcome.from, WMON_ADDRESS),
        ),
        "native funding transfer",
      );
      const wrapped = exactlyOne(
        transfers.filter(
          ({ outcome }) =>
            outcome.token === NATIVE &&
            sameAddress(outcome.from, PANCAKESWAP_V2_ROUTER_ADDRESS) &&
            sameAddress(outcome.to, WMON_ADDRESS),
        ),
        "native Router-to-WMON transfer",
      );
      if (
        wrapped.outcome.amount !== input.amount ||
        BigInt(funding.outcome.amount) < BigInt(input.amount) ||
        !(
          funding.changeIndex < wrapped.changeIndex && wrapped.changeIndex < deposits[0].changeIndex
        ) ||
        !(deposits[0].changeIndex < firstLeg.input.changeIndex)
      ) {
        throw new Error("PancakeSwap Receipt native funding does not cover the WMON deposit");
      }
      sender = funding.outcome.from;
      tokenIn = NATIVE;
    }

    let recipient = output.to;
    let tokenOut: TokenRef = output.token;
    if (withdrawals[0]) {
      if (!sameAddress(output.token, WMON_ADDRESS) || withdrawals[0].amount !== output.amount) {
        throw new Error("PancakeSwap Receipt WMON withdrawal does not match Pair output");
      }
      if (!sameAddress(withdrawals[0].account, PANCAKESWAP_V2_ROUTER_ADDRESS)) {
        throw new Error("PancakeSwap Receipt WMON withdrawal account is not the Router");
      }
      const payout = exactlyOne(
        transfers.filter(
          ({ outcome }) =>
            outcome.token === NATIVE &&
            sameAddress(outcome.from, PANCAKESWAP_V2_ROUTER_ADDRESS) &&
            !sameAddress(outcome.to, WMON_ADDRESS),
        ),
        "native payout transfer",
      );
      const unwrapped = exactlyOne(
        transfers.filter(
          ({ outcome }) =>
            outcome.token === NATIVE &&
            sameAddress(outcome.from, WMON_ADDRESS) &&
            sameAddress(outcome.to, PANCAKESWAP_V2_ROUTER_ADDRESS),
        ),
        "native WMON-to-Router transfer",
      );
      if (
        payout.outcome.amount !== output.amount ||
        unwrapped.outcome.amount !== output.amount ||
        !(lastLeg.swap.changeIndex < unwrapped.changeIndex) ||
        !(unwrapped.changeIndex < withdrawals[0].changeIndex) ||
        !(withdrawals[0].changeIndex < payout.changeIndex)
      ) {
        throw new Error("PancakeSwap Receipt native payout differs from Pair output");
      }
      recipient = payout.outcome.to;
      tokenOut = NATIVE;
    }

    const outcome: PancakeV2SwapOutcome = {
      operation: "swap",
      protocol: "pancakeswap-v2",
      sender: getAddress(sender),
      recipient: getAddress(recipient),
      tokenIn: canonicalToken(tokenIn),
      tokenOut: canonicalToken(tokenOut),
      amountIn: input.amount,
      amountOut: output.amount,
      pairs: legs.map(({ swap }) => getAddress(swap.pair)),
    };
    return {
      kind: "receipt",
      outcome,
      text: `PancakeSwap Swap: ${outcome.amountIn} ${outcome.tokenIn} to ${outcome.amountOut} ${outcome.tokenOut} for ${outcome.recipient}`,
      changes: parsed,
    };
  }

  async #prepareSwap(params: SwapParams): Promise<PreparedV2Swap> {
    const paths = this.#paths(params.tokenIn, params.tokenOut);
    const side = amountSide(params);
    const [inputDecimals, outputDecimals] = await Promise.all([
      this.#decimals(params.tokenIn),
      this.#decimals(params.tokenOut),
    ]);
    const amount = parseUnits(
      side.amount,
      side.kind === "amountIn" ? inputDecimals : outputDecimals,
    );
    const quoted = await Promise.all(
      paths.map(async (path) => {
        try {
          const amounts =
            side.kind === "amountIn"
              ? await this.router.read.getAmountsOut([amount, path])
              : await this.router.read.getAmountsIn([amount, path]);
          const amountIn = amounts[0];
          const amountOut = amounts.at(-1);
          return amountIn && amountOut ? { path, amountIn, amountOut } : undefined;
        } catch {
          return undefined;
        }
      }),
    );
    const routes = quoted.filter((route): route is NonNullable<typeof route> => !!route);
    const [first] = routes;
    if (!first) throw new Error("no liquid PancakeSwap v2 route for this token pair");
    const best = routes.reduce((current, route) => {
      const better =
        side.kind === "amountIn"
          ? route.amountOut > current.amountOut
          : route.amountIn < current.amountIn;
      const tied = route.amountIn === current.amountIn && route.amountOut === current.amountOut;
      return better || (tied && route.path.length < current.path.length) ? route : current;
    }, first);
    const slippage = BigInt(params.slippage ?? DEFAULT_SLIPPAGE_BPS);
    const minimumAmountOut =
      side.kind === "amountIn" ? (best.amountOut * (10_000n - slippage)) / 10_000n : amount;
    const executionAmountIn =
      side.kind === "amountIn" ? amount : (best.amountIn * (10_000n + slippage) + 9_999n) / 10_000n;
    if (minimumAmountOut <= 0n || executionAmountIn <= 0n) {
      throw new Error("PancakeSwap quote produced a zero execution bound");
    }
    return {
      side: side.kind,
      path: best.path,
      estimatedAmountIn: best.amountIn,
      executionAmountIn,
      estimatedAmountOut: best.amountOut,
      minimumAmountOut,
      inputDecimals,
      outputDecimals,
    };
  }

  #paths(tokenIn: TokenRef, tokenOut: TokenRef): AddressValue[][] {
    const input = toRouterToken(tokenIn);
    const output = toRouterToken(tokenOut);
    if (sameAddress(input, output)) {
      throw new ParameterError("tokenIn and tokenOut resolve to the same router token");
    }
    const paths = [[input, output]];
    if (!sameAddress(input, WMON_ADDRESS) && !sameAddress(output, WMON_ADDRESS)) {
      paths.push([input, WMON_ADDRESS, output]);
    }
    return paths;
  }

  async #decimals(token: TokenRef): Promise<number> {
    if (token === NATIVE) return 18;
    const metadata = await this.erc20.metadata({ token });
    return metadata.decimals;
  }
}

type WethEvent = {
  event: "Deposit" | "Withdrawal";
  account: AddressValue;
  amount: string;
  changeIndex: number;
};

type TransferOutcome = Extract<ERC20Outcome, { operation: "transfer" }>;
type IndexedTransfer = { outcome: TransferOutcome; changeIndex: number };

type PairEvent =
  | {
      event: "Sync";
      pair: AddressValue;
      reserve0: string;
      reserve1: string;
      changeIndex: number;
    }
  | {
      event: "Swap";
      pair: AddressValue;
      sender: AddressValue;
      to: AddressValue;
      amount0In: string;
      amount1In: string;
      amount0Out: string;
      amount1Out: string;
      changeIndex: number;
    };
type PairSync = Extract<PairEvent, { event: "Sync" }>;
type PairSwap = Extract<PairEvent, { event: "Swap" }>;

function validatePairEvents(events: readonly PairEvent[]): { sync: PairSync; swap: PairSwap }[] {
  if (events.length === 0 || events.length > 4 || events.length % 2 !== 0) {
    throw new Error("PancakeSwap Receipt requires one Sync before every Pair Swap");
  }
  const legs: { sync: PairSync; swap: PairSwap }[] = [];
  const pairs = new Set<string>();
  for (let index = 0; index < events.length; index += 2) {
    const sync = events[index];
    const swap = events[index + 1];
    if (sync?.event !== "Sync" || swap?.event !== "Swap" || !sameAddress(sync.pair, swap.pair)) {
      throw new Error("PancakeSwap Receipt Pair events are not ordered Sync/Swap pairs");
    }
    const pair = swap.pair.toLowerCase();
    if (pairs.has(pair)) throw new Error("PancakeSwap Receipt repeats a Pair leg");
    pairs.add(pair);
    legs.push({ sync, swap });
  }
  return legs;
}

function exactlyOne<T>(values: readonly T[], description: string): T {
  const [value] = values;
  if (!value || values.length !== 1) {
    throw new Error(`PancakeSwap Receipt requires exactly one ${description}`);
  }
  return value;
}

function swapInput(swap: PairSwap): string {
  return (BigInt(swap.amount0In) + BigInt(swap.amount1In)).toString();
}

function swapOutput(swap: PairSwap): string {
  return (BigInt(swap.amount0Out) + BigInt(swap.amount1Out)).toString();
}

function amountSide(params: SwapParams) {
  if (params.amountIn !== undefined && params.amountOut === undefined) {
    return { kind: "amountIn", amount: params.amountIn } as const;
  }
  if (params.amountOut !== undefined && params.amountIn === undefined) {
    return { kind: "amountOut", amount: params.amountOut } as const;
  }
  throw new ParameterError("provide exactly one of amountIn or amountOut");
}

function toRouterToken(token: TokenRef): AddressValue {
  return token === NATIVE ? WMON_ADDRESS : token;
}

function displayPath(
  path: readonly AddressValue[],
  tokenIn: TokenRef,
  tokenOut: TokenRef,
): readonly TokenRef[] {
  return path.length === 2 ? [tokenIn, tokenOut] : [tokenIn, NATIVE, tokenOut];
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function canonicalToken(token: TokenRef): TokenRef {
  return token === NATIVE ? NATIVE : getAddress(token);
}

function tryDecodePairEvent(change: Extract<Change, { kind: "event" }>) {
  try {
    return decodeEventLog({
      abi: pancakeV2PairAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}

function tryDecodeWethEvent(change: Extract<Change, { kind: "event" }>) {
  try {
    return decodeEventLog({
      abi: WETH9Abi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}
