import { Token, type TokenSource } from "./token.js";
import { NATIVE, type TokenRef } from "./types.js";

/**
 * One entry of the well-known token table: the interface standard is defined
 * once (@themoss/erc), instances are registered by address into a
 * per-registry table. Core owns only the MECHANISM — the actual token data
 * ships in @themoss/system's manifest and in protocol packages' tokens.ts.
 */
export interface KnownToken {
  symbol: string;
  name: string;
  /** NATIVE for the chain's own coin, otherwise the canonical address. */
  ref: TokenRef;
  decimals: number;
}

/**
 * The per-registry token table: symbol/address → verified token identity.
 *
 * This is a SECURITY surface, not a convenience list. Symbols resolve ONLY
 * against the table and never fall back to on-chain symbol() lookups —
 * anyone can deploy a token named "USDC", and same-symbol fakes are the
 * oldest trick in the book (ADR 0005). Collision rules (ADR 0006):
 *
 *   - same symbol → DIFFERENT address: hard error (accident or attack, never fine)
 *   - same address re-registered with identical data: idempotent no-op
 *   - symbol uniqueness is case-insensitive
 */
export class TokenTable {
  #bySymbol = new Map<string, { entry: KnownToken; source: string }>();
  #byRef = new Map<string, { entry: KnownToken; source: string }>();

  add(entry: KnownToken, source: string): void {
    const symbolKey = entry.symbol.toLowerCase();
    const refKey = entry.ref.toLowerCase();
    const existing = this.#bySymbol.get(symbolKey) ?? this.#byRef.get(refKey);
    if (existing) {
      const same =
        existing.entry.ref.toLowerCase() === refKey &&
        existing.entry.symbol.toLowerCase() === symbolKey &&
        existing.entry.decimals === entry.decimals;
      if (same) return; // idempotent
      throw new Error(
        `token registration conflict: "${entry.symbol}" (${entry.ref}) from package "${source}" ` +
          `collides with "${existing.entry.symbol}" (${existing.entry.ref}) from package "${existing.source}". ` +
          "Refusing the redefinition — same-symbol substitutions are how funds get stolen.",
      );
    }
    this.#bySymbol.set(symbolKey, { entry, source });
    this.#byRef.set(refKey, { entry, source });
  }

  /** Resolve a symbol (case-insensitive), registered address, or "native". */
  resolve(input: string): Token | undefined {
    const needle = input.toLowerCase();
    if (needle === NATIVE) return Token.native();
    const hit = this.#bySymbol.get(needle) ?? this.#byRef.get(needle);
    return hit ? Token.of(hit.entry.ref, hit.entry.decimals, hit.entry.symbol) : undefined;
  }

  symbols(): string[] {
    return [...this.#bySymbol.values()].map((v) => v.entry.symbol);
  }

  /**
   * Build the TokenSource used by semantic decoding: table first (verified
   * metadata, zero RPC). Unknown SYMBOLS throw loudly — they must never fall
   * through to the chain. Unknown ADDRESSES go to the injected fallback
   * (e.g. @themoss/erc's erc20MetadataSource) or throw with guidance when
   * none is wired — core itself reads no contracts (ADR 0006).
   */
  source(fallback?: TokenSource): TokenSource {
    return (ref) => {
      const hit = this.resolve(ref);
      if (hit) return Promise.resolve(hit);
      if (!ref.startsWith("0x")) {
        return Promise.reject(
          new Error(
            `unknown token symbol "${ref}" — known symbols: ${this.symbols().join(", ")}. ` +
              "Pass the token's 0x address if you mean a token outside the catalog.",
          ),
        );
      }
      if (!fallback) {
        return Promise.reject(
          new Error(
            `token ${ref} is not in the token table and no fallback is configured — ` +
              "register it via a package manifest, or construct the Registry with " +
              "{ tokenFallback: erc20MetadataSource(client) } from @themoss/erc",
          ),
        );
      }
      return fallback(ref);
    };
  }
}
