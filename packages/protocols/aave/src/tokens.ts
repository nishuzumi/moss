/**
 * The reserves this adapter surfaces, derived from the vendored Aave DAO
 * address book (`src/abis/address-book.ts`, ADR 0007) rather than retyped.
 *
 * A reserve's aToken and variable debt token are fixed deployments created by
 * a governance listing, not pool addresses discovered per request, so they
 * belong here. Two things depend on that: `reserveOf` gives a Capability the
 * decimals it needs without an RPC, and it gives the Receipt parsers the pure
 * lookup they are allowed to use, since a parser may not read chain state and
 * still has to know which token addresses are legitimate emitters.
 *
 * The list is a tripwire, not a guess: the live Monad suite asserts it equals
 * `pool.getReservesList()` and checks every entry's aToken, debt token, symbol
 * and decimals on chain, so a new governance listing turns the suite red and
 * forces a release instead of being silently unsupported.
 */
import type { AddressValue } from "@themoss/core";
import { getAddress } from "viem";
import { AAVE_V3_MONAD } from "./abis/address-book.js";

export interface AaveReserve {
  /** Display symbol of the underlying asset. */
  symbol: string;
  /** Display decimals of the underlying asset. */
  decimals: number;
  /** Asset a user supplies, withdraws, borrows and repays. */
  underlying: AddressValue;
  /** Interest-bearing supply position minted against the underlying. */
  aToken: AddressValue;
  /** Variable-rate debt position. This market has no stable-rate token. */
  variableDebtToken: AddressValue;
}

export const AAVE_RESERVES: readonly AaveReserve[] = Object.entries(AAVE_V3_MONAD.ASSETS).map(
  ([symbol, asset]) => ({
    symbol,
    decimals: asset.decimals,
    underlying: getAddress(asset.UNDERLYING),
    aToken: getAddress(asset.A_TOKEN),
    variableDebtToken: getAddress(asset.V_TOKEN),
  }),
);

const BY_UNDERLYING: ReadonlyMap<string, AaveReserve> = new Map(
  AAVE_RESERVES.map((reserve) => [reserve.underlying.toLowerCase(), reserve]),
);

/** The reserve for an underlying asset, or undefined when it is not listed. */
export function reserveOf(underlying: string): AaveReserve | undefined {
  return BY_UNDERLYING.get(underlying.toLowerCase());
}

/** Package labels for every reserve position token, so Receipt text reads. */
export function reservePositionLabels(): Record<string, AddressValue> {
  return Object.fromEntries(
    AAVE_RESERVES.flatMap((reserve) => [
      [`a${reserve.symbol}`, reserve.aToken],
      [`v${reserve.symbol}`, reserve.variableDebtToken],
    ]),
  );
}
