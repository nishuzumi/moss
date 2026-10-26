/**
 * A test-only quarantine (for example a reserve whose address-book release is
 * still inside ADR 0007's age guard) expires on the wall clock, not on a diff
 * (#195). Once it expires, pull request CI skips the check with a note instead
 * of turning every unrelated pull request red. The scheduled
 * `quarantine-expiry` workflow sets `MOSS_QUARANTINE_EXPIRY=enforce`, where an
 * expired quarantine fails so maintainers vendor it.
 *
 * Call it in its own test, outside the `MOSS_SKIP_E2E` live block: the
 * scheduled run is offline, and a skip ends the whole test it is called from.
 */
export interface Quarantine {
  readonly sourceId: string;
  /** UTC ISO-8601 instant, exactly as `Date.prototype.toISOString` writes it. */
  readonly eligibleAfter: string;
}

export function expectQuarantineActive(
  context: { skip(note: string): void },
  { sourceId, eligibleAfter }: Quarantine,
  now: number = Date.now(),
): void {
  const mode = process.env.MOSS_QUARANTINE_EXPIRY;
  if (mode !== undefined && mode !== "" && mode !== "enforce") {
    throw new Error(`MOSS_QUARANTINE_EXPIRY must be unset or "enforce", got "${mode}"`);
  }
  const expiry = Date.parse(eligibleAfter);
  if (Number.isNaN(expiry) || new Date(expiry).toISOString() !== eligibleAfter) {
    throw new Error(
      `${sourceId}: eligibleAfter must be written as toISOString() writes it, YYYY-MM-DDTHH:mm:ss.sssZ`,
    );
  }
  if (now < expiry) return;
  const note = `${sourceId} cleared its quarantine at ${eligibleAfter}; vendor it and remove this quarantine`;
  if (mode === "enforce") throw new Error(note);
  context.skip(note);
}
