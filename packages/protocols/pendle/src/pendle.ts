import {
  type ActionCtx,
  Address,
  BasisPoints,
  Capability,
  type CapabilityResult,
  type Change,
  type Handle,
  type InferParams,
  type MossRuntime,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { formatUnits, getAddress, parseUnits } from "viem";
import { PendleMarketFactoryAbi, PendleRouterStaticAbi } from "./abis/pendle.js";
import { PendleRouterContractAbi } from "./abis/router.js";
import {
  PENDLE_MARKET_FACTORY_ADDRESS,
  PENDLE_ROUTER_ADDRESS,
  PENDLE_ROUTER_STATIC_ADDRESS,
} from "./addresses.js";
import { discoverPendleMarkets } from "./market-discovery.js";
import { quoteVerifiedMarket } from "./market-quote.js";
import { verifyPendleMarket } from "./market-verifier.js";
import { buildPendleSwapPlan } from "./swap-builder.js";
import { parsePendleSwapReceipt } from "./swap-receipt.js";
import type {
  DiscoveredPendleMarket,
  MarketDiscoveryRejection,
  PendleMarketDiscoveryResult,
  PendleMarketView,
  PendleQuote,
  PendleQuoteView,
  PendleSwapOutcome,
  VerifiedMarket,
} from "./types.js";

const MAX_DIAGNOSTIC_LENGTH = 320;
const DEFAULT_SLIPPAGE_BPS = 50;
const MARKET_ZERO_NET_LP_FEE_MESSAGE = "swap amount too small: this market's LP fee rounds to zero";

const PendleSlippage = BasisPoints.default(DEFAULT_SLIPPAGE_BPS);

/**
 * Raised when discovery nominated candidates but the on-chain verifier accepted none, so an empty
 * verified set means "unavailable", not "no markets exist". Carries the structured rejections.
 */
export class PendleMarketsUnavailableError extends Error {
  readonly candidateCount: number;
  readonly rejections: readonly MarketDiscoveryRejection[];

  constructor(candidateCount: number, rejections: readonly MarketDiscoveryRejection[]) {
    super(
      `Pendle market discovery verified none of ${candidateCount} candidate(s); ${summarizeRejections(rejections)}`,
    );
    this.name = "PendleMarketsUnavailableError";
    this.candidateCount = candidateCount;
    this.rejections = rejections;
  }
}

/**
 * Projects a discovery result into market views: the verified subset on any success (even partial),
 * an empty list only when discovery found no candidates at all, and an explicit error when every
 * nominated candidate was rejected.
 */
export function selectMarketViews(
  result: PendleMarketDiscoveryResult,
): readonly PendleMarketView[] {
  if (result.verified.length > 0) {
    return result.verified.map(toMarketView);
  }
  if (result.rejections.length > 0) {
    throw new PendleMarketsUnavailableError(result.candidateCount, result.rejections);
  }
  return [];
}

const noParams = {} satisfies ParamsSpec;

const swapParams = {
  market: {
    type: Address,
    description:
      "Current API-nominated Pendle market the account authorizes this Capability to trade against.",
  },
  tokenIn: {
    type: Address,
    description: "Asset the account will spend in the swap.",
  },
  tokenOut: {
    type: Address,
    description: "Asset the account will receive from the swap.",
  },
  amountIn: {
    type: PositiveDecimalString,
    description: "Exact quantity of tokenIn the swap may spend.",
  },
  slippageBps: {
    type: PendleSlippage,
    description: "Maximum adverse movement allowed between the current quote and swap execution.",
  },
} satisfies ParamsSpec;

const quoteParams = {
  market: {
    type: Address,
    description: "Current API-nominated Pendle market whose swap price is requested.",
  },
  tokenIn: {
    type: Address,
    description: "Asset supplied on the input side of the requested quote.",
  },
  tokenOut: {
    type: Address,
    description: "Asset returned on the output side of the requested quote.",
  },
  amountIn: {
    type: PositiveDecimalString,
    description: "Exact input quantity to price without moving funds.",
  },
  slippageBps: {
    type: PendleSlippage,
    description: "Tolerance used to calculate the quote's protected minimum output.",
  },
} satisfies ParamsSpec;

type ResolvedPendleSwapParams = InferParams<typeof swapParams>;
type ResolvedPendleQuoteParams = InferParams<typeof quoteParams>;
type PendleSwapParams = Omit<ResolvedPendleSwapParams, "slippageBps"> & {
  slippageBps?: ResolvedPendleSwapParams["slippageBps"];
};
type PendleQuoteParams = Omit<ResolvedPendleQuoteParams, "slippageBps"> & {
  slippageBps?: ResolvedPendleQuoteParams["slippageBps"];
};

@Protocol({
  name: "pendle",
  category: "dex",
  description:
    "Pendle PT swaps against a market underlying over dynamically verified Monad markets.",
  contracts: {
    factory: { abi: PendleMarketFactoryAbi, addr: PENDLE_MARKET_FACTORY_ADDRESS },
    router: { abi: PendleRouterContractAbi, addr: PENDLE_ROUTER_ADDRESS },
    routerStatic: { abi: PendleRouterStaticAbi, addr: PENDLE_ROUTER_STATIC_ADDRESS },
  },
  customErrorMessages: { MarketZeroNetLPFee: MARKET_ZERO_NET_LP_FEE_MESSAGE },
  labels: {
    MarketFactory: PENDLE_MARKET_FACTORY_ADDRESS,
    Router: PENDLE_ROUTER_ADDRESS,
    RouterStatic: PENDLE_ROUTER_STATIC_ADDRESS,
  },
  protocols: { erc20: ERC20 },
})
export class Pendle {
  declare runtime: MossRuntime;
  declare factory: Handle<typeof PendleMarketFactoryAbi>;
  declare router: Handle<typeof PendleRouterContractAbi>;
  declare routerStatic: Handle<typeof PendleRouterStaticAbi>;
  declare erc20: ProtocolRef<ERC20>;

  swap(params: PendleSwapParams, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Pendle, typeof swapParams>({
    intent: "Swap a market underlying and its Pendle PT in either direction",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["yield", "pt"],
  })
  async swap(params: ResolvedPendleSwapParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const { quote } = await this.#prepare(params);
    const plan = buildPendleSwapPlan(quote, ctx.account, this.router);
    const allowance = BigInt(
      (
        await this.erc20.allowance({
          token: plan.approval.token,
          owner: ctx.account,
          spender: plan.approval.spender,
        })
      ).allowance,
    );
    const approvals = [];
    if (allowance < plan.approval.amount) {
      if (allowance > 0n) {
        approvals.push(
          await this.erc20.approve({
            token: plan.approval.token,
            spender: plan.approval.spender,
            amount: "0",
          }),
        );
      }
      approvals.push(
        await this.erc20.approve({
          token: plan.approval.token,
          spender: plan.approval.spender,
          amount: plan.approval.amount.toString(),
        }),
      );
    }
    return [...approvals, plan.transaction];
  }

  quote(params: PendleQuoteParams): Promise<PendleQuoteView>;
  @Query({
    intent: "Quote a Pendle PT swap in either direction",
    params: quoteParams,
    tags: ["yield", "pt", "quote"],
  })
  async quote(params: ResolvedPendleQuoteParams): Promise<PendleQuoteView> {
    const { market, quote } = await this.#prepare(params);
    return {
      direction: quote.direction,
      market: quote.market,
      tokenIn: quote.tokenIn,
      tokenOut: quote.tokenOut,
      amountIn: formatUnits(quote.amountIn, quote.decimals.in),
      estimatedOut: formatUnits(quote.expectedOut, quote.decimals.out),
      minOut: formatUnits(quote.minOut, quote.decimals.out),
      expiryUtc: expiryToIso(market.expiry),
    };
  }

  @Query({
    intent: "List Pendle markets verified on Monad mainnet",
    params: noParams,
    tags: ["yield", "pt", "market"],
  })
  async markets(): Promise<readonly PendleMarketView[]> {
    return selectMarketViews(await this.#discoverMarkets());
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<PendleSwapOutcome> {
    return parsePendleSwapReceipt(changes, (erc20Changes) =>
      this.erc20.changesReceipt(erc20Changes),
    );
  }

  async #prepare(
    params: ResolvedPendleSwapParams | ResolvedPendleQuoteParams,
  ): Promise<{ market: VerifiedMarket; quote: PendleQuote }> {
    const discovery = await this.#discoverMarkets();
    const requestedMarket = getAddress(params.market);
    const discovered = discovery.verified.find(({ market }) => market.market === requestedMarket);
    if (!discovered) {
      if (discovery.verified.length === 0 && discovery.rejections.length > 0) {
        throw new PendleMarketsUnavailableError(discovery.candidateCount, discovery.rejections);
      }
      throw new ParameterError(
        `market ${requestedMarket} is not a current verified candidate from the official Pendle API`,
      );
    }
    const market = discovered.market;
    const tokenIn = getAddress(params.tokenIn);
    const tokenOut = getAddress(params.tokenOut);
    if (
      !(
        (tokenIn === market.underlying && tokenOut === market.pt) ||
        (tokenIn === market.pt && tokenOut === market.underlying)
      )
    ) {
      throw new ParameterError(
        `swap pair must be the verified underlying ${market.underlying} and PT ${market.pt}`,
      );
    }
    const decimalsIn = tokenIn === market.pt ? market.decimals.pt : market.decimals.underlying;
    const amountIn = parseExactUnits(params.amountIn, decimalsIn);
    const quote = await quoteVerifiedMarket(
      {
        quoteExactTokenForPt: (candidateMarket, candidateTokenIn, rawAmountIn, slippage) =>
          this.routerStatic.read.swapExactTokenForPtStaticAndGenerateApproxParams([
            candidateMarket,
            candidateTokenIn,
            rawAmountIn,
            slippage,
          ]),
        quoteExactPtForToken: (candidateMarket, rawAmountIn, candidateTokenOut) =>
          this.routerStatic.read.swapExactPtForTokenStatic([
            candidateMarket,
            rawAmountIn,
            candidateTokenOut,
          ]),
      },
      market,
      {
        tokenIn,
        tokenOut,
        amountIn,
        slippageBps: params.slippageBps,
      },
    );
    return { market, quote };
  }

  #discoverMarkets(): Promise<PendleMarketDiscoveryResult> {
    return discoverPendleMarkets(this.runtime, {
      verify: (runtime, candidate) => verifyPendleMarket(runtime, candidate, this.factory),
    });
  }
}

function parseExactUnits(value: string, decimals: number): bigint {
  const fraction = value.split(".")[1] ?? "";
  if (fraction.replace(/0+$/, "").length > decimals) {
    throw new ParameterError(
      `amountIn ${value} has non-zero precision beyond token decimals ${decimals}`,
    );
  }
  return parseUnits(value, decimals);
}

function summarizeRejections(rejections: readonly MarketDiscoveryRejection[]): string {
  if (rejections.length === 0) return "no rejection detail was recorded";
  const summary = rejections
    .map((rejection) => {
      const where = rejection.candidate
        ? `${rejection.stage}@${rejection.candidate}`
        : rejection.stage;
      return `${where}: ${rejection.reason}`;
    })
    .join("; ");
  return summary.length <= MAX_DIAGNOSTIC_LENGTH
    ? summary
    : `${summary.slice(0, MAX_DIAGNOSTIC_LENGTH - 1)}…`;
}

function expiryToIso(expiry: bigint): string {
  return new Date(Number(expiry) * 1000).toISOString();
}

function toMarketView({ market, metadata }: DiscoveredPendleMarket): PendleMarketView {
  return {
    market: market.market,
    underlying: market.underlying,
    pt: market.pt,
    sy: market.sy,
    expiryUtc: expiryToIso(market.expiry),
    decimals: { underlying: market.decimals.underlying, pt: market.decimals.pt },
    name: metadata.name,
    protocol: metadata.protocol,
    aggregatedApy: metadata.aggregatedApy ?? null,
    apyProvenance: metadata.provenance,
  };
}
