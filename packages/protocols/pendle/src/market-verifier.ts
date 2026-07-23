import type { AddressValue, MossRuntime } from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { getAddress, isAddress } from "viem";
import {
  PendleMarketAbi,
  PendleMarketFactoryAbi,
  PendleStandardizedYieldAbi,
} from "./abis/pendle.js";
import { PENDLE_MARKET_FACTORY_ADDRESS } from "./addresses.js";
import type {
  MarketVerificationCandidate,
  MarketVerificationReader,
  MarketVerificationStage,
  VerifiedMarket,
} from "./types.js";

const MONAD_CHAIN_ID = 143;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_DIAGNOSTIC_LENGTH = 320;

export class PendleMarketVerificationError extends Error {
  readonly stage: MarketVerificationStage;
  readonly candidate: string;

  constructor(
    stage: MarketVerificationStage,
    candidate: string,
    detail: string,
    options: ErrorOptions = {},
  ) {
    super(
      `Pendle market verification failed at ${stage} for ${candidate}: ${bounded(detail)}`,
      options,
    );
    this.name = "PendleMarketVerificationError";
    this.stage = stage;
    this.candidate = candidate;
  }
}

/**
 * Verifies one untrusted candidate exclusively from current Monad chain state.
 */
export async function verifyPendleMarket(
  runtime: MossRuntime,
  candidate: MarketVerificationCandidate,
): Promise<VerifiedMarket> {
  return verifyMarketCandidate(runtimeReader(runtime), candidate, candidate.expectedUnderlying);
}

/**
 * Applies the verifier to an injectable chain-read boundary and rejects malformed read results.
 */
export async function verifyMarketCandidate(
  reader: MarketVerificationReader,
  candidate: Readonly<{ market: string }>,
  expectedUnderlying: string,
): Promise<VerifiedMarket> {
  const candidateLabel =
    typeof candidate?.market === "string" ? bounded(candidate.market) : "<invalid candidate>";
  const market = await atStage("candidate", candidateLabel, () =>
    parseAddress(candidate?.market, "candidate market"),
  );
  const underlying = await atStage("candidate", market, () =>
    parseAddress(expectedUnderlying, "expected underlying"),
  );

  const chainId = await atStage("chain", market, () => reader.chainId());
  if (chainId !== MONAD_CHAIN_ID) {
    throw failure(
      "chain",
      market,
      `expected chain ID ${MONAD_CHAIN_ID}, RPC reported ${stringify(chainId)}`,
    );
  }

  await assertCode(reader, market, market, "market-bytecode", "market");

  const registered = await atStage("factory-registration", market, () =>
    reader.isValidMarket(market),
  );
  if (registered !== true) {
    throw failure(
      "factory-registration",
      market,
      `official V6 Factory isValidMarket returned ${stringify(registered)}`,
    );
  }

  const reportedFactory = await atStage("factory-getter", market, async () =>
    parseAddress(await reader.marketFactory(market), "factory() result"),
  );
  if (!sameAddress(reportedFactory, PENDLE_MARKET_FACTORY_ADDRESS)) {
    throw failure(
      "factory-getter",
      market,
      `factory() returned ${reportedFactory}, expected ${PENDLE_MARKET_FACTORY_ADDRESS}`,
    );
  }

  const [sy, pt, yt] = await atStage("read-tokens", market, async () => {
    const value = await reader.marketTokens(market);
    if (!Array.isArray(value) || value.length !== 3) {
      throw new Error("malformed readTokens result; expected exactly [SY, PT, YT]");
    }
    const tokens = value.map((token, index) => parseAddress(token, `readTokens[${index}]`)) as [
      AddressValue,
      AddressValue,
      AddressValue,
    ];
    if (
      tokens.some((token) => sameAddress(token, ZERO_ADDRESS)) ||
      new Set(tokens.map((token) => token.toLowerCase())).size !== tokens.length
    ) {
      throw new Error("readTokens must return non-zero, distinct SY/PT/YT addresses");
    }
    return tokens;
  });

  const yieldToken = await atStage("underlying-identity", market, async () =>
    parseAddress(await reader.yieldToken(sy), "SY yieldToken()"),
  );
  if (!sameAddress(underlying, yieldToken)) {
    throw failure(
      "underlying-identity",
      market,
      `expected underlying ${underlying} is not the SY yieldToken ${yieldToken}; a supported SY token is not by itself the canonical PT underlying`,
    );
  }

  for (const [role, address] of [
    ["SY", sy],
    ["PT", pt],
    ["YT", yt],
    ["underlying", underlying],
  ] as const) {
    await assertCode(reader, market, address, "dynamic-bytecode", role);
  }

  const expiry = await atStage("expiry", market, async () =>
    parseUnsignedBigInt(await reader.marketExpiry(market), "expiry()"),
  );
  const blockTimestamp = await atStage("expiry", market, async () =>
    parseUnsignedBigInt(await reader.latestBlockTimestamp(), "latest block timestamp"),
  );
  if (expiry <= blockTimestamp) {
    throw failure(
      "expiry",
      market,
      `expiry ${expiry} is not later than latest block timestamp ${blockTimestamp}`,
    );
  }

  const tokensIn = await readTokenSet("token-support-in", market, () => reader.tokensIn(sy));
  const underlyingIn = tokensIn.some((token) => sameAddress(token, underlying));
  if (!underlyingIn) {
    throw failure(
      "token-support-in",
      market,
      `expected underlying ${underlying} is absent from SY getTokensIn()`,
    );
  }

  const tokensOut = await readTokenSet("token-support-out", market, () => reader.tokensOut(sy));
  const underlyingOut = tokensOut.some((token) => sameAddress(token, underlying));
  if (!underlyingOut) {
    throw failure(
      "token-support-out",
      market,
      `expected underlying ${underlying} is absent from SY getTokensOut()`,
    );
  }

  const underlyingDecimals = await readDecimals(reader, market, underlying, "underlying");
  const ptDecimals = await readDecimals(reader, market, pt, "PT");

  const frozenTokensIn = Object.freeze([...tokensIn]);
  const frozenTokensOut = Object.freeze([...tokensOut]);
  const decimals = Object.freeze({ underlying: underlyingDecimals, pt: ptDecimals });
  const tokenSupport = Object.freeze({
    tokensIn: frozenTokensIn,
    tokensOut: frozenTokensOut,
    underlyingIn,
    underlyingOut,
  });
  return Object.freeze({
    market,
    factory: reportedFactory,
    sy,
    pt,
    yt,
    underlying,
    decimals,
    expiry,
    tokenSupport,
  });
}

