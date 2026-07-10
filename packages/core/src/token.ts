import { formatUnits, getAddress, parseUnits } from "viem";
import type { Address } from "./types.js";
import { NATIVE, type TokenRef } from "./types.js";

/**
 * A token identity: the native coin or one ERC-20, with decimals and symbol.
 * Owns the scaling math — and nothing else. Step building (approve, …) lives
 * in the standards layer (@themoss/erc); on-chain metadata fetching is
 * injected into the Registry as a TokenSource fallback. Core knows no ABIs
 * (ADR 0006).
 */
export class Token {
  readonly ref: TokenRef;
  readonly decimals: number;
  readonly symbol: string;

  private constructor(ref: TokenRef, decimals: number, symbol: string) {
    this.ref = ref;
    this.decimals = decimals;
    this.symbol = symbol;
  }

  // The symbol string is chain-specific in principle; Moss v1 targets Monad
  // only — one of the cosmetic exceptions recorded in ADR 0006.
  static readonly #NATIVE = new Token(NATIVE, 18, "MON");

  /** The chain's native coin (18 decimals). */
  static native(): Token {
    return Token.#NATIVE;
  }

  /** Build a Token from already-known metadata (tables, fixtures, catalogs). */
  static of(ref: TokenRef, decimals: number, symbol: string): Token {
    if (ref === NATIVE) return Token.#NATIVE;
    return new Token(getAddress(ref), decimals, symbol);
  }

  get isNative(): boolean {
    return this.ref === NATIVE;
  }

  /** The contract address; throws for the native coin, which has none. */
  get address(): Address {
    if (this.isNative) throw new Error("the native coin has no contract address");
    return this.ref as Address;
  }

  /** Human decimal → base units: "1.5" → 1500000n for a 6-decimals token. */
  scale(human: string | number): bigint {
    return parseUnits(String(human), this.decimals);
  }

  /** Base units → human decimal string. */
  format(base: bigint): string {
    return formatUnits(base, this.decimals);
  }
}

/** Resolve a symbol, token address, or "native" to a Token with metadata. */
export type TokenSource = (ref: TokenRef | string) => Promise<Token>;
