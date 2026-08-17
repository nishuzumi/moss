import type { AddressValue, MossRuntime } from "@themoss/core";
import { getAddress, isAddress } from "viem";
import { PendleRouterStaticAbi } from "./abis/pendle.js";
import { PENDLE_ROUTER_STATIC_ADDRESS } from "./addresses.js";
import type {
  PendleApproxParams,
  PendleQuote,
  PendleQuoteParams,
  PendleQuoteReader,
  PendleQuoteStage,
  PendleSwapDirection,
  VerifiedMarket,
} from "./types.js";

const BPS_DENOMINATOR = 10_000n;
// One basis point is 1e-4; scaled to Pendle's 1e18 fixed-point slippage that is 1e14.
const BPS_TO_WAD = 100_000_000_000_000n;
const MAX_DIAGNOSTIC_LENGTH = 320;

export class PendleQuoteError extends Error {
  readonly stage: PendleQuoteStage;

  constructor(stage: PendleQuoteStage, detail: string, options: ErrorOptions = {}) {
    super(`Pendle quote failed at ${stage}: ${bounded(detail)}`, options);
    this.name = "PendleQuoteError";
    this.stage = stage;
  }
}

/**
 * Produces a read-only RouterStatic quote for one verified market using live Monad chain state.
 */
export async function quotePendleSwap(
  runtime: MossRuntime,
  market: VerifiedMarket,
  params: PendleQuoteParams,
): Promise<PendleQuote> {
  return quoteVerifiedMarket(runtimeQuoteReader(runtime), market, params);
}

/**
 * Applies the quoter to an injectable RouterStatic read boundary and validates every returned value.
 *
 * Directions are constrained to the verified market's underlying and PT with their supported side;
 * amounts are raw integer minimal units and `minOut` is floored from the RouterStatic expectation.
 */
export async function quoteVerifiedMarket(
  reader: PendleQuoteReader,
  market: VerifiedMarket,
  params: PendleQuoteParams,
): Promise<PendleQuote> {
  const amountIn = params.amountIn;
  if (typeof amountIn !== "bigint" || amountIn <= 0n) {
    throw new PendleQuoteError(
      "params",
      `amountIn must be a positive integer, got ${stringify(amountIn)}`,
    );
  }
  const slippageBps = params.slippageBps;
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000) {
    throw new PendleQuoteError(
      "params",
      `slippageBps must be an integer in [0, 10000], got ${stringify(slippageBps)}`,
    );
  }

  const tokenIn = parseAddress(params.tokenIn, "tokenIn");
  const tokenOut = parseAddress(params.tokenOut, "tokenOut");
  const direction = resolveDirection(market, tokenIn, tokenOut);

  const decimals = Object.freeze({
    in: tokenIn === market.pt ? market.decimals.pt : market.decimals.underlying,
    out: tokenOut === market.pt ? market.decimals.pt : market.decimals.underlying,
  });

  if (direction === "buy-pt") {
    const { netOut, approxParams } = await quoteBuyPt(
      reader,
      market,
      tokenIn,
      amountIn,
      slippageBps,
    );
    return Object.freeze({
      direction,
      market: market.market,
      tokenIn,
      tokenOut,
      amountIn,
      expectedOut: netOut,
      minOut: protectedMinOut(netOut, slippageBps),
      slippageBps,
      decimals,
      approxParams,
    });
  }

  const { netOut } = await quoteSellPt(reader, market, tokenOut, amountIn);
  return Object.freeze({
    direction,
    market: market.market,
    tokenIn,
    tokenOut,
    amountIn,
    expectedOut: netOut,
    minOut: protectedMinOut(netOut, slippageBps),
    slippageBps,
    decimals,
  });
}

/**
 * Floors the RouterStatic expectation by the caller's slippage tolerance and rejects any quote
 * whose protective minimum output is zero. A zero minimum accepts any on-chain result, so it is the
 * protocol-specific safe bound: it is enforced per quote against the actual expectation, catching
 * both a 100% slippage setting and a tolerance that rounds a tiny expected output down to nothing.
 */
function protectedMinOut(expectedOut: bigint, slippageBps: number): bigint {
  const minOut = (expectedOut * (BPS_DENOMINATOR - BigInt(slippageBps))) / BPS_DENOMINATOR;
  if (minOut <= 0n) {
    throw new PendleQuoteError(
      "min-out",
      `protective minimum output floored to zero for expected ${expectedOut} at ${slippageBps} bps; refusing an unprotected swap`,
    );
  }
  return minOut;
}

