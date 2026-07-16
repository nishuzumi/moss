import {
  type ActionCtx,
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
import { ERC20 } from "@themoss/erc";
import { WMON_ADDRESS } from "@themoss/system";
import {
  decodeEventLog,
  encodeAbiParameters,
  formatUnits,
  keccak256,
  parseUnits,
  zeroAddress,
  zeroHash,
} from "viem";
import { CloberBookManagerAbi, CloberBookViewerAbi, CloberControllerAbi } from "./abis/clober.js";
import type { CloberFill, CloberQuote, CloberSwapOutcome } from "./types.js";

// Official Monad mainnet deployments:
// https://github.com/clober-dex/v2-sdk/blob/main/src/constants/chain-configs/addresses.ts
// (retrieved 2026-07-16). Live tests verify deployed bytecode and relationships.
export const CLOBER_CONTROLLER_ADDRESS = "0x19b68a2b909D96c05B623050C276FBD457De8e83" as const;
export const CLOBER_BOOK_MANAGER_ADDRESS = "0x6657d192273731C3cAc646cc82D5F28D0CBE8CCC" as const;
export const CLOBER_BOOK_VIEWER_ADDRESS = "0xe424c211e2Ed8a5B6d1C57FA493C41715568D238" as const;

const DEFAULT_SLIPPAGE_BPS = 50;
const MAX_SLIPPAGE_BPS = 5_000;
const MAKER_POLICY = 8_888_608;
const TAKER_POLICY = 8_888_708;
const MIN_INPUT_UTILIZATION_BPS = 9_990;
const NATIVE_UNIT_SIZE = 1_000_000_000_000n;
const UINT64_MAX = (1n << 64n) - 1n;
const UINT192_MASK = (1n << 192n) - 1n;
const SWAP_DEADLINE_SECONDS = 20 * 60;

const CloberSlippage = BasisPoints.max(MAX_SLIPPAGE_BPS).describe(
  "An integer basis-point count from 0 through 5000; 1 bps equals 0.01%.",
);

const swapParams = {
  tokenIn: { type: TokenReference, description: "Asset offered to the Clober market." },
  tokenOut: { type: TokenReference, description: "Asset requested from the Clober market." },
  amountIn: {
    type: PositiveDecimalString,
    description: "Fixed input quantity to spend in tokenIn display units.",
  },
  slippage: {
    type: CloberSlippage.default(DEFAULT_SLIPPAGE_BPS),
    description: "Maximum adverse movement allowed between quoting and execution.",
  },
} satisfies ParamsSpec;

type InferredSwapParams = InferParams<typeof swapParams>;
type SwapParams = Omit<InferredSwapParams, "slippage"> &
  Partial<Pick<InferredSwapParams, "slippage">>;
export type CloberSwapParams = SwapParams;

type BookKey = {
  base: `0x${string}`;
  unitSize: bigint;
  quote: `0x${string}`;
  makerPolicy: number;
  hooks: `0x${string}`;
  takerPolicy: number;
};

type PreparedSwap = {
  amountIn: bigint;
  spentAmountIn: bigint;
  amountOut: bigint;
  minimumAmountOut: bigint;
  inputDecimals: number;
  outputDecimals: number;
  bookId: bigint;
  order: {
    id: bigint;
    limitPrice: bigint;
    baseAmount: bigint;
    minQuoteAmount: bigint;
    hookData: Hex;
  };
};

@Protocol({
  name: "clober",
  category: "dex",
  description: "Clober V2 exact-input swaps over canonical verified Monad order books.",
  contracts: {
    controller: { abi: CloberControllerAbi, addr: CLOBER_CONTROLLER_ADDRESS },
    bookManager: { abi: CloberBookManagerAbi, addr: CLOBER_BOOK_MANAGER_ADDRESS },
    bookViewer: { abi: CloberBookViewerAbi, addr: CLOBER_BOOK_VIEWER_ADDRESS },
  },
  protocols: { erc20: ERC20 },
})
export class Clober {
  declare controller: Handle<typeof CloberControllerAbi>;
  declare bookManager: Handle<typeof CloberBookManagerAbi>;
  declare bookViewer: Handle<typeof CloberBookViewerAbi>;
  declare erc20: ProtocolRef<ERC20>;

  quote(params: CloberSwapParams, ctx: ActionCtx): Promise<CloberQuote>;
  @Query({
    intent: "Quote a canonical Clober exact-input swap",
    params: swapParams,
    tags: ["clob"],
  })
  async quote(params: SwapParams, _ctx: ActionCtx): Promise<CloberQuote> {
    const prepared = await this.#prepareSwap(params);
    return {
      amountIn: formatUnits(prepared.amountIn, prepared.inputDecimals),
      estimatedAmountSpent: formatUnits(prepared.spentAmountIn, prepared.inputDecimals),
      estimatedAmountOut: formatUnits(prepared.amountOut, prepared.outputDecimals),
      minimumAmountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
    };
  }

  swap(params: CloberSwapParams, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Clober, typeof swapParams>({
    intent: "Swap a fixed input through the canonical Clober order book",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["clob", "orderbook"],
  })
  async swap(params: SwapParams, _ctx: ActionCtx): Promise<CapabilityResult> {
    const prepared = await this.#prepareSwap(params);
    const children = [];
    if (params.tokenIn !== NATIVE) {
      children.push(
        await this.erc20.approve({
          token: params.tokenIn,
          spender: this.controller.address,
          amount: prepared.amountIn.toString(),
        }),
      );
    }

    const tokensToSettle = uniqueErc20Tokens(params.tokenIn, params.tokenOut);
    const deadline = BigInt(Math.floor(Date.now() / 1_000) + SWAP_DEADLINE_SECONDS);
    children.push(
      this.controller.spend(
        [
          [{ ...prepared.order, minQuoteAmount: prepared.minimumAmountOut }],
          tokensToSettle,
          [],
          deadline,
        ],
        { value: params.tokenIn === NATIVE ? prepared.amountIn : 0n },
      ),
    );
    return children;
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<CloberSwapOutcome> {
    const fills: CloberFill[] = [];
    const settlements: CloberSwapOutcome["settlements"][number][] = [];
    const parsed = changes.map((change) => {
      if (change.kind === "event" && sameAddress(change.address, CLOBER_BOOK_MANAGER_ADDRESS)) {
        const event = decodeBookManagerEvent(change);
        if (event.eventName !== "Take") {
          throw new Error(`Unexpected Change: Clober BookManager emitted ${event.eventName}`);
        }
        if (!sameAddress(event.args.user, CLOBER_CONTROLLER_ADDRESS)) {
          throw new Error("Clober Take user is not the Controller");
        }
        const fill: CloberFill = {
          event: "Take",
          bookId: event.args.bookId.toString(),
          user: event.args.user,
          tick: event.args.tick.toString(),
          unit: event.args.unit.toString(),
        };
        fills.push(fill);
        return {
          kind: "change" as const,
          change,
          data: fill,
          text: `Clober Take: ${fill.unit} units at tick ${fill.tick} from book ${fill.bookId} by ${fill.user}`,
        };
      }

      const settlement = this.erc20.changesReceipt([change]);
      settlements.push(...settlement.outcome);
      return settlement;
    });

    if (fills.length === 0) throw new Error("Clober swap Receipt requires at least one Take");
    const outcome: CloberSwapOutcome = {
      operation: "swap",
      protocol: "clober",
      fills,
      settlements,
    };
    return {
      kind: "receipt",
      outcome,
      text: `Clober Swap: ${fills.length} fill${fills.length === 1 ? "" : "s"} and ${settlements.length} settlement${settlements.length === 1 ? "" : "s"}`,
      changes: parsed,
    };
  }

  async #prepareSwap(params: SwapParams): Promise<PreparedSwap> {
    if (sameToken(params.tokenIn, params.tokenOut)) {
      throw new ParameterError("tokenIn and tokenOut must differ");
    }
    const [inputDecimals, outputDecimals] = await Promise.all([
      this.#tokenDecimals(params.tokenIn),
      this.#tokenDecimals(params.tokenOut),
    ]);
    const amountIn = parseUnits(params.amountIn, inputDecimals);
    const unitSize = cloberUnitSize(params.tokenOut, outputDecimals);
    const key: BookKey = {
      base: toClober(params.tokenIn),
      unitSize,
      quote: toClober(params.tokenOut),
      makerPolicy: MAKER_POLICY,
      hooks: zeroAddress,
      takerPolicy: TAKER_POLICY,
    };
    const bookId = encodeBookId(key);
    const onchainKey = await this.bookManager.read.getBookKey([bookId]);
    if (!sameBookKey(onchainKey, key)) {
      throw new Error(`Clober book ${bookId} does not match the canonical requested market`);
    }

    const order = {
      id: bookId,
      limitPrice: 0n,
      baseAmount: amountIn,
      minQuoteAmount: 0n,
      hookData: zeroHash,
    };
    const [amountOut, spentAmountIn] = await this.bookViewer.read.getExpectedOutput([order]);
    if (amountOut <= 0n) throw new Error("Clober book has no output for this input amount");
    const minimumSpentAmount = (amountIn * BigInt(MIN_INPUT_UTILIZATION_BPS) + 9_999n) / 10_000n;
    if (spentAmountIn < minimumSpentAmount) {
      throw new Error("Clober book cannot spend at least 99.9% of the input amount");
    }
    const slippage = BigInt(params.slippage ?? DEFAULT_SLIPPAGE_BPS);
    const minimumAmountOut = (amountOut * (10_000n - slippage)) / 10_000n;
    if (minimumAmountOut <= 0n) {
      throw new Error("Clober quote is too small to enforce a non-zero minimum output");
    }
    return {
      amountIn,
      spentAmountIn,
      amountOut,
      minimumAmountOut,
      inputDecimals,
      outputDecimals,
      bookId,
      order,
    };
  }

  async #tokenDecimals(token: TokenRef): Promise<number> {
    if (token === NATIVE) return 18;
    const { decimals } = await this.erc20.metadata({ token });
    if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 255) {
      throw new Error(`Clober token ${token} returned invalid decimals`);
    }
    return decimals;
  }
}

