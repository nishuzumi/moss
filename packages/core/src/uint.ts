const MAX_UINT256_DECIMAL = (2n ** 256n - 1n).toString();

export const UINT256_MAX_DECIMAL_DIGITS = MAX_UINT256_DECIMAL.length;

const UINT256_DECIMAL = /^(0|[1-9][0-9]*)$/;

/** Parse one canonical decimal uint256 after bounded lexical validation. */
export function parseUint256Decimal(value: string, label: string): bigint {
  if (
    value.length > UINT256_MAX_DECIMAL_DIGITS ||
    (value.length === UINT256_MAX_DECIMAL_DIGITS && value > MAX_UINT256_DECIMAL) ||
    !UINT256_DECIMAL.test(value)
  ) {
    throw new Error(`${label} must be a canonical decimal uint256 value`);
  }
  return BigInt(value);
}