function resolveDirection(
  market: VerifiedMarket,
  tokenIn: AddressValue,
  tokenOut: AddressValue,
): PendleSwapDirection {
  if (tokenIn === market.underlying && tokenOut === market.pt) {
    if (!market.tokenSupport.underlyingIn) {
      throw new PendleQuoteError(
        "direction",
        `market does not support underlying ${market.underlying} as SY token-in for buying PT`,
      );
    }
    return "buy-pt";
  }
  if (tokenIn === market.pt && tokenOut === market.underlying) {
    if (!market.tokenSupport.underlyingOut) {
      throw new PendleQuoteError(
        "direction",
        `market does not support underlying ${market.underlying} as SY token-out for selling PT`,
      );
    }
    return "sell-pt";
  }
  throw new PendleQuoteError(
    "direction",
    `unsupported v1 swap ${tokenIn} -> ${tokenOut}; expected underlying ${market.underlying} <-> PT ${market.pt}`,
  );
}

async function quoteBuyPt(
  reader: PendleQuoteReader,
  market: VerifiedMarket,
  tokenIn: AddressValue,
  amountIn: bigint,
  slippageBps: number,
): Promise<{ netOut: bigint; approxParams: PendleApproxParams }> {
  const slippage = BigInt(slippageBps) * BPS_TO_WAD;
  const result = await atStage("router-static-read", () =>
    reader.quoteExactTokenForPt(market.market, tokenIn, amountIn, slippage),
  );
  if (!Array.isArray(result)) {
    throw new PendleQuoteError(
      "router-static-read",
      "malformed buy-PT quote; expected a result tuple",
    );
  }
  const netOut = parseUnsignedBigInt(result[0], "netPtOut");
  const approxParams = parseApproxParams(result[5]);
  return { netOut, approxParams };
}

async function quoteSellPt(
  reader: PendleQuoteReader,
  market: VerifiedMarket,
  tokenOut: AddressValue,
  amountIn: bigint,
): Promise<{ netOut: bigint }> {
  const result = await atStage("router-static-read", () =>
    reader.quoteExactPtForToken(market.market, amountIn, tokenOut),
  );
  if (!Array.isArray(result)) {
    throw new PendleQuoteError(
      "router-static-read",
      "malformed sell-PT quote; expected a result tuple",
    );
  }
  return { netOut: parseUnsignedBigInt(result[0], "netTokenOut") };
}

function runtimeQuoteReader(runtime: MossRuntime): PendleQuoteReader {
  const { client } = runtime;
  return {
    quoteExactTokenForPt: (market, tokenIn, amountTokenIn, slippage) =>
      client.readContract({
        address: PENDLE_ROUTER_STATIC_ADDRESS,
        abi: PendleRouterStaticAbi,
        functionName: "swapExactTokenForPtStaticAndGenerateApproxParams",
        args: [market, tokenIn, amountTokenIn, slippage],
      }),
    quoteExactPtForToken: (market, exactPtIn, tokenOut) =>
      client.readContract({
        address: PENDLE_ROUTER_STATIC_ADDRESS,
        abi: PendleRouterStaticAbi,
        functionName: "swapExactPtForTokenStatic",
        args: [market, exactPtIn, tokenOut],
      }),
  };
}

async function atStage<T>(stage: PendleQuoteStage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PendleQuoteError) throw error;
    throw new PendleQuoteError(stage, errorMessage(error), { cause: error });
  }
}

function parseApproxParams(value: unknown): PendleApproxParams {
  if (typeof value !== "object" || value === null) {
    throw new PendleQuoteError("router-static-read", "malformed ApproxParams; expected a struct");
  }
  const params = value as Record<string, unknown>;
  return Object.freeze({
    guessMin: parseUnsignedBigInt(params.guessMin, "approxParams.guessMin"),
    guessMax: parseUnsignedBigInt(params.guessMax, "approxParams.guessMax"),
    guessOffchain: parseUnsignedBigInt(params.guessOffchain, "approxParams.guessOffchain"),
    maxIteration: parseUnsignedBigInt(params.maxIteration, "approxParams.maxIteration"),
    eps: parseUnsignedBigInt(params.eps, "approxParams.eps"),
  });
}

function parseAddress(value: unknown, label: string): AddressValue {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new PendleQuoteError("params", `${label} is not a valid EVM address`);
  }
  return getAddress(value);
}

function parseUnsignedBigInt(value: unknown, label: string): bigint {
  if (typeof value !== "bigint" || value < 0n) {
    throw new PendleQuoteError(
      "router-static-read",
      `${label} returned malformed uint256 ${stringify(value)}`,
    );
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : stringify(error);
}

function stringify(value: unknown): string {
  if (typeof value === "string") return bounded(value);
  if (typeof value === "bigint") return value.toString();
  if (value === null || ["number", "boolean", "undefined"].includes(typeof value)) {
    return String(value);
  }
  return Object.prototype.toString.call(value);
}

function bounded(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= MAX_DIAGNOSTIC_LENGTH
    ? compact
    : `${compact.slice(0, MAX_DIAGNOSTIC_LENGTH - 1)}…`;
}
