import { getAddress, parseUnits } from "viem";
import { Token, type TokenSource } from "./token.js";
import { type Address, NATIVE, type TokenRef } from "./types.js";

/**
 * Context available to a semantic type while decoding one parameter.
 * `decoded` only contains parameters declared *before* this one — contextual
 * types (e.g. an amount scaled by its sibling asset's decimals) must have
 * their dependency declared first. This ordering rule is documented in the
 * protocol onboarding guide.
 */
export interface DecodeCtx {
  /** Raw agent-supplied sibling arguments. */
  args: Record<string, unknown>;
  /** Siblings already decoded (declaration order). */
  decoded: Record<string, unknown>;
  /** The account the capability is being built for. */
  account: Address;
  /** Resolve a symbol, token address, or "native" to a Token with metadata. */
  token: TokenSource;
}

/**
 * A parameter type with two faces: `describe` is shown to agents via `load`,
 * `decode` turns the agent-supplied value into a runtime value.
 */
export interface SemanticType<T> {
  describe: string;
  decode(value: unknown, ctx: DecodeCtx): T | Promise<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: params spec is heterogeneous by design
export type ParamsSpec = Record<string, SemanticType<any>>;

export type DecodedParams<S extends ParamsSpec> = {
  [K in keyof S]: S[K] extends SemanticType<infer T> ? T : never;
};

export class DecodeError extends Error {
  constructor(
    readonly param: string,
    message: string,
  ) {
    super(`invalid parameter "${param}": ${message}`);
    this.name = "DecodeError";
  }
}

/** An EVM address, checksummed on the way in. */
export const address: SemanticType<Address> = {
  describe: "A 20-byte EVM address, 0x-prefixed.",
  decode(value) {
    if (typeof value !== "string")
      throw new Error(`expected 0x address string, got ${typeof value}`);
    return getAddress(value); // throws on malformed input, returns checksummed
  },
};

/**
 * A token reference: a well-known symbol, an EVM address, or "native".
 * Symbols resolve ONLY against the curated catalog — never via on-chain
 * symbol() lookups, which same-symbol scam tokens would spoof (ADR 0005).
 */
export const token: SemanticType<TokenRef> = {
  describe:
    "A token: a well-known symbol registered by the loaded packages, " +
    `a 20-byte 0x address, or "${NATIVE}" for the chain's native coin.`,
  async decode(value, ctx) {
    if (value === NATIVE) return NATIVE;
    if (typeof value !== "string") {
      throw new Error(`expected a token symbol or 0x address, got ${typeof value}`);
    }
    if (value.startsWith("0x")) {
      return address.decode(value, ctx) as TokenRef;
    }
    // Symbols resolve through the registry's token table (ctx.token throws
    // loudly for unknown symbols — never an on-chain symbol() fallback).
    return (await ctx.token(value)).ref;
  },
};

/** A non-negative integer (e.g. an NFT token id), as a decimal string or safe integer number. */
export const uint: SemanticType<bigint> = {
  describe: 'A non-negative integer (e.g. an NFT token id), as a decimal string like "42".',
  decode(value) {
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error(`expected an integer, got ${typeof value}`);
    }
    if (typeof value === "number") {
      if (!Number.isInteger(value)) {
        throw new Error(`expected an integer, got "${value}"`);
      }
      if (!Number.isSafeInteger(value)) {
        throw new Error("unsafe integer number; pass large integers as a decimal string");
      }
    }
    let n: bigint;
    try {
      n = BigInt(value);
    } catch {
      throw new Error(`expected an integer, got "${value}"`);
    }
    if (n < 0n) throw new Error("must be non-negative");
    return n;
  },
};

/**
 * A human-readable amount of the token named by the sibling parameter
 * `assetParam`. Agents pass "1.5", not pre-scaled base units — the runtime
 * scales by the token's on-chain decimals (18 for native MON).
 */
export function tokenAmount(assetParam: string): SemanticType<bigint> {
  return {
    describe: `A human-decimal amount of the token in "${assetParam}" (e.g. "1.5"). Do not pre-scale; the runtime applies the token's decimals.`,
    async decode(value, ctx) {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(`expected a decimal string like "1.5", got ${typeof value}`);
      }
      const asset = ctx.decoded[assetParam] ?? ctx.args[assetParam];
      if (asset === undefined) {
        throw new Error(`references sibling parameter "${assetParam}", which is missing`);
      }
      const resolved = await ctx.token(asset as TokenRef);
      const amount = resolved.scale(value);
      if (amount <= 0n) throw new Error("amount must be positive");
      return amount;
    },
  };
}

/** A human-readable amount of a token whose decimals are known at authoring time. */
export function fixedAmount(decimals: number, label: string): SemanticType<bigint> {
  return {
    describe: `A human-decimal amount of ${label} (e.g. "1.5"). Do not pre-scale; ${decimals} decimals are applied by the runtime.`,
    decode(value) {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(`expected a decimal string like "1.5", got ${typeof value}`);
      }
      const scaled = parseUnits(String(value), decimals);
      if (scaled <= 0n) throw new Error("amount must be positive");
      return scaled;
    },
  };
}

/** A human-readable amount of native MON (18 decimals). */
export const nativeAmount: SemanticType<bigint> = {
  describe: 'A human-decimal amount of native MON (e.g. "0.5"). Do not pre-scale to wei.',
  decode(value) {
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error(`expected a decimal string like "0.5", got ${typeof value}`);
    }
    const amount = Token.native().scale(value);
    if (amount <= 0n) throw new Error("amount must be positive");
    return amount;
  },
};

/** Slippage tolerance in basis points (100 = 1%). */
export function slippageBps(defaultBps: number): SemanticType<number> {
  return {
    describe: `Slippage tolerance in basis points (100 = 1%). Optional, default ${defaultBps}.`,
    decode(value) {
      if (value === undefined || value === null) return defaultBps;
      const bps = Number(value);
      if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
        throw new Error("expected an integer between 0 and 10000");
      }
      return bps;
    },
  };
}

/**
 * Decode agent-supplied args against a spec, in declaration order, so
 * contextual types can reference earlier siblings via ctx.decoded.
 */
export async function decodeParams<S extends ParamsSpec>(
  spec: S,
  raw: Record<string, unknown>,
  ctx: Omit<DecodeCtx, "args" | "decoded">,
): Promise<DecodedParams<S>> {
  const decoded: Record<string, unknown> = {};
  const full: DecodeCtx = { ...ctx, args: raw, decoded };
  for (const [name, type] of Object.entries(spec)) {
    try {
      decoded[name] = await type.decode(raw[name], full);
    } catch (err) {
      throw new DecodeError(name, err instanceof Error ? err.message : String(err));
    }
  }
  const unknown = Object.keys(raw).filter((k) => !(k in spec));
  if (unknown.length > 0) {
    throw new DecodeError(unknown[0] as string, "not a declared parameter of this capability");
  }
  return decoded as DecodedParams<S>;
}