function cloberUnitSize(quote: TokenRef, decimals: number): bigint {
  const unitSize =
    quote === NATIVE || sameAddress(quote, WMON_ADDRESS)
      ? NATIVE_UNIT_SIZE
      : 10n ** BigInt(Math.max(decimals - 6, 0));
  if (unitSize > UINT64_MAX) {
    throw new Error(`Clober does not support quote-token decimals ${decimals}`);
  }
  return unitSize;
}

function encodeBookId(key: BookKey): bigint {
  const encoded = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "base", type: "address" },
          { name: "unitSize", type: "uint64" },
          { name: "quote", type: "address" },
          { name: "makerPolicy", type: "uint24" },
          { name: "hooks", type: "address" },
          { name: "takerPolicy", type: "uint24" },
        ],
      },
    ],
    [key],
  );
  return BigInt(keccak256(encoded)) & UINT192_MASK;
}

function sameBookKey(actual: BookKey, expected: BookKey): boolean {
  return (
    sameAddress(actual.base, expected.base) &&
    actual.unitSize === expected.unitSize &&
    sameAddress(actual.quote, expected.quote) &&
    actual.makerPolicy === expected.makerPolicy &&
    sameAddress(actual.hooks, expected.hooks) &&
    actual.takerPolicy === expected.takerPolicy
  );
}

function uniqueErc20Tokens(...tokens: readonly TokenRef[]): readonly `0x${string}`[] {
  const unique = new Map<string, `0x${string}`>();
  for (const token of tokens) {
    if (token !== NATIVE) unique.set(token.toLowerCase(), token);
  }
  return [...unique.values()];
}

function toClober(token: TokenRef): `0x${string}` {
  return token === NATIVE ? zeroAddress : token;
}

function sameToken(left: TokenRef, right: TokenRef): boolean {
  return left === NATIVE || right === NATIVE ? left === right : sameAddress(left, right);
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function decodeBookManagerEvent(change: Extract<Change, { kind: "event" }>) {
  try {
    return decodeEventLog({
      abi: CloberBookManagerAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    throw new Error(`Unexpected Change: ${change.address} emitted an unsupported Clober event`);
  }
}
