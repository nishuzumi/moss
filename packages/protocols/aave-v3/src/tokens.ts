import type { KnownToken } from "@themoss/core";

/**
 * Aave v3 aTokens and debt tokens are reserve-specific and discovered at
 * runtime via Pool.getReserveData(). The adapter does not maintain a static
 * token catalog — aTokens are ephemeral per-reserve contracts whose addresses
 * the Runtime resolves through the token table on first use.
 */
export const AAVE_TOKENS: readonly KnownToken[] = [];