function runtimeReader(runtime: MossRuntime): MarketVerificationReader {
  const { client } = runtime;
  return {
    chainId: () => client.getChainId(),
    codeAt: (address) => client.getCode({ address }),
    isValidMarket: (market) =>
      client.readContract({
        address: PENDLE_MARKET_FACTORY_ADDRESS,
        abi: PendleMarketFactoryAbi,
        functionName: "isValidMarket",
        args: [market],
      }),
    marketFactory: (market) =>
      client.readContract({
        address: market,
        abi: PendleMarketAbi,
        functionName: "factory",
      }),
    marketTokens: (market) =>
      client.readContract({
        address: market,
        abi: PendleMarketAbi,
        functionName: "readTokens",
      }),
    marketExpiry: (market) =>
      client.readContract({
        address: market,
        abi: PendleMarketAbi,
        functionName: "expiry",
      }),
    yieldToken: (sy) =>
      client.readContract({
        address: sy,
        abi: PendleStandardizedYieldAbi,
        functionName: "yieldToken",
      }),
    tokensIn: (sy) =>
      client.readContract({
        address: sy,
        abi: PendleStandardizedYieldAbi,
        functionName: "getTokensIn",
      }),
    tokensOut: (sy) =>
      client.readContract({
        address: sy,
        abi: PendleStandardizedYieldAbi,
        functionName: "getTokensOut",
      }),
    decimals: (token) =>
      client.readContract({
        address: token,
        abi: ERC20Abi,
        functionName: "decimals",
      }),
    latestBlockTimestamp: async () => (await client.getBlock({ blockTag: "latest" })).timestamp,
  };
}

async function assertCode(
  reader: MarketVerificationReader,
  candidate: AddressValue,
  address: AddressValue,
  stage: "market-bytecode" | "dynamic-bytecode",
  role: string,
): Promise<void> {
  const code = await atStage(stage, candidate, () => reader.codeAt(address));
  if (typeof code !== "string" || !/^0x(?:[0-9a-fA-F]{2})+$/.test(code)) {
    throw failure(stage, candidate, `${role} ${address} has no deployed bytecode`);
  }
}

async function readTokenSet(
  stage: "token-support-in" | "token-support-out",
  candidate: AddressValue,
  read: () => Promise<unknown>,
): Promise<readonly AddressValue[]> {
  return atStage(stage, candidate, async () => {
    const value = await read();
    if (!Array.isArray(value))
      throw new Error("malformed token-support result; expected address[]");
    return value.map((token, index) => parseAddress(token, `token support[${index}]`));
  });
}

async function readDecimals(
  reader: MarketVerificationReader,
  candidate: AddressValue,
  token: AddressValue,
  role: string,
): Promise<number> {
  return atStage("decimals", candidate, async () => {
    const value = await reader.decimals(token);
    const parsed =
      typeof value === "bigint" && value >= 0n && value <= 255n
        ? Number(value)
        : typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255
          ? value
          : undefined;
    if (parsed === undefined) {
      throw new Error(`${role} ${token} returned invalid decimals ${stringify(value)}`);
    }
    return parsed;
  });
}

async function atStage<T>(
  stage: MarketVerificationStage,
  candidate: string,
  operation: () => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PendleMarketVerificationError) throw error;
    throw failure(stage, candidate, errorMessage(error), error);
  }
}

function failure(
  stage: MarketVerificationStage,
  candidate: string,
  detail: string,
  cause?: unknown,
): PendleMarketVerificationError {
  return new PendleMarketVerificationError(stage, candidate, detail, { cause });
}

function parseAddress(value: unknown, label: string): AddressValue {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new Error(`${label} is not a valid EVM address`);
  }
  return getAddress(value);
}

function parseUnsignedBigInt(value: unknown, label: string): bigint {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`${label} returned malformed uint256 ${stringify(value)}`);
  }
  return value;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
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
